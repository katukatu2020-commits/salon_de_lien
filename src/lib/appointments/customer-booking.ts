import { SCHEDULE_SNAP_MINUTES } from "@/lib/appointments/schedule";
import {
  isBookingRangeWithinCapacityOverrides,
  type BookingCapacityOverrideValue,
  type TotalBookingRange
} from "@/lib/appointments/booking-capacity";

export const MINIMUM_BOOKING_START_GAP_MINUTES = 30;

export const CUSTOMER_BOOKING_MENUS = [
  { key: "cut", name: "カット", durationMinutes: 60, estimatedPrice: 5500 },
  { key: "cut-color", name: "カット + カラー", durationMinutes: 150, estimatedPrice: 13200 },
  { key: "color", name: "カラー", durationMinutes: 120, estimatedPrice: 8800 },
  { key: "cut-perm", name: "カット + パーマ", durationMinutes: 150, estimatedPrice: 14300 },
  { key: "treatment", name: "トリートメント", durationMinutes: 60, estimatedPrice: 5500 },
  { key: "head-spa", name: "ヘッドスパ", durationMinutes: 60, estimatedPrice: 5500 }
] as const;

export type CustomerBookingMenu = (typeof CUSTOMER_BOOKING_MENUS)[number];

export type BookingCapacitySetting = {
  staffKey: string;
  staffName: string;
  maxConcurrentAppointments: number;
  workStartMinutes: number;
  workEndMinutes: number;
};

export type ExistingBookingRange = {
  startMinutes: number;
  durationMinutes: number;
};

export function customerBookingMenu(key: string | null | undefined) {
  return CUSTOMER_BOOKING_MENUS.find((menu) => menu.key === key) ?? null;
}

export function isBookingRangeAvailable({
  startMinutes,
  durationMinutes,
  setting,
  existing,
  capacityOverrides = [],
  allExisting = existing
}: {
  startMinutes: number;
  durationMinutes: number;
  setting: BookingCapacitySetting;
  existing: readonly ExistingBookingRange[];
  capacityOverrides?: readonly BookingCapacityOverrideValue[];
  allExisting?: readonly TotalBookingRange[];
}) {
  if (
    startMinutes < setting.workStartMinutes ||
    startMinutes + durationMinutes > setting.workEndMinutes ||
    setting.maxConcurrentAppointments < 1
  ) return false;

  if (
    existing.some(
      (appointment) => Math.abs(appointment.startMinutes - startMinutes) < MINIMUM_BOOKING_START_GAP_MINUTES
    )
  ) return false;

  if (
    !isBookingRangeWithinCapacityOverrides({
      startMinutes,
      durationMinutes,
      existing: allExisting,
      overrides: capacityOverrides
    })
  ) return false;

  for (let cursor = startMinutes; cursor < startMinutes + durationMinutes; cursor += SCHEDULE_SNAP_MINUTES) {
    const overlapping = existing.filter((appointment) => {
      const end = appointment.startMinutes + appointment.durationMinutes;
      return appointment.startMinutes < cursor + SCHEDULE_SNAP_MINUTES && cursor < end;
    }).length;
    if (overlapping >= setting.maxConcurrentAppointments) return false;
  }
  return true;
}

export function bookingStartTimes({
  durationMinutes,
  setting,
  existing,
  capacityOverrides = [],
  allExisting = existing,
  earliestStartMinutes = 0,
  intervalMinutes = 30
}: {
  durationMinutes: number;
  setting: BookingCapacitySetting;
  existing: readonly ExistingBookingRange[];
  capacityOverrides?: readonly BookingCapacityOverrideValue[];
  allExisting?: readonly TotalBookingRange[];
  earliestStartMinutes?: number;
  intervalMinutes?: number;
}) {
  const result: number[] = [];
  const first = Math.max(setting.workStartMinutes, Math.ceil(earliestStartMinutes / intervalMinutes) * intervalMinutes);
  for (let start = first; start + durationMinutes <= setting.workEndMinutes; start += intervalMinutes) {
    if (
      isBookingRangeAvailable({
        startMinutes: start,
        durationMinutes,
        setting,
        existing,
        capacityOverrides,
        allExisting
      })
    ) result.push(start);
  }
  return result;
}

export function isRegularClosedDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 1;
}

export function minutesText(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
