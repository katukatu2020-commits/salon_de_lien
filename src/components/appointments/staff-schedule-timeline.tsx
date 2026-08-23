"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, GripVertical, LoaderCircle, MoveHorizontal } from "lucide-react";
import {
  ManualAppointmentDialog,
  type ManualAppointmentCreated,
  type ManualAppointmentCustomer
} from "@/components/appointments/manual-appointment-dialog";
import { BookingCapacityEditor } from "@/components/appointments/booking-capacity-editor";
import { BOOKING_PROVIDERS, inferBookingProvider } from "@/lib/appointments/booking-provider";
import type { BookingCapacityOverrideValue } from "@/lib/appointments/booking-capacity";
import { resolveScheduleStaffIdentity } from "@/lib/appointments/staff-identity";
import {
  appointmentMinutes,
  assignScheduleLanes,
  clamp,
  SCHEDULE_END_MINUTES,
  SCHEDULE_SLOT_MINUTES,
  SCHEDULE_SNAP_MINUTES,
  SCHEDULE_START_MINUTES,
  snapMinutes
} from "@/lib/appointments/schedule";

const EVENT_HEIGHT = 42;
const EVENT_GAP = 5;
const ROW_PADDING = 10;
const LOCKED_STATUSES = new Set(["会計完了", "来店完了", "キャンセル", "無断キャンセル"]);
export type ScheduleTimelineAppointment = {
  id: string;
  customerId: string;
  customerName: string;
  scheduledAt: string;
  durationMinutes: number;
  menu: string | null;
  staffKey?: string;
  staffName: string;
  status: string;
  source: string | null;
  bookingProvider: string | null;
  updatedAt: string;
};

export type ScheduleTimelineStaff = {
  key: string;
  name: string;
  role: string;
  maxConcurrentAppointments: number;
  workStartMinutes: number;
  workEndMinutes: number;
};

type Props = {
  date: string;
  dateLabel: string;
  appointments: ScheduleTimelineAppointment[];
  staff: ScheduleTimelineStaff[];
  customers: ManualAppointmentCustomer[];
  isToday: boolean;
  currentMinutes: number | null;
  capacityOverrides: BookingCapacityOverrideValue[];
};

type Interaction = {
  appointmentId: string;
  pointerId: number;
  pointerType: string;
  mode: "move" | "resize";
  originClientX: number;
  originClientY: number;
  originStartMinutes: number;
  originDurationMinutes: number;
  originStaffKey?: string;
  originStaffName: string;
  moved: boolean;
};

const MOUSE_DRAG_THRESHOLD = 3;
const TOUCH_DRAG_THRESHOLD = 8;
const TOUCH_SCROLL_THRESHOLD = 6;

function minutesLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function statusClasses(status: string) {
  if (status === "予約確定") return "border-[#e2b9b1] bg-[#fff0ed] text-[#603d37]";
  if (status === "変更受付") return "border-[#dfc78e] bg-[#fff8e6] text-[#725117]";
  if (status === "仮予約") return "border-[#c7d7c4] bg-[#f0f6ee] text-[#405b40]";
  return "border-[#ddd5cc] bg-[#f5f1ec] text-[#6f665e]";
}

function appointmentRange(appointment: ScheduleTimelineAppointment) {
  const start = appointmentMinutes(appointment.scheduledAt);
  return `${minutesLabel(start)}〜${minutesLabel(start + appointment.durationMinutes)}`;
}

function isAppointmentActive(appointment: ScheduleTimelineAppointment) {
  return !LOCKED_STATUSES.has(appointment.status);
}

export function StaffScheduleTimeline({
  date,
  dateLabel,
  appointments: initialAppointments,
  staff,
  customers,
  isToday,
  currentMinutes,
  capacityOverrides: initialCapacityOverrides
}: Props) {
  const router = useRouter();
  const [appointments, setAppointments] = useState(initialAppointments);
  const [capacityOverrides, setCapacityOverrides] = useState(initialCapacityOverrides);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const appointmentsRef = useRef(initialAppointments);
  const interactionRef = useRef<Interaction | null>(null);
  const snapshotRef = useRef<ScheduleTimelineAppointment | null>(null);
  const scheduleTableRef = useRef<HTMLDivElement | null>(null);
  const lastDragEndedAtRef = useRef(0);
  const [scheduleWidth, setScheduleWidth] = useState(960);
  const labelWidth = scheduleWidth < 420 ? 92 : scheduleWidth < 760 ? 124 : 176;
  const timelineWidth = Math.max(1, scheduleWidth - labelWidth);
  const pixelsPerMinute = timelineWidth / (SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES);
  const displaySlotMinutes = timelineWidth < 440 ? 60 : SCHEDULE_SLOT_MINUTES;
  const displaySlots = useMemo(
    () =>
      Array.from(
        { length: (SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES) / displaySlotMinutes },
        (_, index) => SCHEDULE_START_MINUTES + index * displaySlotMinutes
      ),
    [displaySlotMinutes]
  );
  const timeTicks = useMemo(() => {
    const step = timelineWidth < 260 ? 180 : timelineWidth < 520 ? 120 : 60;
    const ticks = Array.from(
      { length: Math.floor((SCHEDULE_END_MINUTES - SCHEDULE_START_MINUTES) / step) + 1 },
      (_, index) => SCHEDULE_START_MINUTES + index * step
    );
    if (ticks.at(-1) !== SCHEDULE_END_MINUTES) ticks.push(SCHEDULE_END_MINUTES);
    return ticks;
  }, [timelineWidth]);

  useEffect(() => {
    appointmentsRef.current = initialAppointments;
    setAppointments(initialAppointments);
  }, [initialAppointments]);

  useEffect(() => {
    setCapacityOverrides(initialCapacityOverrides);
  }, [initialCapacityOverrides]);

  useEffect(() => {
    const table = scheduleTableRef.current;
    if (!table) return;

    const syncWidth = () => setScheduleWidth(Math.max(1, Math.floor(table.getBoundingClientRect().width)));
    syncWidth();
    const resizeObserver = new ResizeObserver(syncWidth);
    resizeObserver.observe(table);
    return () => resizeObserver.disconnect();
  }, []);

  const appointmentsByStaff = useMemo(() => {
    const result = new Map<string, ScheduleTimelineAppointment[]>();
    for (const member of staff) result.set(member.name, []);
    for (const appointment of appointments) {
      const assigned = resolveScheduleStaffIdentity(appointment, staff)?.name ?? "フリー";
      result.set(assigned, [...(result.get(assigned) ?? []), appointment]);
    }
    return result;
  }, [appointments, staff]);

  const slotCounts = useMemo(
    () =>
      displaySlots.map((slotStart) => {
        const slotEnd = slotStart + displaySlotMinutes;
        const halfHourSlots = Array.from(
          { length: Math.max(1, displaySlotMinutes / SCHEDULE_SLOT_MINUTES) },
          (_, index) => slotStart + index * SCHEDULE_SLOT_MINUTES
        );
        const counts = halfHourSlots.map((subSlotStart) => {
          const subSlotEnd = Math.min(slotEnd, subSlotStart + SCHEDULE_SLOT_MINUTES);
          const automaticCapacity = staff.reduce((sum, member) => {
            const working = member.workStartMinutes < subSlotEnd && subSlotStart < member.workEndMinutes;
            return sum + (working ? member.maxConcurrentAppointments : 0);
          }, 0);
          const capacity = capacityOverrides.find(
            (item) => item.slotStartMinutes === subSlotStart
          )?.capacity ?? automaticCapacity;
          const booked = appointments.filter((appointment) => {
            if (!isAppointmentActive(appointment)) return false;
            const start = appointmentMinutes(appointment.scheduledAt);
            return start < subSlotEnd && subSlotStart < start + appointment.durationMinutes;
          }).length;
          return { capacity, booked, remaining: Math.max(0, capacity - booked) };
        });
        return {
          slotStart,
          capacity: Math.min(...counts.map((count) => count.capacity)),
          booked: Math.max(...counts.map((count) => count.booked)),
          remaining: Math.min(...counts.map((count) => count.remaining)),
          overridden: halfHourSlots.some((subSlotStart) =>
            capacityOverrides.some((item) => item.slotStartMinutes === subSlotStart)
          )
        };
      }),
    [appointments, capacityOverrides, displaySlotMinutes, displaySlots, staff]
  );

  function updateLocal(appointmentId: string, changes: Partial<ScheduleTimelineAppointment>) {
    setAppointments((current) =>
      {
        const next = current.map((appointment) =>
          appointment.id === appointmentId ? { ...appointment, ...changes } : appointment
        );
        appointmentsRef.current = next;
        return next;
      }
    );
  }

  async function persist(appointment: ScheduleTimelineAppointment) {
    setSavingIds((current) => [...current, appointment.id]);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/appointments/${appointment.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          startMinutes: appointmentMinutes(appointment.scheduledAt),
          durationMinutes: appointment.durationMinutes,
          staffKey: appointment.staffKey,
          staffName: appointment.staffName,
          updatedAt: appointment.updatedAt
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        appointment?: {
          scheduledAt: string;
          durationMinutes: number;
          staffKey?: string;
          staffName: string;
          updatedAt: string;
        };
      };
      if (!response.ok || !payload.appointment) {
        throw new Error(payload.error || "予約を更新できませんでした。");
      }
      updateLocal(appointment.id, payload.appointment);
      setMessage({ tone: "success", text: "予約時間を更新しました。" });
      router.refresh();
    } catch (error) {
      if (snapshotRef.current?.id === appointment.id) {
        updateLocal(appointment.id, snapshotRef.current);
      }
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "予約を更新できませんでした。"
      });
    } finally {
      setSavingIds((current) => current.filter((id) => id !== appointment.id));
      snapshotRef.current = null;
    }
  }

  function addManualAppointment(appointment: ManualAppointmentCreated) {
    const next = [...appointmentsRef.current, appointment].sort(
      (left, right) => new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime()
    );
    appointmentsRef.current = next;
    setAppointments(next);
    setMessage({ tone: "success", text: "手動予約を登録しました。" });
    router.refresh();
  }

  function releasePointer(event: React.PointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function finishPointerInteraction(event: React.PointerEvent<HTMLElement>, cancelled = false) {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    interactionRef.current = null;
    releasePointer(event);

    if (cancelled) {
      if (snapshotRef.current?.id === interaction.appointmentId) {
        updateLocal(interaction.appointmentId, snapshotRef.current);
      }
      snapshotRef.current = null;
      if (interaction.moved) lastDragEndedAtRef.current = Date.now();
      return;
    }

    if (!interaction.moved) {
      snapshotRef.current = null;
      return;
    }
    lastDragEndedAtRef.current = Date.now();
    const current = appointmentsRef.current.find(
      (appointment) => appointment.id === interaction.appointmentId
    );
    if (current) void persist(current);
  }

  function pointerStart(
    event: React.PointerEvent<HTMLElement>,
    appointment: ScheduleTimelineAppointment,
    mode: "move" | "resize"
  ) {
    if (!isAppointmentActive(appointment) || savingIds.includes(appointment.id)) return;
    if (event.button !== 0) return;
    if (interactionRef.current) {
      const stale = interactionRef.current;
      if (snapshotRef.current?.id === stale.appointmentId) {
        updateLocal(stale.appointmentId, snapshotRef.current);
      }
      interactionRef.current = null;
      snapshotRef.current = null;
    }
    if (event.pointerType !== "touch") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    snapshotRef.current = { ...appointment };
    interactionRef.current = {
      appointmentId: appointment.id,
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      mode,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originStartMinutes: appointmentMinutes(appointment.scheduledAt),
      originDurationMinutes: appointment.durationMinutes,
      originStaffKey: appointment.staffKey,
      originStaffName: appointment.staffName,
      moved: false
    };
  }

  function pointerMove(event: React.PointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    if (interaction.pointerType !== "touch" && (event.buttons & 1) === 0) {
      finishPointerInteraction(event);
      return;
    }
    const deltaPixels = event.clientX - interaction.originClientX;
    const deltaY = event.clientY - interaction.originClientY;

    if (interaction.pointerType === "touch" && !interaction.moved) {
      const horizontalDistance = Math.abs(deltaPixels);
      const verticalDistance = Math.abs(deltaY);
      if (verticalDistance >= TOUCH_SCROLL_THRESHOLD && verticalDistance > horizontalDistance) {
        interactionRef.current = null;
        snapshotRef.current = null;
        return;
      }
      if (horizontalDistance < TOUCH_DRAG_THRESHOLD || horizontalDistance <= verticalDistance) return;
      event.currentTarget.setPointerCapture(event.pointerId);
    } else if (!interaction.moved && Math.abs(deltaPixels) <= MOUSE_DRAG_THRESHOLD) {
      return;
    }

    if (!interaction.moved) {
      interaction.moved = true;
    }
    event.preventDefault();
    const deltaMinutes = snapMinutes(deltaPixels / pixelsPerMinute);
    const current = appointmentsRef.current.find((appointment) => appointment.id === interaction.appointmentId);
    if (!current) return;

    if (interaction.mode === "resize") {
      const durationMinutes = clamp(
        interaction.originDurationMinutes + deltaMinutes,
        SCHEDULE_SNAP_MINUTES,
        SCHEDULE_END_MINUTES - interaction.originStartMinutes
      );
      updateLocal(current.id, { durationMinutes });
      return;
    }

    const startMinutes = clamp(
      interaction.originStartMinutes + deltaMinutes,
      SCHEDULE_START_MINUTES,
      SCHEDULE_END_MINUTES - current.durationMinutes
    );
    const target = document
      .elementsFromPoint(event.clientX, event.clientY)
      .find((element) => element instanceof HTMLElement && element.dataset.staffName) as HTMLElement | undefined;
    const staffKey = target?.dataset.staffKey || interaction.originStaffKey;
    const staffName = target?.dataset.staffName || interaction.originStaffName;
    const hour = Math.floor(startMinutes / 60);
    const minute = startMinutes % 60;
    updateLocal(current.id, {
      scheduledAt: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`,
      staffKey,
      staffName
    });
  }

  function pointerEnd(event: React.PointerEvent<HTMLElement>) {
    finishPointerInteraction(event);
  }

  function pointerCancel(event: React.PointerEvent<HTMLElement>) {
    finishPointerInteraction(event, true);
  }

  async function keyboardMove(
    appointment: ScheduleTimelineAppointment,
    event: React.KeyboardEvent<HTMLButtonElement>
  ) {
    if (!isAppointmentActive(appointment) || savingIds.includes(appointment.id)) return;
    const assignedStaff = resolveScheduleStaffIdentity(appointment, staff);
    const staffIndex = assignedStaff ? staff.findIndex((member) => member.key === assignedStaff.key) : -1;
    const startMinutes = appointmentMinutes(appointment.scheduledAt);
    let nextStart = startMinutes;
    let nextDuration = appointment.durationMinutes;
    let nextStaffKey = assignedStaff?.key ?? appointment.staffKey;
    let nextStaff = appointment.staffName;

    if (event.key === "Enter") {
      event.preventDefault();
      router.push(`/admin/appointments/${appointment.id}`);
      return;
    } else if (event.key === "ArrowLeft") {
      if (event.shiftKey) nextDuration = Math.max(SCHEDULE_SNAP_MINUTES, nextDuration - SCHEDULE_SNAP_MINUTES);
      else nextStart = Math.max(SCHEDULE_START_MINUTES, nextStart - SCHEDULE_SNAP_MINUTES);
    } else if (event.key === "ArrowRight") {
      if (event.shiftKey) nextDuration = Math.min(SCHEDULE_END_MINUTES - nextStart, nextDuration + SCHEDULE_SNAP_MINUTES);
      else nextStart = Math.min(SCHEDULE_END_MINUTES - nextDuration, nextStart + SCHEDULE_SNAP_MINUTES);
    } else if (event.key === "ArrowUp" && staffIndex > 0) {
      nextStaffKey = staff[staffIndex - 1].key;
      nextStaff = staff[staffIndex - 1].name;
    } else if (event.key === "ArrowDown" && staffIndex < staff.length - 1) {
      nextStaffKey = staff[staffIndex + 1].key;
      nextStaff = staff[staffIndex + 1].name;
    } else {
      return;
    }

    event.preventDefault();
    snapshotRef.current = { ...appointment };
    const hour = Math.floor(nextStart / 60);
    const minute = nextStart % 60;
    const updated = {
      ...appointment,
      scheduledAt: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`,
      durationMinutes: nextDuration,
      staffKey: nextStaffKey,
      staffName: nextStaff
    };
    updateLocal(appointment.id, updated);
    await persist(updated);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[color:var(--lien-primary)]">日別シフト表</p>
          <h2 className="mt-1 text-xl font-semibold text-[color:var(--lien-ink)]">{dateLabel}</h2>
          <p className="mt-1 text-xs leading-5 text-[color:var(--lien-muted)]">予約をドラッグして移動、右端を引いて施術時間を変更できます。15分単位で保存されます。</p>
        </div>
        <div className="flex flex-col items-start gap-3 lg:items-end">
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <BookingCapacityEditor
              date={date}
              dateLabel={dateLabel}
              staff={staff}
              overrides={capacityOverrides}
              onSaved={(nextOverrides) => {
                setCapacityOverrides(nextOverrides);
                setMessage({ tone: "success", text: "時間帯ごとの受付数を保存しました。" });
                router.refresh();
              }}
            />
            <ManualAppointmentDialog
              date={date}
              customers={customers}
              staff={staff}
              onCreated={addManualAppointment}
            />
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold lg:justify-end">
            {(Object.keys(BOOKING_PROVIDERS) as Array<keyof typeof BOOKING_PROVIDERS>).map((key) => {
              const provider = BOOKING_PROVIDERS[key];
              return (
                <span key={key} className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--lien-border)] bg-white px-2.5 py-1.5 text-[color:var(--lien-muted)]">
                  <span className={`grid h-5 min-w-5 place-items-center rounded px-1 text-[10px] ${provider.className}`}>{provider.symbol}</span>
                  {provider.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {message ? (
        <div role="status" className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${message.tone === "error" ? "border-[#edc2bd] bg-[#fff1ef] text-[#884039]" : "border-[#bed9ca] bg-[#edf8f1] text-[#315d47]"}`}>
          {message.tone === "error" ? <AlertCircle className="h-4 w-4 shrink-0" /> : null}
          {message.text}
        </div>
      ) : null}

      <div
        ref={scheduleTableRef}
        className="w-full overflow-hidden rounded-2xl border border-[color:var(--lien-border)] bg-white shadow-sm"
      >
        <div className="w-full">
          <div className="grid border-b border-[color:var(--lien-border)] bg-[#fbf8f3]" style={{ gridTemplateColumns: `${labelWidth}px minmax(0, 1fr)` }}>
            <div className="flex items-center border-r border-[color:var(--lien-border)] bg-[#fbf8f3] px-2 text-[10px] font-semibold leading-4 text-[color:var(--lien-muted)] sm:px-4 sm:text-xs">スタッフ / 受付可能数</div>
            <div className="relative h-11 border-b border-[color:var(--lien-border)]">
              {timeTicks.map((minutes, index) => (
                <span
                  key={minutes}
                  className={`absolute top-3 whitespace-nowrap text-[10px] font-semibold tabular-nums text-[color:var(--lien-ink)] sm:text-xs ${
                    index === 0 ? "" : index === timeTicks.length - 1 ? "-translate-x-full" : "-translate-x-1/2"
                  }`}
                  style={{
                    left:
                      index === 0
                        ? 4
                        : index === timeTicks.length - 1
                          ? timelineWidth - 4
                          : (minutes - SCHEDULE_START_MINUTES) * pixelsPerMinute
                  }}
                >
                  {minutesLabel(minutes)}
                </span>
              ))}
            </div>
            <div className="grid border-r border-[color:var(--lien-border)] bg-[#fbf8f3] text-[9px] font-semibold leading-3 text-[color:var(--lien-muted)] sm:text-[11px]">
              <span className="flex h-8 items-center px-2 sm:px-4">予約 / 受付</span>
              <span className="flex h-8 items-center border-t border-[color:var(--lien-border)] px-2 sm:px-4">残り受付数</span>
            </div>
            <div>
              <div className="flex h-8">
                {slotCounts.map((slot) => (
                  <span key={`booked-${slot.slotStart}`} className={`grid place-items-center border-r border-[color:var(--lien-border)] text-[9px] font-semibold tabular-nums sm:text-[11px] ${slot.overridden ? "bg-[color:var(--lien-primary-soft)] text-[color:var(--lien-primary-dark)]" : "text-[color:var(--lien-ink)]"}`} style={{ width: displaySlotMinutes * pixelsPerMinute }} title={`${minutesLabel(slot.slotStart)} 予約${slot.booked}件 / 受付${slot.capacity}件${slot.overridden ? "（手動設定）" : "（自動）"}`}>
                    {slot.booked}/{slot.capacity}
                  </span>
                ))}
              </div>
              <div className="flex h-8 border-t border-[color:var(--lien-border)]">
                {slotCounts.map((slot) => (
                  <span key={`remaining-${slot.slotStart}`} className={`grid place-items-center border-r border-[color:var(--lien-border)] text-[9px] font-bold tabular-nums sm:text-[11px] ${slot.remaining === 0 ? "bg-[#f9e8e5] text-[#9d4038]" : "text-[#41684f]"}`} style={{ width: displaySlotMinutes * pixelsPerMinute }} title={`${minutesLabel(slot.slotStart)} 残り${slot.remaining}件 / ${slot.capacity}件`}>
                    {slot.remaining}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {staff.map((member) => {
            const rows = appointmentsByStaff.get(member.name) ?? [];
            const activeRows = rows.map((appointment) => ({
              ...appointment,
              startMinutes: appointmentMinutes(appointment.scheduledAt),
              durationMinutes: appointment.durationMinutes
            }));
            const laneLayout = assignScheduleLanes(activeRows);
            const rowHeight = Math.max(74, ROW_PADDING * 2 + laneLayout.laneCount * EVENT_HEIGHT + Math.max(0, laneLayout.laneCount - 1) * EVENT_GAP);

            return (
              <div key={member.key} className="grid border-b border-[color:var(--lien-border)] last:border-b-0" style={{ gridTemplateColumns: `${labelWidth}px minmax(0, 1fr)`, minHeight: rowHeight }}>
                <div className="z-20 flex min-w-0 items-center border-r border-[color:var(--lien-border)] bg-white px-1.5 py-3 sm:px-3">
                  <Link href={`/admin/staff/${member.key}`} className="group min-w-0 rounded-xl px-1 py-1.5 transition hover:bg-[color:var(--lien-surface-soft)] sm:px-2">
                    <span className="block truncate text-[11px] font-semibold text-[color:var(--lien-ink)] group-hover:text-[color:var(--lien-primary)] sm:text-sm">{member.name}</span>
                    <span className="mt-1 block truncate text-[9px] text-[color:var(--lien-muted)] sm:text-[10px]">受付: {member.maxConcurrentAppointments}</span>
                  </Link>
                </div>
                <div className="relative min-w-0 overflow-hidden bg-white" data-staff-key={member.key} data-staff-name={member.name} style={{ height: rowHeight }}>
                  <div className="pointer-events-none absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,#f5f1ec_0,#f5f1ec_6px,#fbf8f3_6px,#fbf8f3_12px)]" style={{ width: Math.max(0, member.workStartMinutes - SCHEDULE_START_MINUTES) * pixelsPerMinute }} />
                  <div className="pointer-events-none absolute inset-y-0 right-0 bg-[repeating-linear-gradient(135deg,#f5f1ec_0,#f5f1ec_6px,#fbf8f3_6px,#fbf8f3_12px)]" style={{ width: Math.max(0, SCHEDULE_END_MINUTES - member.workEndMinutes) * pixelsPerMinute }} />
                  {displaySlots.map((slotStart) => (
                    <span key={`${member.key}-${slotStart}`} aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-l border-[#ddd4ca]" style={{ left: (slotStart - SCHEDULE_START_MINUTES) * pixelsPerMinute }} />
                  ))}
                  {isToday && currentMinutes !== null && currentMinutes >= SCHEDULE_START_MINUTES && currentMinutes <= SCHEDULE_END_MINUTES ? (
                    <span aria-label="現在時刻" className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-[#c24842]" style={{ left: (currentMinutes - SCHEDULE_START_MINUTES) * pixelsPerMinute }}>
                      <span className="absolute -left-1.5 -top-1 h-3 w-3 rounded-full bg-[#c24842]" />
                    </span>
                  ) : null}
                  {rows.length === 0 ? <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-[#b8ada3]">予約なし</span> : null}
                  {rows.map((appointment) => {
                    const startMinutes = appointmentMinutes(appointment.scheduledAt);
                    const lane = laneLayout.lanes.get(appointment.id) ?? 0;
                    const provider = BOOKING_PROVIDERS[inferBookingProvider(appointment)];
                    const saving = savingIds.includes(appointment.id);
                    const eventLeft = (startMinutes - SCHEDULE_START_MINUTES) * pixelsPerMinute + 1;
                    const eventWidth = Math.max(
                      10,
                      Math.min(
                        appointment.durationMinutes * pixelsPerMinute - 2,
                        timelineWidth - eventLeft - 1
                      )
                    );
                    return (
                      <button
                        key={appointment.id}
                        type="button"
                        className={`group absolute z-10 overflow-hidden rounded-xl border px-2 py-1.5 text-left text-[11px] leading-4 shadow-sm outline-none transition hover:z-20 hover:shadow-md focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[color:var(--lien-primary)] ${statusClasses(appointment.status)} ${isAppointmentActive(appointment) ? "cursor-grab active:cursor-grabbing" : "cursor-default opacity-70"}`}
                        style={{
                          left: eventLeft,
                          top: ROW_PADDING + lane * (EVENT_HEIGHT + EVENT_GAP),
                          width: eventWidth,
                          height: EVENT_HEIGHT,
                          touchAction: "pan-y pinch-zoom"
                        }}
                        title={`${appointmentRange(appointment)} ${appointment.customerName} / ${provider.label}。ダブルクリックで予約・会計を開く`}
                        aria-label={`${appointment.customerName} ${appointmentRange(appointment)}。ダブルクリックまたはEnterキーで予約・会計を開く。矢印キーで15分移動、Shiftと左右キーで長さを変更`}
                        onPointerDown={(event) => pointerStart(event, appointment, "move")}
                        onPointerMove={pointerMove}
                        onPointerUp={pointerEnd}
                        onPointerCancel={pointerCancel}
                        onLostPointerCapture={(event) => finishPointerInteraction(event)}
                        onKeyDown={(event) => void keyboardMove(appointment, event)}
                        onDoubleClick={() => {
                          if (Date.now() - lastDragEndedAtRef.current < 500) return;
                          router.push(`/admin/appointments/${appointment.id}`);
                        }}
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className={`grid h-5 min-w-5 shrink-0 place-items-center rounded px-1 text-[9px] font-bold ${provider.className}`} title={provider.label}>{provider.symbol}</span>
                          {eventWidth >= 68 ? <span className="truncate font-bold tabular-nums">{appointmentRange(appointment)}</span> : null}
                          {eventWidth >= 42 ? (saving ? <LoaderCircle className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin" /> : <GripVertical className="ml-auto h-3.5 w-3.5 shrink-0 opacity-45" />) : null}
                        </span>
                        {eventWidth >= 96 ? <span className="block truncate font-semibold">{appointment.customerName} ・ {appointment.menu ?? "メニュー未記載"}</span> : null}
                        {isAppointmentActive(appointment) ? (
                          <span
                            role="presentation"
                            className="absolute inset-y-0 right-0 flex w-3 cursor-ew-resize items-center justify-center border-l border-black/10 bg-white/35 opacity-60 transition group-hover:opacity-100"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              pointerStart(event, appointment, "resize");
                            }}
                            onDoubleClick={(event) => event.stopPropagation()}
                            onPointerMove={pointerMove}
                            onPointerUp={pointerEnd}
                            onPointerCancel={pointerCancel}
                            onLostPointerCapture={(event) => finishPointerInteraction(event)}
                          >
                            <MoveHorizontal className="h-2.5 w-2.5" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
