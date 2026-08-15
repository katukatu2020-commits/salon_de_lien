import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import {
  bookingStartTimes,
  customerBookingMenu,
  isRegularClosedDate,
  type BookingCapacitySetting,
  type ExistingBookingRange
} from "@/lib/appointments/customer-booking";
import { appointmentMinutes, dateAtTokyoMinutes, scheduleDateKey } from "@/lib/appointments/schedule";
import { prisma } from "@/lib/prisma";
import { SALON_STAFF, normalizeSalonStaffName } from "@/lib/salon/staff";

export const dynamic = "force-dynamic";

const CANCELLED_STATUSES = ["キャンセル", "無断キャンセル"];

function validMonth(value: string) {
  return /^20\d{2}-(0[1-9]|1[0-2])$/.test(value);
}

function monthKeys(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => `${year}-${String(monthNumber).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`);
}

function maxBookableDate(today: string) {
  const result = dateAtTokyoMinutes(today, 0);
  result.setUTCDate(result.getUTCDate() + 90);
  return scheduleDateKey(result);
}

export async function GET(request: NextRequest) {
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  const month = request.nextUrl.searchParams.get("month") ?? "";
  const staffKey = request.nextUrl.searchParams.get("staff") ?? "free";
  const menu = customerBookingMenu(request.nextUrl.searchParams.get("menu"));
  if (!validMonth(month) || !menu || (staffKey !== "free" && !SALON_STAFF.some((staff) => staff.key === staffKey))) {
    return NextResponse.json({ error: "予約条件を確認してください。" }, { status: 400 });
  }

  const today = scheduleDateKey(new Date());
  const maximumDate = maxBookableDate(today);
  const dates = monthKeys(month);
  const rangeStart = dateAtTokyoMinutes(`${month}-01`, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCMonth(rangeEnd.getUTCMonth() + 1);
  const [savedSettings, appointments, capacityOverrides] = await Promise.all([
    prisma.staffBookingSetting.findMany({ where: { organizationId: session.organizationId } }),
    prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: rangeStart, lt: rangeEnd },
        status: { notIn: CANCELLED_STATUSES },
        customer: { organizationId: session.organizationId, deletedAt: null }
      },
      select: { scheduledAt: true, durationMinutes: true, staffName: true }
    }),
    prisma.bookingCapacityOverride.findMany({
      where: { organizationId: session.organizationId, dateKey: { startsWith: month } },
      select: { dateKey: true, slotStartMinutes: true, capacity: true }
    })
  ]);
  const settingByKey = new Map(savedSettings.map((setting) => [setting.staffKey, setting]));
  const settings: BookingCapacitySetting[] = SALON_STAFF.map((staff) => {
    const saved = settingByKey.get(staff.key);
    return {
      staffKey: staff.key,
      staffName: staff.name,
      maxConcurrentAppointments: saved?.maxConcurrentAppointments ?? (staff.key === "tanizaki" ? 2 : 1),
      workStartMinutes: saved?.workStartMinutes ?? 600,
      workEndMinutes: saved?.workEndMinutes ?? 1140
    };
  });
  const selectedSettings = staffKey === "free" ? settings : settings.filter((setting) => setting.staffKey === staffKey);
  const now = new Date();
  const currentMinutes = appointmentMinutes(now);

  const days = dates.map((date) => {
    const unavailableDate = date < today || date > maximumDate || isRegularClosedDate(date);
    if (unavailableDate) return { date, available: false, slots: [] as number[] };
    const earliestStartMinutes = date === today ? currentMinutes + 60 : 0;
    const dailyAppointments = appointments.filter(
      (appointment) => scheduleDateKey(appointment.scheduledAt) === date
    );
    const allExisting: ExistingBookingRange[] = dailyAppointments.map((appointment) => ({
      startMinutes: appointmentMinutes(appointment.scheduledAt),
      durationMinutes: appointment.durationMinutes ?? 60
    }));
    const dailyCapacityOverrides = capacityOverrides
      .filter((override) => override.dateKey === date)
      .map(({ slotStartMinutes, capacity }) => ({ slotStartMinutes, capacity }));
    const slots = Array.from(new Set(selectedSettings.flatMap((setting) => {
      const existing: ExistingBookingRange[] = dailyAppointments
        .filter((appointment) => (normalizeSalonStaffName(appointment.staffName) ?? "フリー") === setting.staffName)
        .map((appointment) => ({ startMinutes: appointmentMinutes(appointment.scheduledAt), durationMinutes: appointment.durationMinutes ?? 60 }));
      return bookingStartTimes({
        durationMinutes: menu.durationMinutes,
        setting,
        existing,
        capacityOverrides: dailyCapacityOverrides,
        allExisting,
        earliestStartMinutes
      });
    }))).sort((left, right) => left - right);
    return { date, available: slots.length > 0, slots };
  });

  return NextResponse.json({ month, staffKey, menuKey: menu.key, today, maximumDate, days });
}
