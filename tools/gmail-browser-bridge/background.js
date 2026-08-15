const CONFIG = globalThis.LIEN_GMAIL_BRIDGE_CONFIG;
const ALARM_NAME = "lien-gmail-reservation-sync";
const PARSER_VERSION = "2026-08-01-visitor-field-pair-v2";
const STORAGE = {
  processedIds: "processedMessageIds",
  scannerTabId: "scannerTabId",
  status: "bridgeStatus",
  parserVersion: "parserVersion"
};

function configured() {
  return Boolean(CONFIG?.ingestEndpoint && CONFIG?.bridgeSecret && CONFIG?.senderEmail);
}

function searchUrl() {
  const query = `from:${CONFIG.senderEmail} newer_than:${CONFIG.lookbackDays || 60}d`;
  return `https://mail.google.com/mail/u/${CONFIG.gmailAccountIndex || "0"}/#search/${encodeURIComponent(query)}`;
}

async function getStatus() {
  const stored = await chrome.storage.local.get(STORAGE.status);
  return stored[STORAGE.status] || {
    configured: configured(),
    running: false,
    imported: 0,
    updated: 0,
    failed: 0,
    message: configured() ? "同期待機中" : "初期設定が必要です"
  };
}

async function setStatus(patch) {
  const next = { ...(await getStatus()), configured: configured(), ...patch };
  await chrome.storage.local.set({ [STORAGE.status]: next });
  return next;
}

async function processedMessageIds() {
  const stored = await chrome.storage.local.get(STORAGE.processedIds);
  return Array.isArray(stored[STORAGE.processedIds]) ? stored[STORAGE.processedIds] : [];
}

async function rememberProcessedMessage(messageId) {
  const ids = await processedMessageIds();
  if (!ids.includes(messageId)) ids.push(messageId);
  await chrome.storage.local.set({ [STORAGE.processedIds]: ids.slice(-2000) });
}

async function parserNeedsReimport() {
  const stored = await chrome.storage.local.get(STORAGE.parserVersion);
  if (stored[STORAGE.parserVersion] === PARSER_VERSION) return false;
  await chrome.storage.local.set({ [STORAGE.parserVersion]: PARSER_VERSION });
  await chrome.storage.local.remove(STORAGE.processedIds);
  return true;
}

async function scannerTab() {
  const stored = await chrome.storage.local.get(STORAGE.scannerTabId);
  const tabId = stored[STORAGE.scannerTabId];
  if (!Number.isInteger(tabId)) return null;

  try {
    return await chrome.tabs.get(tabId);
  } catch {
    await chrome.storage.local.remove(STORAGE.scannerTabId);
    return null;
  }
}

async function sendStartMessage(tabId) {
  await new Promise((resolve) => setTimeout(resolve, 650));
  try {
    await chrome.tabs.sendMessage(tabId, { type: "LIEN_START_GMAIL_SCAN" });
  } catch {
    // Gmail may still be replacing its dynamic view. The content script also announces readiness.
  }
}

async function startSync({ reset = false } = {}) {
  if (!configured()) {
    return setStatus({ running: false, message: "初期設定が必要です" });
  }

  const current = await getStatus();
  if (current.running && !reset) return current;

  if (reset) await chrome.storage.local.remove(STORAGE.processedIds);
  await setStatus({
    running: true,
    imported: 0,
    updated: 0,
    failed: 0,
    startedAt: new Date().toISOString(),
    message: reset ? "予約メールを全件再確認しています" : "新着予約メールを確認しています"
  });

  const existing = await scannerTab();
  const targetUrl = searchUrl();
  let tab;
  if (existing?.id) {
    tab = await chrome.tabs.update(existing.id, { active: false, url: targetUrl });
  } else {
    tab = await chrome.tabs.create({ active: false, url: targetUrl });
    await chrome.storage.local.set({ [STORAGE.scannerTabId]: tab.id });
  }

  if (tab.id) await sendStartMessage(tab.id);
  return getStatus();
}

async function ingestReservation(message) {
  const response = await fetch(CONFIG.ingestEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CONFIG.bridgeSecret}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(message.payload),
    cache: "no-store"
  });
  const result = await response.json().catch(() => ({ success: false, error: `HTTP ${response.status}` }));

  if (!response.ok || !result.success) {
    const current = await getStatus();
    await setStatus({ failed: (current.failed || 0) + 1, message: result.error || "予約の取込に失敗しました" });
    return result;
  }

  await rememberProcessedMessage(message.payload.messageId);
  const current = await getStatus();
  await setStatus({
    imported: (current.imported || 0) + (result.duplicate ? 0 : 1),
    updated: (current.updated || 0) + (result.duplicate ? 1 : 0),
    message: "予約メールを取り込みました"
  });
  return result;
}

async function continueSearch(sender) {
  if (!sender.tab?.id) return;
  await chrome.tabs.update(sender.tab.id, { active: false, url: searchUrl() });
}

async function finishSearch(sender) {
  const status = await setStatus({
    running: false,
    completedAt: new Date().toISOString(),
    message: "新着予約の確認が完了しました"
  });
  if (sender.tab?.id) {
    await chrome.storage.local.remove(STORAGE.scannerTabId);
    try {
      await chrome.tabs.remove(sender.tab.id);
    } catch {
      // The user may have already closed the background scanner tab.
    }
  }
  return status;
}

chrome.runtime.onInstalled.addListener(async () => {
  const reimport = await parserNeedsReimport();
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: Math.max(1, Number(CONFIG?.syncIntervalMinutes) || 1)
  });
  await setStatus({ running: false, message: configured() ? "同期待機中" : "初期設定が必要です" });
  if (reimport) await startSync({ reset: true });
});

chrome.runtime.onStartup.addListener(async () => {
  const reimport = await parserNeedsReimport();
  await chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: Math.max(1, Number(CONFIG?.syncIntervalMinutes) || 1)
  });
  await startSync({ reset: reimport });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) void startSync();
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const stored = await chrome.storage.local.get(STORAGE.scannerTabId);
  if (stored[STORAGE.scannerTabId] === tabId) {
    await chrome.storage.local.remove(STORAGE.scannerTabId);
    const current = await getStatus();
    if (current.running) await setStatus({ running: false, message: "次回の自動確認を待っています" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void (async () => {
    if (message?.type === "LIEN_APP_PING" || message?.type === "LIEN_GET_STATUS") {
      sendResponse(await getStatus());
      return;
    }
    if (message?.type === "LIEN_APP_START_SYNC") {
      sendResponse(await startSync());
      return;
    }
    if (message?.type === "LIEN_APP_RESET_AND_SYNC") {
      sendResponse(await startSync({ reset: true }));
      return;
    }
    if (message?.type === "LIEN_GMAIL_PAGE_READY") {
      const tab = await scannerTab();
      if (tab?.id && sender.tab?.id === tab.id) await sendStartMessage(tab.id);
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "LIEN_GET_PROCESSED_IDS") {
      sendResponse({ ids: await processedMessageIds() });
      return;
    }
    if (message?.type === "LIEN_INGEST_RESERVATION") {
      sendResponse(await ingestReservation(message));
      return;
    }
    if (message?.type === "LIEN_GMAIL_THREAD_COMPLETE") {
      await continueSearch(sender);
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "LIEN_GMAIL_SEARCH_COMPLETE") {
      sendResponse(await finishSearch(sender));
      return;
    }
    if (message?.type === "LIEN_GMAIL_SCAN_ERROR") {
      await setStatus({ running: false, failed: 1, message: message.message || "Gmailの読取に失敗しました" });
      if (sender.tab?.id) {
        await chrome.storage.local.remove(STORAGE.scannerTabId);
        try {
          await chrome.tabs.remove(sender.tab.id);
        } catch {
          // The background scanner tab may already be closed.
        }
      }
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: false, error: "unknown_message" });
  })().catch(async (error) => {
    await setStatus({ running: false, failed: 1, message: error instanceof Error ? error.message : "連携処理に失敗しました" });
    sendResponse({ ok: false, error: "bridge_error" });
  });
  return true;
});
