"use client";

import { useState } from "react";
import { Check, Copy, Gift, LoaderCircle, Share2 } from "lucide-react";
import type { ReferralDiscountRates } from "@/lib/salon/operational-settings";

type ReferralView = {
  code: string;
  referralUrl: string;
};

function absoluteReferralUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return typeof window === "undefined" ? url : new URL(url, window.location.origin).toString();
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function FriendReferralCard({
  initialReferral,
  discountRates
}: {
  initialReferral: ReferralView | null;
  discountRates: ReferralDiscountRates;
}) {
  const [referral, setReferral] = useState(initialReferral);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function issueReferral() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/customer/referrals", { method: "POST" });
      const payload = (await response.json()) as ReferralView & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "紹介クーポンを発行できませんでした。");
      setReferral(payload);
      setMessage("友達紹介クーポンを発行しました。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "紹介クーポンを発行できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function shareReferral() {
    if (!referral) return;
    const url = absoluteReferralUrl(referral.referralUrl);
    const text = `ORIMIAの友達紹介クーポンです。紹介された方は初回のお会計が${discountRates.referredCustomer}%OFF、紹介者はその会計完了後の次回お会計が${discountRates.referrer}%OFFになります。`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "ORIMIA 友達紹介クーポン", text, url });
        setMessage("紹介クーポンを共有しました。");
      } else {
        await copyText(`${text}\n${url}`);
        setMessage("紹介URLをコピーしました。");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("共有できませんでした。もう一度お試しください。");
    }
  }

  async function copyReferral() {
    if (!referral) return;
    try {
      await copyText(absoluteReferralUrl(referral.referralUrl));
      setMessage("紹介URLをコピーしました。");
    } catch {
      setMessage("コピーできませんでした。共有ボタンをお試しください。");
    }
  }

  return (
    <section className="overflow-hidden rounded-[22px] border border-[#e4d1c7] bg-gradient-to-br from-white via-[#fffaf5] to-[#f5e4de] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#8f4f42] text-white shadow-sm">
          <Gift className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-[#8f4f42]">Friend referral</p>
          <h2 className="mt-1 text-base font-semibold">友達紹介クーポン</h2>
          <p className="mt-2 text-sm leading-6 text-[#6f6259]">
            ご友人は初回のお会計が
            <strong className="text-[#5b332c]"> {discountRates.referredCustomer}%OFF</strong>、
            初回会計の完了後、あなたの次回お会計が
            <strong className="text-[#5b332c]"> {discountRates.referrer}%OFF</strong>になります。
          </p>
        </div>
      </div>

      {referral ? (
        <div className="mt-4 border-t border-[#eadfd4] pt-4">
          <div className="rounded-2xl bg-white/85 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#8b8178]">紹介コード</p>
              <p className="mt-1 truncate font-mono text-base font-semibold tracking-wide text-[#5b332c]">{referral.code}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={shareReferral} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#8f4f42] px-4 text-sm font-semibold text-white shadow-sm">
              <Share2 className="h-4 w-4" />共有する
            </button>
            <button type="button" onClick={copyReferral} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d9c8bb] bg-white px-4 text-sm font-semibold text-[#5b332c]">
              <Copy className="h-4 w-4" />URLコピー
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={issueReferral} disabled={busy} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#8f4f42] px-5 text-sm font-semibold text-white shadow-sm disabled:cursor-wait disabled:opacity-70">
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          {busy ? "発行しています" : "友達紹介クーポンを発行"}
        </button>
      )}

      <p className="mt-3 text-xs leading-5 text-[#7c7168]">紹介された方の{discountRates.referredCustomer}%OFFは初回会計で適用されます。紹介者の{discountRates.referrer}%OFFは、その会計完了後に利用できます。</p>
      {message ? <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#54745a]" role="status"><Check className="h-4 w-4" />{message}</p> : null}
    </section>
  );
}
