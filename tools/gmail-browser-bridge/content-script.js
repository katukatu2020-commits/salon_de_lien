const APP_MESSAGE_SOURCE = "salon-de-lien-app";
const EXTENSION_MESSAGE_SOURCE = "salon-de-lien-gmail-bridge";
const APP_REQUEST_EVENT = "lien-gmail-bridge-request";
const EXTENSION_RESPONSE_EVENT = "lien-gmail-bridge-response";
let scanRunning = false;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(check, timeout = 12_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    const value = check();
    if (value) return value;
    await wait(250);
  }
  return null;
}

function senderDetails(message) {
  const sender = message.querySelector(".gD");
  return {
    name: (sender?.textContent || "").trim(),
    email: (sender?.getAttribute("email") || sender?.getAttribute("data-hovercard-id") || "").trim().toLowerCase()
  };
}

async function scanSearchResults() {
  const rows = await waitFor(() => {
    const visibleRows = Array.from(document.querySelectorAll("tr.zA")).filter((row) => row.offsetParent !== null);
    if (visibleRows.length > 0) return visibleRows;
    if ((document.body.innerText || "").includes("検索条件に一致するメールは見つかりませんでした")) return [];
    return null;
  });

  if (!rows) throw new Error("Gmailの検索結果を読み取れませんでした");
  const processed = await chrome.runtime.sendMessage({ type: "LIEN_GET_PROCESSED_IDS" });
  const processedIds = new Set(processed?.ids || []);
  const targetRow = rows.find((row) => {
    const sender = row.querySelector('[data-hovercard-id="kanzashi@pacificporter.jp"]');
    const identity = row.querySelector("[data-legacy-last-message-id]");
    const lastMessageId = identity?.getAttribute("data-legacy-last-message-id") || "";
    return Boolean(sender && lastMessageId && !processedIds.has(lastMessageId));
  });

  if (!targetRow) {
    await chrome.runtime.sendMessage({ type: "LIEN_GMAIL_SEARCH_COMPLETE" });
    return;
  }

  targetRow.click();
  await wait(900);
  await scanThread();
}

async function scanThread() {
  const messages = await waitFor(() => {
    const visible = Array.from(document.querySelectorAll("[data-legacy-message-id]"))
      .filter((message) => message.offsetParent !== null && message.querySelector(".a3s"));
    return visible.length > 0 ? visible : null;
  });
  if (!messages) throw new Error("Gmailの予約メール本文を読み取れませんでした");

  for (const message of messages) {
    for (const clipped of message.querySelectorAll(".ajR")) {
      if (clipped.offsetParent !== null) clipped.click();
    }
  }
  await wait(250);

  const processed = await chrome.runtime.sendMessage({ type: "LIEN_GET_PROCESSED_IDS" });
  const processedIds = new Set(processed?.ids || []);
  const subject = (document.querySelector("h2.hP")?.textContent || "").trim();

  for (const message of messages) {
    const messageId = message.getAttribute("data-legacy-message-id") || "";
    const sender = senderDetails(message);
    const body = message.querySelector(".a3s");
    const content = (body?.innerText || body?.textContent || "").trim();

    if (!messageId || processedIds.has(messageId)) continue;
    if (sender.name !== "【かんざし結】受付" || sender.email !== "kanzashi@pacificporter.jp") continue;
    if (!subject || !content) continue;

    const result = await chrome.runtime.sendMessage({
      type: "LIEN_INGEST_RESERVATION",
      payload: {
        subject,
        content,
        messageId,
        senderName: sender.name,
        senderEmail: sender.email
      }
    });
    if (!result?.success) throw new Error(result?.error || "予約メールを登録できませんでした");
  }

  await chrome.runtime.sendMessage({ type: "LIEN_GMAIL_THREAD_COMPLETE" });
  await wait(800);
  await scanSearchResults();
}

async function scanCurrentGmailView() {
  if (scanRunning) return;
  scanRunning = true;
  try {
    if (location.hash.startsWith("#search/") && !document.querySelector("[data-legacy-message-id]")) {
      await scanSearchResults();
    } else {
      await scanThread();
    }
  } catch (error) {
    console.warn("[Salon de Lien Gmail連携]", error);
    await chrome.runtime.sendMessage({
      type: "LIEN_GMAIL_SCAN_ERROR",
      message: error instanceof Error ? error.message : "Gmailの読取に失敗しました"
    });
  } finally {
    scanRunning = false;
  }
}

function installAppBridge() {
  async function relayRequest(data) {
    if (data?.source !== APP_MESSAGE_SOURCE) return;
    if (!["LIEN_APP_PING", "LIEN_APP_START_SYNC", "LIEN_APP_RESET_AND_SYNC"].includes(data.type)) return;

    const response = await chrome.runtime.sendMessage({ type: data.type });
    const detail = {
      source: EXTENSION_MESSAGE_SOURCE,
      requestId: data.requestId,
      type: data.type,
      payload: response
    };
    document.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, { detail }));
    window.postMessage(detail, location.origin);
  }

  document.addEventListener(APP_REQUEST_EVENT, (event) => {
    void relayRequest(event.detail);
  });

  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin) return;
    void relayRequest(event.data);
  });
}

if (location.hostname === "mail.google.com") {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "LIEN_START_GMAIL_SCAN") return false;
    void scanCurrentGmailView();
    sendResponse({ ok: true });
    return false;
  });
  void chrome.runtime.sendMessage({ type: "LIEN_GMAIL_PAGE_READY", url: location.href });
} else {
  installAppBridge();
}
