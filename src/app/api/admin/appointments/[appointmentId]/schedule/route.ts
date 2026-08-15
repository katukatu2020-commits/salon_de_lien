import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { isBookingRangeWithinCapacityOverrides } from "@/lib/appointments/booking-capacity";
import { prisma } from "@/lib/prisma";
import {
  appointmentMinutes,
  dateAtTokyoMinutes,
  scheduleDateKey,
  SCHEDULE_SNAP_MINUTES,
  validateScheduleRange
} from "@/lib/appointments/schedule";
import {
  FREE_STAFF,
  normalizeSalonStaffName,
  salonStaffKey
} from "@/lib/salon/staff";

export const runtime = "nodejs";

type ScheduleBody = {
  date?: unknown;
  startMinutes?: unknown;
  durationMinutes?: unknown;
  staffName?: unknown;
  updatedAt?: unknown;
};

const LOCKED_STATUSES = ["会計完了", "来店完了", "キャンセル", "無断キャンセル"];

function jsonError(error: unknown) {
  const status = error instanceof AuthorizationError ? error.status : 400;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "予約を更新できませんでした。" },
    { status }
  );
}

async function updateSchedule(
  appointmentId: string,
  body: ScheduleBody,
  organizationId: string
) {
  const date = typeof body.date === "string" ? body.date : "";
  const startMinutes = Number(body.startMinutes);
  const durationMinutes = Number(body.durationMinutes);
  const requestedStaffName = typeof body.staffName === "string" ? body.staffName.trim() : "";
  const expectedUpdatedAt = typeof body.updatedAt === "string" ? new Date(body.updatedAt) : null;

  if (!/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(date)) {
    throw new Error("予約日を確認してください。");
  }
  const rangeError = validateScheduleRange({ startMinutes, durationMinutes });
  if (rangeError) throw new Error(rangeError);

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

  return prisma.$transaction(
    async (tx) => {
      const appointment = await tx.appointment.findFirst({
        where: {
          id: appointmentId,
          customer: { organizationId, deletedAt: null }
        },
        select: { id: true, status: true, updatedAt: true }
      });
      if (!appointment) throw new AuthorizationError("予約が見つかりません。", 404);
      if (LOCKED_STATUSES.includes(appointment.status)) {
        throw new Error("完了・キャンセル済みの予約は移動できません。");
      }
      if (expectedUpdatedAt && appointment.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
        throw new Error("別の端末で予約が更新されました。画面を再読み込みしてください。");
      }

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
          id: { not: appointmentId },
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

      for (
        let cursor = startMinutes;
        cursor < startMinutes + durationMinutes;
        cursor += SCHEDULE_SNAP_MINUTES
      ) {
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

      const result = await tx.appointment.updateMany({
        where: {
          id: appointmentId,
          ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {})
        },
        data: { scheduledAt, durationMinutes, staffName: normalizedStaffName }
      });
      if (result.count !== 1) {
        throw new Error("予約の更新が競合しました。画面を再読み込みしてください。");
      }

      return tx.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
        select: {
          id: true,
          scheduledAt: true,
          durationMinutes: true,
          staffName: true,
          updatedAt: true
        }
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { appointmentId: string } }
) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  try {
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId) throw new AuthorizationError("店舗所属が設定されていません。", 403);
    const body = (await request.json()) as ScheduleBody;
    const appointment = await updateSchedule(params.appointmentId, body, session.organizationId);
    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    return jsonError(error);
  }
}
