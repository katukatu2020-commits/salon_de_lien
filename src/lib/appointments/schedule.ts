export const SCHEDULE_START_MINUTES = 10 * 60;
export const SCHEDULE_END_MINUTES = 19 * 60;
export const SCHEDULE_SNAP_MINUTES = 15;
export const SCHEDULE_SLOT_MINUTES = 30;
export const MIN_APPOINTMENT_MINUTES = 15;
export const MAX_APPOINTMENT_MINUTES = 9 * 60;

export type ScheduleRange = {
  startMinutes: number;
  durationMinutes: number;
};

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function snapMinutes(value: number, interval = SCHEDULE_SNAP_MINUTES) {
  return Math.round(value / interval) * interval;
}

export function appointmentMinutes(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  return (
    Number(parts.find((part) => part.type === "hour")?.value ?? 0) * 60 +
    Number(parts.find((part) => part.type === "minute")?.value ?? 0)
  );
}

export function scheduleDateKey(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

export function dateAtTokyoMinutes(dateKey: string, minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return new Date(
    `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`
  );
}

export function rangesOverlap(left: ScheduleRange, right: ScheduleRange) {
  const leftEnd = left.startMinutes + left.durationMinutes;
  const rightEnd = right.startMinutes + right.durationMinutes;
  return left.startMinutes < rightEnd && right.startMinutes < leftEnd;
}

export function validateScheduleRange(range: ScheduleRange) {
  if (!Number.isInteger(range.startMinutes) || range.startMinutes % SCHEDULE_SNAP_MINUTES !== 0) {
    return "開始時刻は15分単位で指定してください。";
  }
  if (
    !Number.isInteger(range.durationMinutes) ||
    range.durationMinutes < MIN_APPOINTMENT_MINUTES ||
    range.durationMinutes > MAX_APPOINTMENT_MINUTES ||
    range.durationMinutes % SCHEDULE_SNAP_MINUTES !== 0
  ) {
    return "施術時間は15分単位で指定してください。";
  }
  if (
    range.startMinutes < SCHEDULE_START_MINUTES ||
    range.startMinutes + range.durationMinutes > SCHEDULE_END_MINUTES
  ) {
    return "予約は10:00から19:00の営業時間内に収めてください。";
  }
  return null;
}

export function assignScheduleLanes<T extends ScheduleRange & { id: string }>(items: readonly T[]) {
  const sorted = [...items].sort(
    (left, right) => left.startMinutes - right.startMinutes || right.durationMinutes - left.durationMinutes
  );
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();

  for (const item of sorted) {
    const lane = laneEnds.findIndex((end) => end <= item.startMinutes);
    const targetLane = lane === -1 ? laneEnds.length : lane;
    laneEnds[targetLane] = item.startMinutes + item.durationMinutes;
    lanes.set(item.id, targetLane);
  }

  return { lanes, laneCount: Math.max(1, laneEnds.length) };
}
