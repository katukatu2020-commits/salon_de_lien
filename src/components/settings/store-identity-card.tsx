"use client";

import { Building2, Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { LienCard } from "@/components/lien/lien-ui";

type StoreIdentityCardProps = {
  storeName: string;
  publicCode: string;
};

export function StoreIdentityCard({ storeName, publicCode }: StoreIdentityCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(publicCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <LienCard className="overflow-hidden border-[#dfd1c5] bg-[linear-gradient(135deg,#fff_0%,#fbf6f1_58%,#f4ebe3_100%)] p-0">
      <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <div className="flex min-w-0 items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[color:var(--lien-primary)] text-white shadow-sm">
            <Building2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[color:var(--lien-primary)]">店舗アカウント</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-[color:var(--lien-ink)]">{storeName}</h2>
            <p className="mt-2 max-w-2xl text-xs leading-6 text-[color:var(--lien-muted)]">
              お客様が店舗を登録するときに使用する、この店舗専用のコードです。
            </p>
          </div>
        </div>

        <div className="rounded-[18px] border border-[#ddcec1] bg-white/90 p-3 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-[color:var(--lien-muted)]">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            店舗固有コード
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 select-all whitespace-nowrap text-base font-bold tracking-[0.08em] text-[color:var(--lien-primary-dark)] sm:text-lg">
              {publicCode}
            </code>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[color:var(--lien-border)] bg-white px-4 text-xs font-semibold text-[color:var(--lien-ink)] shadow-sm transition hover:bg-[color:var(--lien-surface-soft)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c9be]/50"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "コピーしました" : "コードをコピー"}
            </button>
          </div>
        </div>
      </div>
    </LienCard>
  );
}
