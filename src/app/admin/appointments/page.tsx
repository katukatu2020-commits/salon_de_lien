import Link from "next/link";
import {
  CalendarCheck2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  JapaneseYen,
  MailCheck,
  Scissors,
  UserRound
} from "lucide-react";
import { GmailReservationSync } from "@/components/appointments/gmail-reservation-sync";
import { StaffScheduleTimeline } from "@/components/appointments/staff-schedule-timeline";
import { EmptyState, LienCard, MetricCard, PageHeader, StatusBadge } from "@/components/lien/lien-ui";
import { BrandVisual } from "@/components/lien/brand-visual";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";
import { OWNER_DASHBOARD_SIMULATION_SOURCE } from "@/lib/reports/owner-dashboard";
import { FREE_STAFF, normalizeSalonStaffName, salonStaffKey, SALON_STAFF } from "@/lib/salon/staff";

export const dynamic = "force-dynamic";

type AppointmentsPageProps = {
  searchParams?: {
    month?: string;
    date?: string;
  };
};

function currentMonthParam() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit"
  }).format(new Date());
}

function normalizeMonth(value?: string) {
  if (!value || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(value)) return currentMonthParam();
  return value;
}

function monthShift(month: string, amount: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${year}年${monthNumber}月`;
}

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function timeLabel(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function dateTimeLabel(value: Date) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function normalizeSelectedDate(value: string | undefined, month: string) {
  if (!value || !/^20\d{2}-(0[1-9]|1[0-2])-([012]\d|3[01])$/.test(value)) return null;
  return value.startsWith(`${month}-`) ? value : null;
}

function selectedDateLabel(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${value}T12:00:00+09:00`));
}

function appointmentMinuteOfDay(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

function noteLine(note: string | null, label: string) {
  return note?.split("\n").find((line) => line.startsWith(`${label}: `))?.slice(label.length + 2) ?? null;
}

function appointmentDurationMinutes(appointment: { durationMinutes: number | null; note: string | null }) {
  const noteMinutes = Number(noteLine(appointment.note, "所要時間")?.replace(/\D/g, ""));
  return appointment.durationMinutes ?? (Number.isInteger(noteMinutes) && noteMinutes > 0 ? noteMinutes : 60);
}

function appointmentTimeRange(appointment: { scheduledAt: Date; durationMinutes: number | null; note: string | null }) {
  const endAt = new Date(appointment.scheduledAt.getTime() + appointmentDurationMinutes(appointment) * 60_000);
  return `${timeLabel(appointment.scheduledAt)}〜${timeLabel(endAt)}`;
}

function statusTone(status: string): "success" | "warning" | "danger" | "highlight" | "default" {
  if (status === "予約確定") return "success";
  if (status === "キャンセル" || status === "無断キャンセル") return "danger";
  if (status === "変更受付") return "warning";
  if (status === "仮予約") return "highlight";
  return "default";
}

function statusClasses(status: string) {
  if (status === "予約確定") return "border-[#cbdcc8] bg-[#eef5ed] text-[#405d41]";
  if (status === "キャンセル" || status === "無断キャンセル") return "border-[#edc2bd] bg-[#fff1ef] text-[#884039]";
  if (status === "変更受付") return "border-[#ead09a] bg-[#fff8e8] text-[#7c4f12]";
  return "border-[#ead0c7] bg-[#fff2ed] text-[color:var(--lien-primary-dark)]";
}

function calendarCells(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cellCount = firstWeekday + daysInMonth <= 35 ? 35 : 42;

  return Array.from({ length: cellCount }, (_, index) => {
    const nominal = new Date(Date.UTC(year, monthNumber - 1, index - firstWeekday + 1));
    return {
      key: `${nominal.getUTCFullYear()}-${String(nominal.getUTCMonth() + 1).padStart(2, "0")}-${String(nominal.getUTCDate()).padStart(2, "0")}`,
      day: nominal.getUTCDate(),
      currentMonth: nominal.getUTCMonth() === monthNumber - 1
    };
  });
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) throw new Error("店舗所属が設定されていません。");
  const month = normalizeMonth(searchParams?.month);
  const selectedDate = normalizeSelectedDate(searchParams?.date, month);
  const nextMonth = monthShift(month, 1);
  const monthStart = new Date(`${month}-01T00:00:00+09:00`);
  const monthEnd = new Date(`${nextMonth}-01T00:00:00+09:00`);
  const [appointments, latestGmailAppointment, bookingSettings, customerOptions, capacityOverrides] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: monthStart, lt: monthEnd },
        customer: { organizationId: session.organizationId, deletedAt: null },
        OR: [{ source: null }, { source: { not: OWNER_DASHBOARD_SIMULATION_SOURCE } }]
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } }
      },
      orderBy: { scheduledAt: "asc" }
    }),
    prisma.appointment.findFirst({
      where: {
        source: { startsWith: "gmail:" },
        customer: { organizationId: session.organizationId, deletedAt: null }
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true }
    }),
    prisma.staffBookingSetting.findMany({
      where: { organizationId: session.organizationId }
    }),
    prisma.customer.findMany({
      where: { organizationId: session.organizationId, deletedAt: null, storeHiddenAt: null },
      orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
      select: { id: true, name: true, phone: true }
    }),
    selectedDate
      ? prisma.bookingCapacityOverride.findMany({
          where: { organizationId: session.organizationId, dateKey: selectedDate },
          orderBy: { slotStartMinutes: "asc" },
          select: { slotStartMinutes: true, capacity: true }
        })
      : Promise.resolve([])
  ]);
  const todayKey = dateKey(new Date());
  const cells = calendarCells(month);
  const appointmentsByDate = new Map<string, typeof appointments>();

  for (const appointment of appointments) {
    const key = dateKey(appointment.scheduledAt);
    appointmentsByDate.set(key, [...(appointmentsByDate.get(key) ?? []), appointment]);
  }

  const selectedAppointments = selectedDate ? appointmentsByDate.get(selectedDate) ?? [] : [];
  const mobileAppointments = selectedDate ? selectedAppointments : appointments;
  const bookingSettingByKey = new Map(bookingSettings.map((setting) => [setting.staffKey, setting]));
  const timelineStaff = [...SALON_STAFF, FREE_STAFF].map((staff) => {
    const setting = bookingSettingByKey.get(staff.key);
    return {
      key: staff.key,
      name: staff.name,
      role: staff.role,
      maxConcurrentAppointments: setting?.maxConcurrentAppointments ?? (staff.key === "tanizaki" ? 2 : 1),
      workStartMinutes: setting?.workStartMinutes ?? 600,
      workEndMinutes: setting?.workEndMinutes ?? 1140
    };
  });

  function calendarHref(date: string) {
    const targetMonth = date.slice(0, 7);
    return `/admin/appointments?month=${targetMonth}&date=${date}#staff-schedule`;
  }

  const activeAppointments = appointments.filter((appointment) => appointment.status !== "キャンセル" && appointment.status !== "無断キャンセル");

  return (
    <div className="grid w-full max-w-none gap-6">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            Reservation Calendar
          </span>
        }
        title="予約カレンダー"
        description="Gmailへ届いた新着予約メールを自動で予約台帳へ反映し、当日の来店予定と月間の予約状況を確認します。"
        secondaryAction={
          <Link href="/admin/customers" className="lien-button-secondary px-4">
            顧客一覧へ戻る
          </Link>
        }
        visual={
          <BrandVisual
            variant="workflow"
            className="h-full min-h-40"
            imageClassName="object-[28%_56%]"
            sizes="(max-width: 1023px) 100vw, 352px"
          />
        }
      />

      <section className="max-w-sm">
        <MetricCard label="今月の予約件数" value={activeAppointments.length} unit="件" icon={CalendarCheck2} helper="キャンセルを除く予約" />
      </section>

      <LienCard>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <Link
              href={`/admin/appointments?month=${monthShift(month, -1)}`}
              className="lien-icon-button text-[color:var(--lien-ink)]"
              aria-label="前の月"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-36 text-center">
              <p className="text-xs font-semibold text-[color:var(--lien-muted)]">表示月</p>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--lien-ink)]">{monthLabel(month)}</h2>
            </div>
            <Link
              href={`/admin/appointments?month=${monthShift(month, 1)}`}
              className="lien-icon-button text-[color:var(--lien-ink)]"
              aria-label="次の月"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href={`/admin/appointments?month=${currentMonthParam()}`} className="lien-button-secondary ml-1 h-10 min-h-10 px-3 text-xs">
              今月
            </Link>
          </div>
        </div>

        <div className="mt-5 hidden overflow-hidden rounded-2xl border border-[color:var(--lien-border)] md:block">
          <div className="grid grid-cols-7 border-b border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] text-center text-xs font-semibold text-[color:var(--lien-muted)]">
            {["日", "月", "火", "水", "木", "金", "土"].map((label, index) => (
              <div key={label} className={`py-3 ${index === 0 ? "text-[#b85d55]" : index === 6 ? "text-[#55758d]" : ""}`}>
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-[color:var(--lien-border)] gap-px">
            {cells.map((cell) => {
              const rows = appointmentsByDate.get(cell.key) ?? [];
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDate;

              return (
                <div key={cell.key} className={`min-h-36 bg-white p-2 ${cell.currentMonth ? "" : "bg-[#fbf8f3] text-[#b0a49a]"} ${isSelected ? "ring-2 ring-inset ring-[color:var(--lien-primary)]" : ""}`}>
                  <div className="flex items-center justify-between">
                    <Link
                      href={calendarHref(cell.key)}
                      className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold transition hover:bg-[color:var(--lien-primary-soft)] ${
                        isSelected
                          ? "bg-[color:var(--lien-primary)] text-white"
                          : isToday
                            ? "bg-[color:var(--lien-primary-soft)] text-[color:var(--lien-primary-dark)] ring-2 ring-inset ring-[color:var(--lien-primary)]"
                            : ""
                      }`}
                      aria-label={`${cell.key}の稼働表を表示${isToday ? "（今日）" : ""}`}
                    >
                      {cell.day}
                    </Link>
                    {isToday ? (
                      <span className="rounded-full bg-[color:var(--lien-primary-soft)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--lien-primary-dark)]">今日</span>
                    ) : rows.length > 0 ? (
                      <span className="text-[10px] font-semibold text-[color:var(--lien-muted)]">{rows.length}件</span>
                    ) : null}
                  </div>
                  <div className="mt-2 grid gap-1.5">
                    {rows.slice(0, 3).map((appointment) => (
                      <Link
                        key={appointment.id}
                        href={`/admin/appointments/${appointment.id}`}
                        className={`block rounded-lg border px-2 py-1.5 text-[10px] leading-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${statusClasses(appointment.status)}`}
                      >
                        <span className="font-semibold tabular-nums">{timeLabel(appointment.scheduledAt)}</span>
                        <span className="ml-1 font-semibold">{appointment.customer.name}</span>
                        <span className="ml-1 opacity-80">・{appointmentDurationMinutes(appointment)}分</span>
                        <span className="block truncate opacity-80">{appointment.menu ?? "メニュー未記載"}</span>
                        <span className="block truncate opacity-80">担当: {appointment.staffName ?? noteLine(appointment.note, "担当") ?? "フリー"}</span>
                      </Link>
                    ))}
                    {rows.length > 3 ? <p className="px-2 text-[10px] font-semibold text-[color:var(--lien-muted)]">ほか{rows.length - 3}件</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[color:var(--lien-border)] bg-white md:hidden">
          <div className="grid grid-cols-7 bg-[color:var(--lien-surface-soft)] text-center text-[10px] font-semibold text-[color:var(--lien-muted)]">
            {["日", "月", "火", "水", "木", "金", "土"].map((label) => <span key={label} className="py-2">{label}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-px bg-[color:var(--lien-border)]">
            {cells.map((cell) => {
              const rows = appointmentsByDate.get(cell.key) ?? [];
              const active = cell.key === selectedDate;
              const isToday = cell.key === todayKey;
              return (
                <Link
                  key={cell.key}
                  href={calendarHref(cell.key)}
                  className={`relative grid min-h-12 place-items-center bg-white text-xs font-semibold transition hover:z-10 hover:bg-[color:var(--lien-surface-soft)] active:scale-95 ${cell.currentMonth ? "text-[color:var(--lien-ink)]" : "text-[#b7aca3]"} ${active ? "bg-[#8f4f42] text-white" : isToday ? "bg-[color:var(--lien-primary-soft)] text-[color:var(--lien-primary-dark)] ring-2 ring-inset ring-[color:var(--lien-primary)]" : ""}`}
                  aria-label={`${cell.key}の稼働表を表示${isToday ? "（今日）" : ""}`}
                >
                  {isToday ? <span className={`absolute top-0.5 text-[8px] font-bold ${active ? "text-white" : "text-[color:var(--lien-primary-dark)]"}`}>今日</span> : null}
                  {cell.day}
                  {rows.length > 0 ? <span className={`absolute bottom-1 h-1 w-1 rounded-full ${active ? "bg-white" : "bg-[#8f4f42]"}`} /> : null}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:hidden">
          {mobileAppointments.length === 0 ? (
            <EmptyState icon={CalendarDays} title="この月の予約はありません" description="新しい予約メールを受信すると、自動で予約台帳へ追加されます。" />
          ) : (
            mobileAppointments.map((appointment) => {
              const staffName = appointment.staffName ?? noteLine(appointment.note, "担当") ?? "フリー";
              return (
                <Link key={appointment.id} href={`/admin/appointments/${appointment.id}`} className="lien-action-card rounded-[18px] border bg-white p-4 pr-12">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--lien-primary-dark)]">{dateTimeLabel(appointment.scheduledAt)}</p>
                      <p className="mt-1 text-base font-semibold text-[color:var(--lien-ink)]">{appointment.customer.name}</p>
                    </div>
                    <StatusBadge tone={statusTone(appointment.status)}>{appointment.status}</StatusBadge>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs leading-5 text-[color:var(--lien-muted)]">
                    <p className="flex items-center gap-2"><Scissors className="h-4 w-4 shrink-0" />{appointment.menu ?? "メニュー未記載"}</p>
                    <p className="flex items-center gap-2"><UserRound className="h-4 w-4 shrink-0" />担当: {staffName}</p>
                    <p className="flex items-center gap-2"><Clock3 className="h-4 w-4 shrink-0" />{appointmentTimeRange(appointment)}（{appointmentDurationMinutes(appointment)}分）</p>
                    {appointment.estimatedPrice !== null ? <p className="flex items-center gap-2"><JapaneseYen className="h-4 w-4 shrink-0" />{appointment.estimatedPrice.toLocaleString("ja-JP")}円</p> : null}
                    <p className="flex items-center gap-2"><MailCheck className="h-4 w-4 shrink-0" />{appointment.source?.startsWith("gmail:") ? "Gmail取込" : appointment.source ?? "予約台帳"}</p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </LienCard>

      {selectedDate ? (
        <section id="staff-schedule" tabIndex={-1} className="scroll-mt-20 outline-none md:scroll-mt-6">
          <LienCard>
            <StaffScheduleTimeline
              date={selectedDate}
              dateLabel={selectedDateLabel(selectedDate)}
              staff={timelineStaff}
              customers={customerOptions}
              appointments={selectedAppointments.map((appointment) => {
                const normalizedStaff = normalizeSalonStaffName(
                  appointment.staffName ?? noteLine(appointment.note, "担当")
                );
                const assignedStaff = normalizedStaff && salonStaffKey(normalizedStaff) ? normalizedStaff : FREE_STAFF.name;
                return {
                  id: appointment.id,
                  customerId: appointment.customerId,
                  customerName: appointment.customer.name,
                  scheduledAt: appointment.scheduledAt.toISOString(),
                  durationMinutes: appointmentDurationMinutes(appointment),
                  menu: appointment.menu,
                  staffName: assignedStaff,
                  status: appointment.status,
                  source: appointment.source,
                  bookingProvider: appointment.bookingProvider,
                  updatedAt: appointment.updatedAt.toISOString()
                };
              })}
              isToday={selectedDate === todayKey}
              currentMinutes={selectedDate === todayKey ? appointmentMinuteOfDay(new Date()) : null}
              capacityOverrides={capacityOverrides}
            />
          </LienCard>
        </section>
      ) : null}

      <GmailReservationSync
        latestImportedAt={latestGmailAppointment?.updatedAt.toISOString() ?? null}
      />
    </div>
  );
}
