"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Mail, RotateCw } from "lucide-react";

const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_STORAGE_KEY = "lien_customer_registration_email";
const SENT_AT_STORAGE_KEY = "lien_customer_registration_sent_at";

type RegistrationContext = {
  source?: string;
  campaign?: string;
  referrer?: string;
  referrerName?: string;
};

export function CustomerRegistrationEmailForm({
  resendMode,
  retryAfterSeconds = 0,
  context
}: {
  resendMode: boolean;
  retryAfterSeconds?: number;
  context: RegistrationContext;
}) {
  const [email, setEmail] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(
    resendMode ? Math.min(RESEND_COOLDOWN_SECONDS, Math.max(0, retryAfterSeconds)) : 0
  );

  useEffect(() => {
    const storedEmail = window.sessionStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
    const sentAt = Number(window.sessionStorage.getItem(SENT_AT_STORAGE_KEY) ?? "0");
    setEmail(storedEmail);

    if (!resendMode) return;
    const elapsedSeconds = sentAt > 0 ? Math.floor((Date.now() - sentAt) / 1000) : RESEND_COOLDOWN_SECONDS;
    setRemainingSeconds(Math.max(retryAfterSeconds, RESEND_COOLDOWN_SECONDS - elapsedSeconds, 0));
  }, [resendMode, retryAfterSeconds]);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = window.setTimeout(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [remainingSeconds]);

  const buttonLabel = useMemo(() => {
    if (remainingSeconds > 0) return `再送まで ${remainingSeconds}秒`;
    return resendMode ? "メールを再送する" : "登録用メールを送る";
  }, [remainingSeconds, resendMode]);

  function rememberRequest(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    if (!form.checkValidity()) return;
    window.sessionStorage.setItem(EMAIL_STORAGE_KEY, email.trim().toLowerCase());
    window.sessionStorage.setItem(SENT_AT_STORAGE_KEY, String(Date.now()));
    setRemainingSeconds(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <form action="/api/customer-auth/registration-link/request" method="post" onSubmit={rememberRequest} className="mt-6 grid gap-4">
      <input type="hidden" name="source" value={context.source ?? ""} />
      <input type="hidden" name="campaign" value={context.campaign ?? ""} />
      <input type="hidden" name="referrer" value={context.referrer ?? ""} />
      <input type="hidden" name="referrerName" value={context.referrerName ?? ""} />
      <label className="grid gap-2 text-sm font-semibold">
        メールアドレス
        <span className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-lien-muted" />
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="example@email.com"
            className="lien-input h-12 pl-11"
          />
        </span>
      </label>
      <button
        type="submit"
        disabled={remainingSeconds > 0 || !email.trim()}
        className="lien-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {resendMode ? <RotateCw className="h-4 w-4" aria-hidden="true" /> : null}
        <span aria-live="polite">{buttonLabel}</span>
      </button>
      {resendMode ? (
        <p className="text-center text-xs leading-5 text-lien-muted">
          誤送信や連続送信を防ぐため、再送は60秒ごとに利用できます。
        </p>
      ) : null}
    </form>
  );
}
