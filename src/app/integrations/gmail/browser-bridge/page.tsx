"use client";

import { CheckCircle2, Loader2, MailCheck, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

type BridgeStatus = {
  configured?: boolean;
  running?: boolean;
  imported?: number;
  updated?: number;
  failed?: number;
  message?: string;
};

const REQUEST_SOURCE = "salon-de-lien-app";
const RESPONSE_SOURCE = "salon-de-lien-gmail-bridge";

function requestExtension(type: "LIEN_APP_PING" | "LIEN_APP_START_SYNC" | "LIEN_APP_RESET_AND_SYNC") {
  return new Promise<BridgeStatus>((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("extension_not_found"));
    }, 2500);

    function onMessage(event: MessageEvent) {
      if (
        event.origin !== window.location.origin ||
        event.data?.source !== RESPONSE_SOURCE ||
        event.data?.requestId !== requestId
      ) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve((event.data.payload ?? {}) as BridgeStatus);
    }

    window.addEventListener("message", onMessage);
    window.postMessage({ source: REQUEST_SOURCE, requestId, type }, window.location.origin);
  });
}

export default function GmailBrowserBridgePage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(false);

  async function ping() {
    try {
      const next = await requestExtension("LIEN_APP_PING");
      setConnected(true);
      setStatus(next);
      return next;
    } catch {
      setConnected(false);
      return null;
    }
  }

  useEffect(() => {
    void ping();
    const timer = window.setInterval(() => void ping(), 2000);
    return () => window.clearInterval(timer);
  }, []);

  async function start(type: "LIEN_APP_START_SYNC" | "LIEN_APP_RESET_AND_SYNC") {
    if (loading) return;
    setLoading(true);
    try {
      const next = await requestExtension(type);
      setConnected(true);
      setStatus(next);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  const ready = connected && status?.configured !== false;

  return (
    <main className="min-h-screen bg-[color:var(--lien-bg)] px-4 py-10 text-[color:var(--lien-ink)] sm:px-6">
      <section className="mx-auto max-w-xl rounded-[24px] border border-[color:var(--lien-border)] bg-white p-6 shadow-lien sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff2ed] text-[color:var(--lien-primary)]">
            <MailCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold text-[color:var(--lien-primary)]">Chromeブラウザ連携</p>
            <h1 className="mt-1 text-2xl font-semibold">Gmail予約連携の確認</h1>
            <p className="mt-2 text-sm leading-6 text-[color:var(--lien-muted)]">
              「かんざし結」の予約メールだけを確認し、予約カレンダーへ反映します。
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-[color:var(--lien-border)] bg-[color:var(--lien-surface-soft)] p-4">
          {connected === null ? (
            <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--lien-muted)]"><Loader2 className="h-4 w-4 animate-spin" />拡張機能を確認しています</p>
          ) : ready ? (
            <div className="space-y-3" role="status" aria-live="polite">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#466349]">
                {status?.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {status?.running ? "予約メールを確認中" : "Chrome拡張機能に接続済み"}
              </p>
              <p className="text-sm text-[color:var(--lien-muted)]">{status?.message ?? "同期待機中"}</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <span className="rounded-xl bg-white p-3">新規<br /><strong className="mt-1 block text-base">{status?.imported ?? 0}</strong></span>
                <span className="rounded-xl bg-white p-3">更新<br /><strong className="mt-1 block text-base">{status?.updated ?? 0}</strong></span>
                <span className="rounded-xl bg-white p-3">失敗<br /><strong className="mt-1 block text-base">{status?.failed ?? 0}</strong></span>
              </div>
            </div>
          ) : (
            <p className="flex items-start gap-2 text-sm font-semibold text-[#884039]" role="alert">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              拡張機能が見つかりません。拡張機能を再読み込みして、このページを開き直してください。
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => void start("LIEN_APP_START_SYNC")} disabled={!ready || loading || status?.running} className="lien-button-primary px-5 disabled:cursor-not-allowed disabled:opacity-50">
            {loading || status?.running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            今すぐ確認
          </button>
          <button type="button" onClick={() => void start("LIEN_APP_RESET_AND_SYNC")} disabled={!ready || loading || status?.running} className="lien-button-secondary px-5 disabled:cursor-not-allowed disabled:opacity-50">
            直近60日を再確認
          </button>
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[color:var(--lien-muted)]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Gmail API、パスワード、Cookieは使用しません。同じメールを再確認しても予約は重複登録されません。
        </p>
      </section>
    </main>
  );
}
