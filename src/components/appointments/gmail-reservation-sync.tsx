"use client";

import { useEffect, useState } from "react";

type GmailSyncConfig = {
  email: string | null;
};

function dateTimeLabel(value: string | null) {
  if (!value) return "未取込";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function maskedEmail(value: string | null) {
  if (!value) return "未設定";
  const [local, domain] = value.split("@");
  if (!domain) return value;
  const visible = local.slice(0, Math.min(4, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export function GmailReservationSync({ latestImportedAt }: { latestImportedAt: string | null }) {
  const [config, setConfig] = useState<GmailSyncConfig | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        const response = await fetch("/api/admin/appointments/sync-gmail", { cache: "no-store" });
        const payload = (await response.json()) as GmailSyncConfig;
        if (!response.ok) throw new Error("Gmail連携状態を確認できませんでした。");
        if (active) setConfig(payload);
      } catch {
        if (active) setFailed(true);
      }
    }

    void loadConfig();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div
      id="gmail-api-sync"
      className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-1 text-[11px] leading-5 text-[color:var(--lien-muted)]"
      role="status"
      aria-live="polite"
    >
      <span>アカウント: {failed ? "確認できません" : config ? maskedEmail(config.email) : "確認中"}</span>
      <span>最終更新: {dateTimeLabel(latestImportedAt)}</span>
    </div>
  );
}
