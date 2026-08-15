import {
  SCHEDULE_END_MINUTES,
  SCHEDULE_SLOT_MINUTES,
  SCHEDULE_SNAP_MINUTES,
  SCHEDULE_START_MINUTES
} from "@/lib/appointments/schedule";

export const MAX_BOOKING_CAPACITY = 10;

export type BookingCapacityOverrideValue = {
  slotStartMinutes: number;
  capacity: number;
};

export type TotalBookingRange = {
  startMinutes: number;
  durationMinutes: number;
};

export function bookingCapacitySlotStarts() {
  return Array.from(
    { length: (SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES) / SCHEDULE_SLOT_MINUTES },
    (_, index) => SCHEDULE_START_MINUTES + index * SCHEDULE_SLOT_MINUTES
  );
}

export function bookingCapacitySlotStart(minutes: number) {
  return Math.floor(minutes / SCHEDULE_SLOT_MINUTES) * SCHEDULE_SLOT_MINUTES;
}

export function bookingCapacityAt(
  overrides: readonly BookingCapacityOverrideValue[],
  minutes: number
) {
  const slotStartMinutes = bookingCapacitySlotStart(minutes);
  return overrides.find((item) => item.slotStartMinutes === slotStartMinutes)?.capacity ?? null;
}

export function isBookingRangeWithinCapacityOverrides({
  startMinutes,
  durationMinutes,
  existing,
  overrides
}: {
  startMinutes: number;
  durationMinutes: number;
  existing: readonly TotalBookingRange[];
  overrides: readonly BookingCapacityOverrideValue[];
}) {
  for (let cursor = startMinutes; cursor < startMinutes + durationMinutes; cursor += SCHEDULE_SNAP_MINUTES) {
    const capacity = bookingCapacityAt(overrides, cursor);
    if (capacity === null) continue;
    const overlapping = existing.filter((appointment) => {
      const end = appointment.startMinutes + appointment.durationMinutes;
      return appointment.startMinutes < cursor + SCHEDULE_SNAP_MINUTES && cursor < end;
    }).length;
    if (overlapping + 1 > capacity) return false;
  }
  return true;
}
