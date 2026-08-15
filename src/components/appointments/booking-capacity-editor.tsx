"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Save, SlidersHorizontal, X } from "lucide-react";
import {
  bookingCapacitySlotStarts,
  MAX_BOOKING_CAPACITY,
  type BookingCapacityOverrideValue
} from "@/lib/appointments/booking-capacity";
import { SCHEDULE_SLOT_MINUTES } from "@/lib/appointments/schedule";

type StaffCapacity = {
  maxConcurrentAppointments: number;
  workStartMinutes: number;
  workEndMinutes: number;
};

type Props = {
  date: string;
  dateLabel: string;
  staff: StaffCapacity[];
  overrides: BookingCapacityOverrideValue[];
  onSaved: (overrides: BookingCapacityOverrideValue[]) => void;
};

function timeLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function BookingCapacityEditor({ date, dateLabel, staff, overrides, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<number, string>>({});
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const slots = useMemo(() => bookingCapacitySlotStarts(), []);
  const automaticCapacity = useMemo(
    () =>
      new Map(
        slots.map((slotStartMinutes) => {
          const slotEnd = slotStartMinutes + SCHEDULE_SLOT_MINUTES;
          const capacity = staff.reduce((sum, member) => {
            const working = member.workStartMinutes < slotEnd && slotStartMinutes < member.workEndMinutes;
            return sum + (working ? member.maxConcurrentAppointments : 0);
          }, 0);
          return [slotStartMinutes, capacity];
        })
      ),
    [slots, staff]
  );

  useEffect(() => {
    if (!open) return;
    setValues(
      Object.fromEntries(
        slots.map((slotStartMinutes) => [
          slotStartMinutes,
          String(overrides.find((item) => item.slotStartMinutes === slotStartMinutes)?.capacity ?? "")
        ])
      )
    );
    setError(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, overrides, slots]);

  async function save() {
    setSaving(true);
    setError(null);
    const payloadSlots = slots.map((slotStartMinutes) => ({
      slotStartMinutes,
      capacity: values[slotStartMinutes] === "" ? null : Number(values[slotStartMinutes])
    }));
    try {
      const response = await fetch("/api/admin/appointments/capacity", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slots: payloadSlots })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "受付数を保存できませんでした。");
      const saved = payloadSlots.filter(
        (slot): slot is { slotStartMinutes: number; capacity: number } => slot.capacity !== null
      );
      onSaved(saved);
      setOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "受付数を保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="lien-button-secondary px-4">
        <SlidersHorizontal className="h-4 w-4" />
        受付数を編集
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-[#2f2a25]/45 p-3 backdrop-blur-sm sm:p-6" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="capacity-dialog-title" className="flex max-h-[min(760px,calc(100dvh-24px))] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-[color:var(--lien-border)] bg-[color:var(--lien-bg)] shadow-[0_24px_80px_rgba(47,42,37,0.24)]">
            <header className="flex items-start justify-between gap-4 border-b border-[color:var(--lien-border)] bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-semibold text-[color:var(--lien-primary)]">{dateLabel}</p>
                <h2 id="capacity-dialog-title" className="mt-1 text-lg font-semibold text-[color:var(--lien-ink)]">時間帯ごとの受付数</h2>
                <p className="mt-1 text-xs leading-5 text-[color:var(--lien-muted)]">「自動」は勤務中スタッフの受付可能数から計算します。0件にすると、その時間帯の新規予約を停止します。</p>
              </div>
              <button ref={closeButtonRef} type="button" onClick={() => setOpen(false)} disabled={saving} className="lien-icon-button shrink-0" aria-label="閉じる">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {slots.map((slotStartMinutes) => (
                  <label key={slotStartMinutes} className="rounded-2xl border border-[color:var(--lien-border)] bg-white p-3 text-sm shadow-sm">
                    <span className="block font-semibold tabular-nums text-[color:var(--lien-ink)]">
                      {timeLabel(slotStartMinutes)}〜{timeLabel(slotStartMinutes + SCHEDULE_SLOT_MINUTES)}
                    </span>
                    <select
                      value={values[slotStartMinutes] ?? ""}
                      onChange={(event) => setValues((current) => ({ ...current, [slotStartMinutes]: event.target.value }))}
                      className="mt-2 h-10 w-full rounded-xl border border-[color:var(--lien-border)] bg-white px-3 text-sm font-semibold outline-none focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/35"
                      aria-label={`${timeLabel(slotStartMinutes)}の受付数`}
                    >
                      <option value="">自動（{automaticCapacity.get(slotStartMinutes) ?? 0}件）</option>
                      {Array.from({ length: MAX_BOOKING_CAPACITY + 1 }, (_, capacity) => (
                        <option key={capacity} value={capacity}>{capacity}件</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              {error ? <p role="alert" className="mt-4 rounded-xl border border-[#edc2bd] bg-[#fff1ef] px-4 py-3 text-sm font-semibold text-[#884039]">{error}</p> : null}
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-[color:var(--lien-border)] bg-white px-5 py-4 sm:px-6">
              <button type="button" onClick={() => setOpen(false)} disabled={saving} className="lien-button-secondary px-5">キャンセル</button>
              <button type="button" onClick={() => void save()} disabled={saving} className="lien-button-primary min-w-36 px-5">
                {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "保存中" : "受付数を保存"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
