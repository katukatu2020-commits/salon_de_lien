type WorkingHours = {
  workStartMinutes: number;
  workEndMinutes: number;
  key?: string;
  isVirtualFree?: boolean;
};

export function resolveWorkingHours(
  member: WorkingHours & { closedWeekdays?: string | null },
  date: string,
  policy?: { plannedStart: string; plannedEnd: string },
  override?: { isDayOff: boolean; startMinutes: number; endMinutes: number }
) {
  const minutes = (value?: string) => {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return undefined;
    const [hour, minute] = value.split(":").map(Number);
    return hour < 24 && minute < 60 ? hour * 60 + minute : undefined;
  };
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const off = override ? override.isDayOff : (member.closedWeekdays || "").split(",").filter(Boolean).map(Number).includes(weekday);
  return {
    workStartMinutes: off ? 0 : override?.startMinutes ?? minutes(policy?.plannedStart) ?? member.workStartMinutes,
    workEndMinutes: off ? 0 : override?.endMinutes ?? minutes(policy?.plannedEnd) ?? member.workEndMinutes
  };
}

export function workTimeShading(member: WorkingHours, open: number, close: number, closed = false) {
  if (closed) return { before: 100, after: 0 };
  if (member.isVirtualFree || member.key === "free") return { before: 0, after: 0 };
  const start = member.workStartMinutes;
  const end = member.workEndMinutes;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= open || start >= close) {
    return { before: 100, after: 0 };
  }
  const duration = Math.max(1, close - open);
  return {
    before: Math.min(100, Math.max(0, (start - open) / duration * 100)),
    after: Math.min(100, Math.max(0, (close - end) / duration * 100))
  };
}
