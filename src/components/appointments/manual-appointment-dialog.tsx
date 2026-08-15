"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarPlus2, LoaderCircle, PhoneCall, X } from "lucide-react";

export type ManualAppointmentCustomer = {
  id: string;
  name: string;
  phone: string | null;
};

export type ManualAppointmentCreated = {
  id: string;
  customerId: string;
  customerName: string;
  scheduledAt: string;
  durationMinutes: number;
  menu: string | null;
  staffName: string;
  status: string;
  source: string | null;
  bookingProvider: string | null;
  updatedAt: string;
};

type Props = {
  date: string;
  customers: ManualAppointmentCustomer[];
  staff: Array<{ name: string }>;
  onCreated: (appointment: ManualAppointmentCreated) => void;
};

const inputClassName =
  "mt-1.5 h-11 w-full rounded-xl border border-[color:var(--lien-border)] bg-white px-3 text-sm text-[color:var(--lien-ink)] outline-none transition focus:border-[color:var(--lien-primary)] focus:ring-4 focus:ring-[#e9c9be]/35";

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${date}T12:00:00+09:00`));
}

function timeToMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function ManualAppointmentDialog({ date, customers, staff, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, submitting]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/admin/appointments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: form.get("customerId"),
          date,
          startMinutes: timeToMinutes(String(form.get("startTime") ?? "")),
          durationMinutes: Number(form.get("durationMinutes")),
          staffName: form.get("staffName"),
          menu: form.get("menu"),
          estimatedPrice: form.get("estimatedPrice"),
          bookingProvider: form.get("bookingProvider"),
          note: form.get("note")
        })
      });
      const payload = (await response.json()) as {
        error?: string;
        appointment?: ManualAppointmentCreated;
      };
      if (!response.ok || !payload.appointment) {
        throw new Error(payload.error || "予約を登録できませんでした。");
      }
      onCreated(payload.appointment);
      setOpen(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "予約を登録できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[color:var(--lien-primary)] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--lien-primary-dark)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50"
      >
        <CalendarPlus2 className="h-4 w-4" />
        電話・店頭予約を登録
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#2f2a25]/45 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-appointment-title"
            className="max-h-[calc(100dvh-24px)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-[color:var(--lien-border)] bg-[#fbf7f0] shadow-[0_24px_80px_rgba(47,42,37,0.24)] sm:max-h-[calc(100dvh-48px)]"
          >
            <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[color:var(--lien-border)] bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold text-[color:var(--lien-primary)]">
                  <PhoneCall className="h-4 w-4" />
                  手動予約
                </p>
                <h3 id="manual-appointment-title" className="mt-1 text-lg font-semibold text-[color:var(--lien-ink)]">
                  電話・店頭予約を登録
                </h3>
                <p className="mt-1 text-xs text-[color:var(--lien-muted)]">{dateLabel(date)}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[color:var(--lien-border)] bg-white text-[color:var(--lien-ink)] transition hover:bg-[color:var(--lien-surface-soft)] disabled:opacity-50"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={submit} className="grid gap-5 p-5 sm:p-6">
              {error ? (
                <p role="alert" className="rounded-xl border border-[#edc2bd] bg-[#fff1ef] px-4 py-3 text-sm font-semibold text-[#884039]">
                  {error}
                </p>
              ) : null}

              <label className="text-sm font-semibold text-[color:var(--lien-ink)]">
                お客様
                <select name="customerId" required defaultValue="" className={inputClassName}>
                  <option value="" disabled>顧客を選択</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}{customer.phone ? `（${customer.phone}）` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[color:var(--lien-ink)]">
                  開始時刻
                  <input name="startTime" type="time" min="10:00" max="18:45" step="900" defaultValue="10:00" required className={inputClassName} />
                </label>
                <label className="text-sm font-semibold text-[color:var(--lien-ink)]">
                  施術時間（分）
                  <input name="durationMinutes" type="number" min="15" max="540" step="15" defaultValue="60" required className={inputClassName} />
                </label>
                <label className="text-sm font-semibold text-[color:var(--lien-ink)]">
                  担当者
                  <select name="staffName" defaultValue="フリー" required className={inputClassName}>
                    {staff.map((member) => <option key={member.name} value={member.name}>{member.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold text-[color:var(--lien-ink)]">
                  予約経路
                  <select name="bookingProvider" defaultValue="phone" required className={inputClassName}>
                    <option value="phone">電話</option>
                    <option value="walk_in">店頭</option>
                    <option value="manual">その他の手動登録</option>
                  </select>
                </label>
              </div>

              <label className="text-sm font-semibold text-[color:var(--lien-ink)]">
                メニュー
                <input name="menu" type="text" maxLength={120} required placeholder="例: カット + カラー" className={inputClassName} />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-[color:var(--lien-ink)]">
                  見込み金額（任意）
                  <input name="estimatedPrice" type="number" min="0" max="1000000" step="1" placeholder="例: 12000" className={inputClassName} />
                </label>
                <label className="text-sm font-semibold text-[color:var(--lien-ink)]">
                  メモ（任意）
                  <input name="note" type="text" maxLength={500} placeholder="電話で確認した内容など" className={inputClassName} />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[color:var(--lien-border)] pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setOpen(false)} disabled={submitting} className="lien-button-secondary h-11 px-5 disabled:opacity-50">
                  キャンセル
                </button>
                <button type="submit" disabled={submitting} className="lien-button-primary h-11 px-6 disabled:cursor-wait disabled:opacity-70">
                  {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarPlus2 className="h-4 w-4" />}
                  {submitting ? "登録中" : "予約を登録"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
