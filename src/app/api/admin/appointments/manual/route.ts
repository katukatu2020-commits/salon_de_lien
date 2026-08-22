import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { BOOKING_PROVIDERS, type BookingProvider } from "@/lib/appointments/booking-provider";
import { isBookingRangeWithinCapacityOverrides } from "@/lib/appointments/booking-capacity";
import {
  appointmentMinutes,
  dateAtTokyoMinutes,
  scheduleDateKey,
  SCHEDULE_SNAP_MINUTES,
  validateScheduleRange
} from "@/lib/appointments/schedule";
import { prisma } from "@/lib/prisma";
import { FREE_STAFF, normalizeSalonStaffName, salonStaffKey } from "@/lib/salon/staff";

export const runtime = "nodejs";

type ManualAppointmentBody = {
  customerId?: unknown;
  date?: unknown;
  startMinutes?: unknown;
  durationMinutes?: unknown;
  staffName?: unknown;
  menu?: unknown;
  estimatedPrice?: unknown;
  bookingProvider?: unknown;
  note?: unknown;
};

const LOCKED_STATUSES = ["会計完了", "来店完了", "キャンセル", "無断キャンセル"];
const MANUAL_PROVIDERS = new Set<BookingProvider>(["phone", "walk_in", "manual"]);

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (text.length > maxLength) throw new Error(`入力は${maxLength}文字以内にしてください。`);
  return text;
}

function jsonError(error: unknown) {
  const status = error instanceof AuthorizationError ? error.status : 400;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "予約を登録できませんでした。" },
    { status }
  );
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  try {
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId) throw new AuthorizationError("店舗所属が設定されていません。", 403);
    const organizationId = session.organizationId;
    const body = (await request.json()) as ManualAppointmentBody;
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    const date = typeof body.date === "string" ? body.date : "";
    const startMinutes = Number(body.startMinutes);
    const durationMinutes = Number(body.durationMinutes);
    const requestedStaffName = typeof body.staffName === "string" ? body.staffName.trim() : "";
    const menu = optionalText(body.menu, 120);
    const note = optionalText(body.note, 500);
    const priceText = typeof body.estimatedPrice === "string" ? body.estimatedPrice.trim() : "";
    const estimatedPrice = priceText === "" ? null : Number(priceText);
    const providerValue = typeof body.bookingProvider === "string" ? body.bookingProvider : "";

    if (!customerId) throw new Error("お客様を選択してください。");
    if (!/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(date)) {
      throw new Error("予約日を確認してください。");
    }
    const rangeError = validateScheduleRange({ startMinutes, durationMinutes });
    if (rangeError) throw new Error(rangeError);
    if (!menu) throw new Error("メニューを入力してください。");
    if (estimatedPrice !== null && (!Number.isInteger(estimatedPrice) || estimatedPrice < 0 || estimatedPrice > 1_000_000)) {
      throw new Error("見込み金額を確認してください。");
    }
    if (!(providerValue in BOOKING_PROVIDERS) || !MANUAL_PROVIDERS.has(providerValue as BookingProvider)) {
      throw new Error("予約経路を確認してください。");
    }
    const bookingProvider = providerValue as BookingProvider;

    const normalizedStaffName =
      requestedStaffName === FREE_STAFF.name
        ? FREE_STAFF.name
        : normalizeSalonStaffName(requestedStaffName);
    const staffKey = salonStaffKey(normalizedStaffName);
    if (!normalizedStaffName || !staffKey) throw new Error("登録済みのスタッフを選択してください。");

    const scheduledAt = dateAtTokyoMinutes(date, startMinutes);
    if (Number.isNaN(scheduledAt.getTime()) || scheduleDateKey(scheduledAt) !== date) {
      throw new Error("予約日時を確認してください。");
    }

    const appointment = await prisma.$transaction(
      async (tx) => {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, organizationId, deletedAt: null, storeHiddenAt: null },
          select: { id: true, name: true }
        });
        if (!customer) throw new AuthorizationError("お客様が見つかりません。", 404);

        const [setting, capacityOverrides] = await Promise.all([
          tx.staffBookingSetting.findUnique({
            where: { organizationId_staffKey: { organizationId, staffKey } },
            select: {
              maxConcurrentAppointments: true,
              workStartMinutes: true,
              workEndMinutes: true
            }
          }),
          tx.bookingCapacityOverride.findMany({
            where: { organizationId, dateKey: date },
            select: { slotStartMinutes: true, capacity: true }
          })
        ]);
        const maxConcurrentAppointments = setting?.maxConcurrentAppointments ?? (staffKey === "tanizaki" ? 2 : 1);
        const workStartMinutes = setting?.workStartMinutes ?? 10 * 60;
        const workEndMinutes = setting?.workEndMinutes ?? 19 * 60;
        if (startMinutes < workStartMinutes || startMinutes + durationMinutes > workEndMinutes) {
          throw new Error("スタッフの受付時間外です。スタッフ設定を確認してください。");
        }

        const candidateEnd = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
        const overlapLookback = new Date(scheduledAt.getTime() - 12 * 60 * 60_000);
        const nearby = await tx.appointment.findMany({
          where: {
            scheduledAt: { gte: overlapLookback, lt: candidateEnd },
            status: { notIn: LOCKED_STATUSES },
            customer: { organizationId, deletedAt: null }
          },
          select: { scheduledAt: true, durationMinutes: true, staffName: true }
        });
        const sameStaff = nearby.filter((item) => {
          const assigned = normalizeSalonStaffName(item.staffName) ?? FREE_STAFF.name;
          return assigned === normalizedStaffName;
        });

        const totalExisting = nearby
          .filter((item) => scheduleDateKey(item.scheduledAt) === date)
          .map((item) => ({
            startMinutes: appointmentMinutes(item.scheduledAt),
            durationMinutes: item.durationMinutes ?? 60
          }));
        if (
          !isBookingRangeWithinCapacityOverrides({
            startMinutes,
            durationMinutes,
            existing: totalExisting,
            overrides: capacityOverrides
          })
        ) {
          throw new Error("この時間帯の受付数上限に達しています。");
        }

        for (let cursor = startMinutes; cursor < startMinutes + durationMinutes; cursor += SCHEDULE_SNAP_MINUTES) {
          const existingCount = sameStaff.filter((item) => {
            if (scheduleDateKey(item.scheduledAt) !== date) return false;
            const itemStart = appointmentMinutes(item.scheduledAt);
            const itemEnd = itemStart + (item.durationMinutes ?? 60);
            return itemStart < cursor + SCHEDULE_SNAP_MINUTES && cursor < itemEnd;
          }).length;
          if (existingCount + 1 > maxConcurrentAppointments) {
            throw new Error(`${normalizedStaffName}の受付可能数を超えています。`);
          }
        }

        const sourceLabel =
          bookingProvider === "phone" ? "電話予約（手動）" : bookingProvider === "walk_in" ? "店頭予約（手動）" : "手動登録";
        const created = await tx.appointment.create({
          data: {
            customerId,
            scheduledAt,
            durationMinutes,
            menu,
            staffName: normalizedStaffName,
            estimatedPrice,
            status: "予約確定",
            source: sourceLabel,
            bookingProvider,
            note
          }
        });
        await tx.contactLog.create({
          data: {
            customerId,
            channel: bookingProvider === "phone" ? "電話" : "店頭",
            purpose: "予約登録",
            message: [
              `${sourceLabel}: ${scheduledAt.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
              `メニュー: ${menu}`,
              `担当: ${normalizedStaffName}`,
              estimatedPrice !== null ? `見込み金額: ${estimatedPrice.toLocaleString("ja-JP")}円` : null,
              note ? `メモ: ${note}` : null
            ].filter((line): line is string => Boolean(line)).join("\n"),
            outcome: "予約確定"
          }
        });

        return { created, customerName: customer.name };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.created.id,
        customerId: appointment.created.customerId,
        customerName: appointment.customerName,
        scheduledAt: appointment.created.scheduledAt.toISOString(),
        durationMinutes: appointment.created.durationMinutes ?? durationMinutes,
        menu: appointment.created.menu,
        staffName: appointment.created.staffName ?? FREE_STAFF.name,
        status: appointment.created.status,
        source: appointment.created.source,
        bookingProvider: appointment.created.bookingProvider,
        updatedAt: appointment.created.updatedAt.toISOString()
      }
    });
  } catch (error) {
    return jsonError(error);
  }
}
