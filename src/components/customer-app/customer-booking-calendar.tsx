"use client";

import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Scissors
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CUSTOMER_BOOKING_MENUS, minutesText } from "@/lib/appointments/customer-booking";

type AvailabilityDay = { date: string; available: boolean; slots: number[] };
type AvailabilityResponse = {
  month: string;
  staffKey: string;
  menuKey: string;
  today: string;
  maximumDate: string;
  days: AvailabilityDay[];
  error?: string;
};
type StaffOption = { key: string; name: string; role: string };

const STAFF_GUIDE: Record<string, { strengths: string; message: string }> = {
  tanizaki: {
    strengths: "カット・パーマ・ストレート・カラー",
    message: "髪のお悩みを整理しながら、扱いやすさと再現性を大切にしたスタイルをご提案します。"
  },
  watanabe: {
    strengths: "似合わせカット・カラー・メンズ",
    message: "毎日のスタイリングが無理なく続くよう、髪質と生活に合わせて仕上げます。"
  },
  asano: {
    strengths: "カラー・ヘアケア・柔らかな質感",
    message: "色味と手触りのバランスを見ながら、自然で上品な仕上がりを一緒に考えます。"
  },
  kobayashi: {
    strengths: "女性らしいスタイル・アレンジ・ケア",
    message: "ご自宅でも整えやすい形と、気分が少し上がるスタイルづくりを大切にしています。"
  },
  kaori: {
    strengths: "ナチュラルスタイル・ヘッドスパ",
    message: "ゆったり過ごしていただける接客と、自然にまとまる仕上がりをご提案します。"
  },
  free: {
    strengths: "空いているスタイリストが担当",
    message: "ご希望の日時に対応できるスタイリストをサロン側でご案内します。"
  }
};

function toUtcDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

function dateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function addDays(date: string, amount: number) {
  const next = toUtcDate(date);
  next.setUTCDate(next.getUTCDate() + amount);
  return dateKey(next);
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC"
  }).format(toUtcDate(date));
}

function shortDateLabel(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC"
  }).format(toUtcDate(date));
}

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat("ja-JP", { weekday: "short", timeZone: "UTC" }).format(toUtcDate(date));
}

function weekRangeLabel(start: string) {
  return `${shortDateLabel(start)} 〜 ${shortDateLabel(addDays(start, 6))}`;
}

function staffInitial(name: string) {
  return name === "指名なし" ? "空" : name.replace(/\s/g, "").slice(0, 1);
}

function isMonday(date: string) {
  return toUtcDate(date).getUTCDay() === 1;
}

export function CustomerBookingCalendar({
  currentDate,
  defaultStaffKey,
  staff,
  upcoming
}: {
  currentDate: string;
  defaultStaffKey: string;
  staff: StaffOption[];
  upcoming: Array<{ id: string; scheduledAt: string; menu: string | null; staffName: string | null; status: string }>;
}) {
  const staffOptions = useMemo<StaffOption[]>(
    () => [{ key: "free", name: "指名なし", role: "担当者の指定なし" }, ...staff],
    [staff]
  );
  const [weekStart, setWeekStart] = useState(currentDate);
  const [staffKey, setStaffKey] = useState(defaultStaffKey);
  const [menuKey, setMenuKey] = useState<(typeof CUSTOMER_BOOKING_MENUS)[number]["key"]>("cut");
  const [availability, setAvailability] = useState<Record<string, AvailabilityDay>>({});
  const [maximumDate, setMaximumDate] = useState(addDays(currentDate, 90));
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ date: string; minutes: number; staffName: string; menu: string } | null>(null);

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const months = useMemo(() => [...new Set(weekDates.map((date) => date.slice(0, 7)))], [weekDates]);
  const menu = CUSTOMER_BOOKING_MENUS.find((item) => item.key === menuKey)!;
  const selectedStaff = staffOptions.find((member) => member.key === staffKey) ?? staffOptions[0];
  const selectedGuide = STAFF_GUIDE[selectedStaff.key] ?? STAFF_GUIDE.free;
  const times = useMemo(() => Array.from({ length: 17 }, (_, index) => 600 + index * 30), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setSelectedDate("");
    setSelectedMinutes(null);
    Promise.all(
      months.map(async (month) => {
        const response = await fetch(
          `/api/customer/appointments/availability?month=${encodeURIComponent(month)}&staff=${encodeURIComponent(staffKey)}&menu=${encodeURIComponent(menuKey)}`,
          { signal: controller.signal, cache: "no-store" }
        );
        const payload = await response.json() as AvailabilityResponse;
        if (!response.ok) throw new Error(payload.error ?? "空き状況を取得できませんでした。");
        return payload;
      })
    )
      .then((responses) => {
        const next: Record<string, AvailabilityDay> = {};
        for (const response of responses) {
          for (const day of response.days) next[day.date] = day;
        }
        setAvailability(next);
        if (responses[0]?.maximumDate) setMaximumDate(responses[0].maximumDate);
      })
      .catch((reason) => {
        if (reason instanceof Error && reason.name !== "AbortError") setError(reason.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [menuKey, months, staffKey]);

  function chooseStaff(nextStaffKey: string) {
    setStaffKey(nextStaffKey);
    setSuccess(null);
  }

  function chooseSlot(date: string, minutes: number) {
    setSelectedDate(date);
    setSelectedMinutes(minutes);
    setSuccess(null);
    setError("");
  }

  function unavailableSymbol(date: string, day: AvailabilityDay | undefined) {
    if (date < currentDate || date > maximumDate || isMonday(date)) return "－";
    return day ? "×" : "－";
  }

  async function submitBooking() {
    if (!selectedDate || selectedMinutes === null || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/customer/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffKey, menuKey, date: selectedDate, startMinutes: selectedMinutes })
      });
      const payload = await response.json() as { error?: string; appointment?: { staffName?: string | null } };
      if (!response.ok || !payload.appointment) throw new Error(payload.error ?? "予約を登録できませんでした。");
      setSuccess({
        date: selectedDate,
        minutes: selectedMinutes,
        staffName: payload.appointment.staffName ?? "フリー",
        menu: menu.name
      });
      setAvailability((current) => {
        const day = current[selectedDate];
        if (!day) return current;
        const slots = day.slots.filter((slot) => slot !== selectedMinutes);
        return { ...current, [selectedDate]: { ...day, slots, available: slots.length > 0 } };
      });
      setSelectedMinutes(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "予約を登録できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[24px] border border-[#e8ded2] bg-white p-5 shadow-sm sm:p-6">
        <div className="border-l-4 border-[#c7b8ad] pl-4">
          <p className="text-xs font-semibold text-[#8f4f42]">STEP 1</p>
          <h1 className="mt-1 text-xl font-semibold text-[#443a34] sm:text-2xl">メニューとスタイリストを選択</h1>
        </div>

        <label className="mt-5 grid max-w-xl gap-2 text-sm font-semibold text-[#4f463f]">
          <span className="flex items-center gap-2"><Scissors className="h-4 w-4 text-[#8f4f42]" />ご希望のメニュー</span>
          <select
            value={menuKey}
            onChange={(event) => { setMenuKey(event.target.value as typeof menuKey); setSuccess(null); }}
            className="h-12 rounded-xl border border-[#ddd4cc] bg-white px-4 text-base outline-none focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40"
          >
            {CUSTOMER_BOOKING_MENUS.map((item) => (
              <option key={item.key} value={item.key}>{item.name}（{item.durationMinutes}分・目安 {item.estimatedPrice.toLocaleString("ja-JP")}円）</option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible">
          {staffOptions.map((member) => {
            const selected = member.key === staffKey;
            return (
              <button
                key={member.key}
                type="button"
                onClick={() => chooseStaff(member.key)}
                className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition ${
                  selected
                    ? "border-[#cf667e] bg-[#fff8fa] text-[#bf3f61] shadow-sm ring-1 ring-[#cf667e]"
                    : "border-[#ddd8d3] bg-white text-[#504740] hover:bg-[#f8f3ee]"
                }`}
                aria-pressed={selected}
              >
                {selected ? <Check className="h-4 w-4" /> : null}
                {member.name}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 rounded-2xl border border-[#e8ded2] bg-[#fffdf9] p-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:p-5">
          <div className="flex items-center gap-4 border-[#e5ddd6] md:border-r md:pr-5">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#e9c9be] to-[#f6efe6] text-2xl font-semibold text-[#70443b] shadow-sm">
              {staffInitial(selectedStaff.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-[#382f2a]">{selectedStaff.name}</p>
              <p className="mt-1 text-xs leading-5 text-[#7c7168]">{selectedStaff.role}</p>
            </div>
          </div>
          <div className="md:pl-2">
            <p className="text-sm font-semibold text-[#443a34]">{selectedGuide.strengths}</p>
            <p className="mt-2 text-sm leading-7 text-[#6f6259]">{selectedGuide.message}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e8ded2] bg-white p-4 shadow-sm sm:p-6">
        <div className="border-l-4 border-[#c7b8ad] pl-4">
          <p className="text-xs font-semibold text-[#8f4f42]">STEP 2</p>
          <h2 className="mt-1 text-xl font-semibold text-[#443a34] sm:text-2xl">日時を選択</h2>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-[#f8f4ef] px-3 py-3 sm:px-5">
          <button
            type="button"
            disabled={weekStart <= currentDate}
            onClick={() => setWeekStart(addDays(weekStart, -7) < currentDate ? currentDate : addDays(weekStart, -7))}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-[#66584f] hover:bg-white disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">前の1週間</span>
          </button>
          <p className="text-center text-sm font-semibold tabular-nums text-[#382f2a] sm:text-base">{weekRangeLabel(weekStart)}</p>
          <button
            type="button"
            disabled={addDays(weekStart, 7) > maximumDate}
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-semibold text-[#66584f] hover:bg-white disabled:opacity-30"
          >
            <span className="hidden sm:inline">次の1週間</span><ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[#d9d2ca]">
          <div className="min-w-[620px] bg-[#d9d2ca]">
            <div className="grid grid-cols-[78px_repeat(7,minmax(72px,1fr))] gap-px">
              <div className="sticky left-0 z-20 grid min-h-16 place-items-center bg-[#f6f2ed] px-2 text-xs font-semibold text-[#7c7168]">時間</div>
              {weekDates.map((date) => {
                const weekday = weekdayLabel(date);
                const weekendClass = weekday === "日" ? "text-[#ba4c48]" : weekday === "土" ? "text-[#426db4]" : "text-[#382f2a]";
                return (
                  <div key={date} className={`grid min-h-16 place-items-center bg-white px-1 text-center ${weekendClass}`}>
                    <span className="text-sm font-semibold tabular-nums">{shortDateLabel(date)}</span>
                    <span className="text-xs font-semibold">（{weekday}）</span>
                  </div>
                );
              })}
            </div>

            {times.map((minutes) => (
              <div key={minutes} className="mt-px grid grid-cols-[78px_repeat(7,minmax(72px,1fr))] gap-px">
                <div className="sticky left-0 z-10 grid min-h-12 place-items-center bg-[#f8f6f3] px-2 text-sm font-semibold tabular-nums text-[#382f2a]">
                  {minutesText(minutes)}
                </div>
                {weekDates.map((date) => {
                  const day = availability[date];
                  const canBook = Boolean(day?.slots.includes(minutes));
                  const selected = selectedDate === date && selectedMinutes === minutes;
                  return (
                    <button
                      key={`${date}-${minutes}`}
                      type="button"
                      disabled={!canBook || loading}
                      onClick={() => chooseSlot(date, minutes)}
                      className={`grid min-h-12 place-items-center bg-white text-lg font-semibold transition ${
                        selected
                          ? "bg-[#cf667e] text-white"
                          : canBook
                            ? "text-[#df5474] hover:bg-[#fff0f4]"
                            : "cursor-default bg-[#f4f3f1] text-[#7d7772]"
                      }`}
                      aria-label={`${dateLabel(date)} ${minutesText(minutes)} ${canBook ? "予約可能" : "受付不可"}`}
                    >
                      {selected ? <Check className="h-5 w-5" /> : canBook ? "◎" : unavailableSymbol(date, day)}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-[#f6efe6] px-4 py-4 text-sm text-[#7c7168]">
            <Loader2 className="h-4 w-4 animate-spin" />空き状況を確認しています
          </div>
        ) : null}
        <p className="mt-4 text-xs leading-5 text-[#8b8178]">◎は予約可能、×は満席、－は定休日・営業時間外・受付期間外です。担当者とメニューに合わせて表示しています。</p>

        {selectedDate && selectedMinutes !== null ? (
          <div className="mt-5 grid gap-4 rounded-2xl border border-[#e4d7ce] bg-[#fff9f5] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-5">
            <div>
              <p className="text-sm font-semibold text-[#8f4f42]">選択した予約内容</p>
              <p className="mt-1 text-lg font-semibold text-[#382f2a]">{dateLabel(selectedDate)} {minutesText(selectedMinutes)}</p>
              <p className="mt-1 text-sm leading-6 text-[#6f6259]">{menu.name}（{menu.durationMinutes}分） / {selectedStaff.name}</p>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitBooking()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#8f4f42] px-7 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />予約を登録しています</> : "この日時で予約する"}
            </button>
          </div>
        ) : null}

        {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
        {success ? (
          <div role="status" className="mt-4 rounded-2xl border border-[#b9d9c0] bg-[#edf7ef] p-4 text-sm text-[#315c3c]">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5" />予約を受け付けました</p>
            <p className="mt-2 leading-6">{dateLabel(success.date)} {minutesText(success.minutes)}<br />{success.menu} / 担当 {success.staffName}</p>
          </div>
        ) : null}
      </section>

      {upcoming.length > 0 ? (
        <section className="rounded-[24px] border border-[#e8ded2] bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold"><CalendarDays className="h-5 w-5 text-[#8aa58a]" />現在の予約</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((appointment) => (
              <div key={appointment.id} className="rounded-2xl bg-[#f6efe6] px-4 py-3">
                <p className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-[#8f4f42]" />{new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Tokyo" }).format(new Date(appointment.scheduledAt))}</p>
                <p className="mt-1 text-xs leading-5 text-[#7c7168]">{appointment.menu ?? "メニュー未設定"} / {appointment.staffName ?? "フリー"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
