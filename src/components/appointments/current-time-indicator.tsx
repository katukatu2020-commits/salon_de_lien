"use client";

import { useEffect, useState } from "react";

type CurrentTimeIndicatorProps = {
  selectedDate: string;
  startHour: number;
  endHour: number;
  hourHeight: number;
  headerHeight?: number;
  timeColumnWidth?: number;
};

type TokyoDatePart = "year" | "month" | "day" | "hour" | "minute";

function tokyoParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(value);
  const part = (type: TokyoDatePart) => parts.find((item) => item.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
    minute: Number(part("minute"))
  };
}

export function CurrentTimeIndicator({
  selectedDate,
  startHour,
  endHour,
  hourHeight,
  headerHeight = 40,
  timeColumnWidth = 76
}: CurrentTimeIndicatorProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!now) return null;

  const current = tokyoParts(now);
  const minuteOfDay = current.hour * 60 + current.minute;
  const startMinute = startHour * 60;
  const endMinute = endHour * 60;

  if (current.date !== selectedDate || minuteOfDay < startMinute || minuteOfDay > endMinute) {
    return null;
  }

  const top = headerHeight + ((minuteOfDay - startMinute) / 60) * hourHeight;
  const time = `${String(current.hour).padStart(2, "0")}:${String(current.minute).padStart(2, "0")}`;

  return (
    <div
      role="status"
      aria-label={`現在時刻 ${time}`}
      className="pointer-events-none absolute inset-x-0 z-30 -translate-y-1/2"
      style={{ top }}
    >
      <span className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-[#a94646] px-2 py-0.5 text-[10px] font-bold tabular-nums text-white shadow-sm">
        {time}
      </span>
      <span
        className="absolute right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#c65353] shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
        style={{ left: timeColumnWidth }}
      />
      <span
        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#c65353] shadow-sm"
        style={{ left: timeColumnWidth }}
      />
    </div>
  );
}
