"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle, TicketCheck } from "lucide-react";
import type { CustomerCouponResult } from "@/lib/coupons/customer-coupon";

function formatExpiry(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(new Date(value));
}

export function CouponCodeEntryCard() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CustomerCouponResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/customer/coupons/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const payload = (await response.json()) as CustomerCouponResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "クーポンを確認できませんでした。");
      setResult(payload);
      setCode(payload.code);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "クーポンを確認できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  const expiresLabel = result?.kind === "coupon" ? formatExpiry(result.expiresAt) : null;

  return (
    <section className="rounded-[22px] border border-[#e8ded2] bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f6efe6] text-[#8f4f42]">
          <TicketCheck className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold">クーポンコード入力</h2>
          <p className="mt-1 text-sm leading-6 text-[#7c7168]">限定クーポンまたは友達紹介コードを入力してください。</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <label htmlFor="customer-coupon-code" className="sr-only">クーポンコード</label>
        <input
          id="customer-coupon-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          placeholder="例: LIEN-A8K3X"
          className="h-12 w-full rounded-2xl border border-[#ded1c5] bg-[#fffdf9] px-4 font-mono text-base font-semibold tracking-wide text-[#2f2a25] outline-none transition placeholder:font-sans placeholder:font-normal placeholder:tracking-normal placeholder:text-[#a69a90] focus:border-[#8f4f42] focus:ring-4 focus:ring-[#e9c9be]/40"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7d453a] disabled:cursor-not-allowed disabled:opacity-55"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <TicketCheck className="h-4 w-4" />}
          {busy ? "確認しています" : "クーポンを確認"}
        </button>
      </form>

      {error ? <p className="mt-3 rounded-2xl bg-[#fff1ef] px-4 py-3 text-sm font-semibold leading-6 text-[#9b3f35]" role="alert">{error}</p> : null}
      {result ? (
        <div className="mt-4 rounded-2xl border border-[#bfd9c5] bg-[#edf7ef] p-4" role="status">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#315c3c]"><CheckCircle2 className="h-5 w-5" />{result.title}</p>
          <p className="mt-2 text-sm leading-6 text-[#47674a]">{result.kind === "referral" ? result.description : result.benefit}</p>
          {expiresLabel ? <p className="mt-2 text-xs font-semibold text-[#54745a]">有効期限 {expiresLabel}まで</p> : null}
          {result.kind === "coupon" ? <p className="mt-2 text-xs text-[#54745a]">ご利用時にこの画面をスタッフへお見せください。</p> : null}
        </div>
      ) : null}
    </section>
  );
}
