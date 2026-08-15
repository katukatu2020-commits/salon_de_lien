type GmailSyncResponse = {
  success?: boolean;
  scanned?: number;
  imported?: number;
  updated?: number;
  alreadyImported?: number;
  failed?: number;
};

type BackgroundState = typeof globalThis & {
  __lienGmailSyncTimer?: ReturnType<typeof setInterval>;
  __lienGmailInitialSyncTimer?: ReturnType<typeof setTimeout>;
};

function registerGmailReservationSync(globalState: BackgroundState) {
  if (process.env.GMAIL_AUTO_SYNC_ENABLED?.toLowerCase() !== "true") return;

  const secret = process.env.GMAIL_SYNC_CRON_SECRET?.trim();
  if (!secret) {
    console.error("[gmail-reservation-sync] GMAIL_SYNC_CRON_SECRET が未設定です。");
    return;
  }
  if (globalState.__lienGmailSyncTimer) return;

  const intervalSeconds = Math.max(30, Number(process.env.GMAIL_SYNC_INTERVAL_SECONDS) || 60);
  const endpoint =
    process.env.GMAIL_SYNC_INTERNAL_URL?.trim() ||
    `http://127.0.0.1:${process.env.PORT || "3000"}/api/integrations/gmail/reservations/sync`;

  const run = async () => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store"
      });
      if (!response.ok) {
        console.error(`[gmail-reservation-sync] 内部同期APIが HTTP ${response.status} を返しました。`);
        return;
      }

      const result = (await response.json()) as GmailSyncResponse;
      console.info(
        `[gmail-reservation-sync] completed scanned=${result.scanned ?? 0} imported=${result.imported ?? 0} updated=${result.updated ?? 0} existing=${result.alreadyImported ?? 0} failed=${result.failed ?? 0}`
      );
    } catch (error) {
      const reason = error instanceof Error && error.name === "AbortError" ? "timeout" : "request_failed";
      console.error(`[gmail-reservation-sync] 内部同期APIへ接続できませんでした (${reason})。`);
    }
  };

  globalState.__lienGmailInitialSyncTimer = setTimeout(() => void run(), 5_000);
  globalState.__lienGmailInitialSyncTimer.unref?.();
  globalState.__lienGmailSyncTimer = setInterval(() => void run(), intervalSeconds * 1000);
  globalState.__lienGmailSyncTimer.unref?.();
}

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { validateProductionEnvironment } = await import("@/lib/env/validate-production-env");
  validateProductionEnvironment();

  const globalState = globalThis as BackgroundState;
  registerGmailReservationSync(globalState);
}
