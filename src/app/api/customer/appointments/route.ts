import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import {
  customerBookingMenu,
  customerBookingMenuKeyFromName,
  isBookingRangeAvailable,
  isRegularClosedDate,
  type BookingCapacitySetting
} from "@/lib/appointments/customer-booking";
import { appointmentMinutes, dateAtTokyoMinutes, rangesOverlap, scheduleDateKey } from "@/lib/appointments/schedule";
import { prisma } from "@/lib/prisma";
import { SALON_STAFF, normalizeSalonStaffName } from "@/lib/salon/staff";

export const runtime = "nodejs";

const CANCELLED_STATUSES = ["キャンセル", "無断キャンセル"];

function bookingMaximumDate(today: string) {
  const result = dateAtTokyoMinutes(today, 0);
  result.setUTCDate(result.getUTCDate() + 90);
  return scheduleDateKey(result);
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const body = (await request.json()) as { staffKey?: unknown; menuKey?: unknown; date?: unknown; startMinutes?: unknown; couponIssueId?: unknown };
  const staffKey = typeof body.staffKey === "string" ? body.staffKey : "";
  const menu = customerBookingMenu(typeof body.menuKey === "string" ? body.menuKey : "");
  const date = typeof body.date === "string" ? body.date : "";
  const startMinutes = Number(body.startMinutes);
  const couponIssueId = typeof body.couponIssueId === "string" ? body.couponIssueId.trim() : "";
  const today = scheduleDateKey(new Date());
  if (
    !menu ||
    !/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(date) ||
    !Number.isInteger(startMinutes) ||
    startMinutes % 30 !== 0 ||
    date < today ||
    date > bookingMaximumDate(today) ||
    isRegularClosedDate(date)
  ) return NextResponse.json({ error: "予約日時を確認してください。" }, { status: 400 });
  if (date === today && startMinutes < appointmentMinutes(new Date()) + 60) {
    return NextResponse.json({ error: "当日の予約は現在時刻から1時間後以降を選んでください。" }, { status: 400 });
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: session.customerId, organizationId: session.organizationId, deletedAt: null },
        select: { id: true, name: true }
      });
      if (!customer) throw new Error("お客様情報が見つかりません。");
      const couponIssue = couponIssueId
        ? await tx.couponIssue.findFirst({
            where: {
              id: couponIssueId,
              customerId: customer.id,
              status: "issued",
              issuedAt: { lte: new Date() },
              expiresAt: { gte: new Date() }
            },
            select: { id: true, couponCode: true, discountRate: true, targetMenusJson: true }
          })
        : null;
      if (couponIssueId && !couponIssue) throw new Error("選択したクーポンは期限切れまたは使用済みです。");
      if (couponIssue) {
        const targetMenus = Array.isArray(couponIssue.targetMenusJson)
          ? couponIssue.targetMenusJson.filter((value): value is string => typeof value === "string")
          : [];
        const targetMenuKeys = targetMenus.map(customerBookingMenuKeyFromName).filter(Boolean);
        if (targetMenuKeys.length > 0 && !targetMenuKeys.includes(menu.key)) {
          throw new Error("このクーポンは選択したメニューでは利用できません。");
        }
        const existingReservation = await tx.appointment.findFirst({
          where: { couponIssueId: couponIssue.id, status: { notIn: CANCELLED_STATUSES } },
          select: { id: true }
        });
        if (existingReservation) throw new Error("このクーポンは別の予約に設定済みです。");
      }
      const savedSettings = await tx.staffBookingSetting.findMany({ where: { organizationId: session.organizationId } });
      const settingByKey = new Map(savedSettings.map((setting) => [setting.staffKey, setting]));
      const allSettings: BookingCapacitySetting[] = savedSettings.length > 0
        ? savedSettings.map((setting) => ({
            staffKey: setting.staffKey,
            staffName: setting.staffName,
            maxConcurrentAppointments: setting.maxConcurrentAppointments,
            workStartMinutes: setting.workStartMinutes,
            workEndMinutes: setting.workEndMinutes
          }))
        : SALON_STAFF.map((staff) => {
            const saved = settingByKey.get(staff.key);
            return {
              staffKey: staff.key,
              staffName: staff.name,
              maxConcurrentAppointments: saved?.maxConcurrentAppointments ?? (staff.key === "tanizaki" ? 2 : 1),
              workStartMinutes: saved?.workStartMinutes ?? 600,
              workEndMinutes: saved?.workEndMinutes ?? 1140
            };
          });
      const candidates = staffKey === "free" ? allSettings : allSettings.filter((setting) => setting.staffKey === staffKey);
      if (candidates.length === 0) throw new Error("選択した担当者は現在予約を受け付けていません。");
      const dayStart = dateAtTokyoMinutes(date, 0);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
      const daily = await tx.appointment.findMany({
        where: {
          scheduledAt: { gte: dayStart, lt: dayEnd },
          status: { notIn: CANCELLED_STATUSES },
          customer: { organizationId: session.organizationId, deletedAt: null }
        },
        select: { customerId: true, scheduledAt: true, durationMinutes: true, staffName: true }
      });
      const capacityOverrides = await tx.bookingCapacityOverride.findMany({
        where: { organizationId: session.organizationId, dateKey: date },
        select: { slotStartMinutes: true, capacity: true }
      });
      const allExisting = daily.map((appointment) => ({
        startMinutes: appointmentMinutes(appointment.scheduledAt),
        durationMinutes: appointment.durationMinutes ?? 60
      }));
      const customerConflict = daily.some((appointment) =>
        appointment.customerId === customer.id && rangesOverlap(
          { startMinutes, durationMinutes: menu.durationMinutes },
          { startMinutes: appointmentMinutes(appointment.scheduledAt), durationMinutes: appointment.durationMinutes ?? 60 }
        )
      );
      if (customerConflict) throw new Error("同じ時間帯にすでに予約があります。");

      const available = candidates
        .map((setting) => {
          const existing = daily
            .filter((appointment) => (normalizeSalonStaffName(appointment.staffName) ?? "フリー") === setting.staffName)
            .map((appointment) => ({ startMinutes: appointmentMinutes(appointment.scheduledAt), durationMinutes: appointment.durationMinutes ?? 60 }));
          return { setting, existing };
        })
        .filter(({ setting, existing }) =>
          isBookingRangeAvailable({
            startMinutes,
            durationMinutes: menu.durationMinutes,
            setting,
            existing,
            capacityOverrides,
            allExisting
          })
        )
        .sort((left, right) => left.existing.length - right.existing.length)[0];
      if (!available) throw new Error("選択した時間は埋まりました。別の時間を選んでください。");

      const scheduledAt = dateAtTokyoMinutes(date, startMinutes);
      const appointment = await tx.appointment.create({
        data: {
          customerId: customer.id,
          scheduledAt,
          durationMinutes: menu.durationMinutes,
          menu: menu.name,
          staffName: available.setting.staffName,
          estimatedPrice: menu.estimatedPrice,
          status: "予約確定",
          source: "お客様アプリ予約",
          bookingProvider: "customer_app",
          couponIssueId: couponIssue?.id ?? null,
          note: [
            staffKey === "free" ? "お客様アプリから予約（指名なし）" : "お客様アプリから予約（担当者指名）",
            couponIssue ? `予約クーポン: ${couponIssue.discountRate}%OFF（${couponIssue.couponCode}）` : null
          ].filter(Boolean).join("\n")
        }
      });
      await tx.contactLog.create({
        data: {
          customerId: customer.id,
          channel: "お客様アプリ",
          purpose: "予約登録",
          message: `${date} ${String(Math.floor(startMinutes / 60)).padStart(2, "0")}:${String(startMinutes % 60).padStart(2, "0")} / ${menu.name} / 担当 ${available.setting.staffName}${couponIssue ? ` / クーポン ${couponIssue.discountRate}%OFF` : ""}`,
          outcome: "予約確定"
        }
      });
      return { appointment, customerName: customer.name };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/admin/appointments");
    revalidatePath("/u/appointments");
    revalidatePath("/u/home");
    return NextResponse.json({
      success: true,
      appointment: {
        id: created.appointment.id,
        customerName: created.customerName,
        scheduledAt: created.appointment.scheduledAt.toISOString(),
        durationMinutes: created.appointment.durationMinutes,
        menu: created.appointment.menu,
        staffName: created.appointment.staffName
      }
    });
  } catch (error) {
    const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
    return NextResponse.json({ error: retryable ? "同時に予約が入りました。空き状況を更新してください。" : error instanceof Error ? error.message : "予約を登録できませんでした。" }, { status: retryable ? 409 : 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { appointmentId?: unknown } | null;
  const appointmentId = typeof body?.appointmentId === "string" ? body.appointmentId.trim() : "";
  if (!appointmentId || appointmentId.length > 100) {
    return NextResponse.json({ error: "予約情報を確認してください。" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: appointmentId,
          customerId: session.customerId,
          customer: { organizationId: session.organizationId, deletedAt: null }
        },
        select: {
          id: true,
          customerId: true,
          scheduledAt: true,
          menu: true,
          staffName: true,
          status: true,
          note: true,
          serviceSales: { select: { id: true }, take: 1 },
          customer: { select: { name: true } }
        }
      });
      if (!appointment) throw new Error("予約が見つかりません。");
      if (CANCELLED_STATUSES.includes(appointment.status)) throw new Error("この予約はすでにキャンセル済みです。");
      if (appointment.scheduledAt <= new Date()) throw new Error("開始時刻を過ぎた予約はアプリからキャンセルできません。店舗へお問い合わせください。");
      if (appointment.serviceSales.length > 0 || appointment.status === "来店済み") {
        throw new Error("会計済みの予約はキャンセルできません。");
      }

      const updated = await tx.appointment.updateMany({
        where: {
          id: appointment.id,
          customerId: session.customerId,
          status: { notIn: CANCELLED_STATUSES },
          scheduledAt: { gt: new Date() }
        },
        data: {
          status: "キャンセル",
          couponIssueId: null,
          note: [appointment.note?.trim(), "お客様アプリからキャンセル"].filter(Boolean).join("\n")
        }
      });
      if (updated.count !== 1) throw new Error("予約状況が更新されています。画面を再読み込みしてください。");

      await tx.contactLog.create({
        data: {
          customerId: appointment.customerId,
          channel: "お客様アプリ",
          purpose: "予約キャンセル",
          message: `${appointment.scheduledAt.toISOString()} / ${appointment.menu ?? "メニュー未設定"} / 担当 ${appointment.staffName ?? "フリー"}`,
          outcome: "キャンセル"
        }
      });

      return appointment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await prisma.$executeRawUnsafe(
      'INSERT INTO "StaffSystemNotification" ("id","organizationId","type","title","body","href","entityType","entityId","source","createdAt","updatedAt") VALUES ($1,$2,\'customer_cancellation\',$3,$4,$5,\'appointment\',$6,\'customer_app\',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT ("organizationId","type","entityId") DO NOTHING',
      crypto.randomUUID(),
      session.organizationId,
      "お客様が予約をキャンセルしました",
      `${result.customer.name}様が${result.menu ?? "施術"}の予約をキャンセルしました。`,
      `/admin/appointments/${encodeURIComponent(result.id)}`,
      result.id
    ).catch((notificationError) => {
      console.warn("[customer-appointment-cancel] staff notification could not be recorded", notificationError);
    });

    revalidatePath("/admin/appointments");
    revalidatePath(`/admin/appointments/${result.id}`);
    revalidatePath("/u/appointments");
    revalidatePath("/u/home");
    revalidatePath("/u/news");
    return NextResponse.json({ success: true, appointmentId: result.id, status: "キャンセル" });
  } catch (error) {
    const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
    return NextResponse.json(
      { error: retryable ? "予約状況が更新されました。画面を再読み込みしてください。" : error instanceof Error ? error.message : "予約をキャンセルできませんでした。" },
      { status: retryable ? 409 : 400 }
    );
  }
}
