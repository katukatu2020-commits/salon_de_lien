import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { importReservationEmail } from "@/lib/appointments/import-reservation-email";
import { inferBookingProvider } from "@/lib/appointments/booking-provider";
import { isReservationNotificationEmail } from "@/lib/appointments/reservation-email";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const DEFAULT_SUBJECT = "新規のご予約が確定しました";
const DEFAULT_SENDER = "kanzashi@pacificporter.jp";
const DEFAULT_HOTPEPPER_SENDERS = ["salonboard.com", "beauty.hotpepper.jp", "recruit.co.jp"];
const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_MESSAGES_PER_SYNC = 100;
const GMAIL_FETCH_TIMEOUT_MS = 20_000;
const RESERVATION_PARSER_VERSION = "reservation-email-v3";

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMessagePart[];
};

type GmailMessage = {
  id?: string;
  payload?: GmailMessagePart & { headers?: GmailHeader[] };
};

type GmailListResponse = {
  messages?: Array<{ id?: string }>;
};

type GmailTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GmailProfile = {
  emailAddress?: string;
};

export type GmailReservationSyncConfig = {
  configured: boolean;
  autoSyncEnabled: boolean;
  email: string | null;
  subject: string;
  sender: string;
  hotPepperSenders: string[];
  pollIntervalSeconds: number;
  missingEnvironmentVariables: string[];
};

export type GmailReservationSyncResult = {
  success: true;
  scanned: number;
  matched: number;
  imported: number;
  updated: number;
  alreadyImported: number;
  failed: number;
  errors: string[];
  syncedAt: string;
};

type GmailSyncGlobalState = {
  accessToken?: string;
  accessTokenExpiresAt?: number;
  syncPromise?: Promise<GmailReservationSyncResult>;
};

const globalState = globalThis as typeof globalThis & {
  __lienGmailSyncState?: GmailSyncGlobalState;
};

function state() {
  globalState.__lienGmailSyncState ??= {};
  return globalState.__lienGmailSyncState;
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function csvValues(value: string | undefined, fallback: string[]) {
  const values = value?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
  return values.length > 0 ? values : fallback;
}

export function getGmailReservationSyncConfig(): GmailReservationSyncConfig {
  const required = [
    "GMAIL_OAUTH_CLIENT_ID",
    "GMAIL_OAUTH_CLIENT_SECRET",
    "GMAIL_OAUTH_REFRESH_TOKEN"
  ] as const;
  const missingEnvironmentVariables = required.filter((key) => !process.env[key]?.trim());

  return {
    configured: missingEnvironmentVariables.length === 0,
    autoSyncEnabled: enabled(process.env.GMAIL_AUTO_SYNC_ENABLED),
    email: process.env.GMAIL_RESERVATION_EMAIL?.trim() || null,
    subject: process.env.GMAIL_RESERVATION_SUBJECT?.trim() || DEFAULT_SUBJECT,
    sender: process.env.GMAIL_RESERVATION_SENDER?.trim() || DEFAULT_SENDER,
    hotPepperSenders: csvValues(
      process.env.GMAIL_HOTPEPPER_RESERVATION_SENDERS,
      DEFAULT_HOTPEPPER_SENDERS
    ),
    pollIntervalSeconds: positiveInteger(process.env.GMAIL_SYNC_INTERVAL_SECONDS, 60),
    missingEnvironmentVariables
  };
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Gmail OAuth設定が不足しています: ${name}`);
  return value;
}

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GMAIL_FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestAccessToken() {
  const currentState = state();
  if (
    currentState.accessToken &&
    currentState.accessTokenExpiresAt &&
    currentState.accessTokenExpiresAt > Date.now() + 60_000
  ) {
    return currentState.accessToken;
  }

  const response = await fetchWithTimeout(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requiredEnvironment("GMAIL_OAUTH_CLIENT_ID"),
      client_secret: requiredEnvironment("GMAIL_OAUTH_CLIENT_SECRET"),
      refresh_token: requiredEnvironment("GMAIL_OAUTH_REFRESH_TOKEN"),
      grant_type: "refresh_token"
    }),
    cache: "no-store"
  });
  const payload = (await response.json()) as GmailTokenResponse;

  if (!response.ok || !payload.access_token) {
    const reason = payload.error_description || payload.error || `HTTP ${response.status}`;
    throw new Error(`Gmail OAuth認証に失敗しました: ${reason}`);
  }

  currentState.accessToken = payload.access_token;
  currentState.accessTokenExpiresAt = Date.now() + (payload.expires_in ?? 3600) * 1000;
  return payload.access_token;
}

async function gmailFetch<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetchWithTimeout(`${GMAIL_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });

  if (!response.ok) {
    if (response.status === 401) {
      const currentState = state();
      currentState.accessToken = undefined;
      currentState.accessTokenExpiresAt = undefined;
    }
    throw new Error(`Gmail APIの取得に失敗しました (HTTP ${response.status})`);
  }

  return (await response.json()) as T;
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function decodeHeaderValue(value: string) {
  return value.replace(/=\?([^?]+)\?([bq])\?([^?]+)\?=/gi, (_match, charset, encoding, encoded) => {
    if (!/^utf-?8$/i.test(String(charset))) return String(_match);
    if (String(encoding).toLowerCase() === "b") {
      return Buffer.from(String(encoded), "base64").toString("utf8");
    }
    const quotedPrintable = String(encoded).replace(/_/g, " ").replace(/=([0-9a-f]{2})/gi, (_part, hex) =>
      String.fromCharCode(Number.parseInt(String(hex), 16))
    );
    return Buffer.from(quotedPrintable, "binary").toString("utf8");
  });
}

function headerValue(message: GmailMessage, name: string) {
  const header = message.payload?.headers?.find(
    (item) => item.name?.toLowerCase() === name.toLowerCase()
  );
  return header?.value ? decodeHeaderValue(header.value) : "";
}

function collectBodies(part: GmailMessagePart | undefined, result: { plain: string[]; html: string[] }) {
  if (!part) return;

  if (part.body?.data) {
    const body = decodeBase64Url(part.body.data);
    if (part.mimeType?.toLowerCase().startsWith("text/plain")) result.plain.push(body);
    if (part.mimeType?.toLowerCase().startsWith("text/html")) result.html.push(body);
  }

  for (const child of part.parts ?? []) collectBodies(child, result);
}

function messageBody(message: GmailMessage) {
  const bodies = { plain: [] as string[], html: [] as string[] };
  collectBodies(message.payload, bodies);
  return (bodies.plain.length > 0 ? bodies.plain : bodies.html).join("\n").trim();
}

function messageDigest(messageId: string) {
  return createHash("sha256").update(messageId, "utf8").digest("hex");
}

function ingestIdForMessageId(messageId: string, organizationId: string) {
  const digest = createHash("sha256")
    .update(`${organizationId}:${messageId}`, "utf8")
    .digest("hex");
  return `gmail-ingest-${digest.slice(0, 24)}`;
}

async function recordGmailIngest(input: {
  organizationId: string;
  messageId: string;
  status: "imported" | "failed" | "skipped";
  appointmentId?: string | null;
  errorMessage?: string | null;
}) {
  const status = `${input.status}:${RESERVATION_PARSER_VERSION}`;
  await prisma.gmailIngestMessage.upsert({
    where: {
      organizationId_gmailMessageId: {
        organizationId: input.organizationId,
        gmailMessageId: input.messageId
      }
    },
    update: {
      status,
      appointmentId: input.appointmentId ?? null,
      errorMessage: input.errorMessage?.slice(0, 300) ?? null,
      processedAt: new Date()
    },
    create: {
      id: ingestIdForMessageId(input.messageId, input.organizationId),
      organizationId: input.organizationId,
      gmailMessageId: input.messageId,
      status,
      appointmentId: input.appointmentId ?? null,
      errorMessage: input.errorMessage?.slice(0, 300) ?? null
    }
  });
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 300);
  return "不明なエラーが発生しました。";
}

async function performGmailReservationSync(
  organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien"
): Promise<GmailReservationSyncResult> {
  const config = getGmailReservationSyncConfig();
  if (!config.configured) {
    throw new Error(
      `Gmail OAuth設定が不足しています: ${config.missingEnvironmentVariables.join(", ")}`
    );
  }

  const accessToken = await requestAccessToken();
  const profile = await gmailFetch<GmailProfile>("/profile", accessToken);
  if (
    config.email &&
    profile.emailAddress &&
    profile.emailAddress.toLowerCase() !== config.email.toLowerCase()
  ) {
    throw new Error("OAuthで接続したGmailアカウントが予約受付用アカウントと一致しません。");
  }

  const lookbackDays = positiveInteger(process.env.GMAIL_SYNC_LOOKBACK_DAYS, DEFAULT_LOOKBACK_DAYS);
  const commonQuery = [
    "in:anywhere",
    `newer_than:${lookbackDays}d`
  ].join(" ");
  const kanzashiQuery = `(from:${config.sender.replace(/[\s"]/g, "")} (subject:予約 OR subject:キャンセル OR subject:取消 OR subject:取り消し))`;
  const hotPepperSenderQuery = config.hotPepperSenders
    .map((sender) => `from:${sender.replace(/[\s"]/g, "")}`)
    .join(" OR ");
  const hotPepperQuery = `((${hotPepperSenderQuery}) (subject:予約 OR subject:ご予約 OR subject:キャンセル OR subject:取消))`;
  const query = `${commonQuery} (${kanzashiQuery} OR ${hotPepperQuery})`;
  const list = await gmailFetch<GmailListResponse>(
    `/messages?maxResults=${MAX_MESSAGES_PER_SYNC}&q=${encodeURIComponent(query)}`,
    accessToken
  );
  const messageIds = (list.messages ?? [])
    .map((message) => message.id)
    .filter((id): id is string => Boolean(id));
  const sourceByMessageId = new Map(
    messageIds.map((id) => [id, `gmail:${messageDigest(id)}`])
  );
  const incompleteProviderAppointments = messageIds.length
    ? await prisma.appointment.findMany({
        where: {
          source: { in: [...sourceByMessageId.values()] },
          bookingProvider: { in: ["hotpepper", "kanzashi"] },
          staffName: null
        },
        select: { source: true }
      })
    : [];
  const incompleteSources = new Set(
    incompleteProviderAppointments
      .map((appointment) => appointment.source)
      .filter((source): source is string => Boolean(source))
  );
  const parserAttempts = messageIds.length
    ? await prisma.gmailIngestMessage.findMany({
        where: {
          organizationId,
          gmailMessageId: { in: messageIds },
          status: { endsWith: RESERVATION_PARSER_VERSION }
        },
        select: { gmailMessageId: true }
      })
    : [];
  const attemptedMessageIds = new Set(parserAttempts.map((item) => item.gmailMessageId));
  const pendingIds = messageIds
    .filter((id) => {
      if (!attemptedMessageIds.has(id)) return true;
      return incompleteSources.has(sourceByMessageId.get(id) ?? "");
    })
    // Gmail lists newest messages first. Apply older events first so a later change or
    // cancellation cannot be overwritten by the original confirmation email.
    .reverse();
  const errors: string[] = [];
  let matched = 0;
  let imported = 0;
  let updated = 0;

  for (const messageId of pendingIds) {
    try {
      const message = await gmailFetch<GmailMessage>(
        `/messages/${encodeURIComponent(messageId)}?format=full`,
        accessToken
      );
      const subject = headerValue(message, "Subject");
      const sender = headerValue(message, "From");

      const content = messageBody(message);
      if (!content) {
        errors.push(`メール ${messageId.slice(0, 8)}: 本文を取得できませんでした。`);
        continue;
      }

      const provider = inferBookingProvider({ subject, content, source: sender });
      const reservationEventText = `${subject}\n${content}`;
      const isKanzashi =
        provider === "kanzashi" &&
        sender.toLowerCase().includes(config.sender.toLowerCase()) &&
        /予約|ご予約|キャンセル|取消|取り消し/.test(reservationEventText);
      const isHotPepper = provider === "hotpepper" && /予約|ご予約|キャンセル|取消|取り消し/.test(reservationEventText);
      if (!isKanzashi && !isHotPepper) continue;

      if (!isReservationNotificationEmail({ subject, content, messageId, sender })) {
        await recordGmailIngest({ organizationId, messageId, status: "skipped" });
        continue;
      }

      matched += 1;

      const result = await importReservationEmail({ subject, content, messageId, sender }, organizationId);
      if (!result.ok) {
        const errorMessage = result.errors.join(" ");
        errors.push(`メール ${messageId.slice(0, 8)}: ${errorMessage}`);
        await recordGmailIngest({ organizationId, messageId, status: "failed", errorMessage });
        continue;
      }

      await recordGmailIngest({
        organizationId,
        messageId,
        status: "imported",
        appointmentId: result.appointment.id
      });

      if (result.duplicate) updated += 1;
      else imported += 1;
    } catch (error) {
      const errorMessage = safeErrorMessage(error);
      errors.push(`メール ${messageId.slice(0, 8)}: ${errorMessage}`);
      await recordGmailIngest({ organizationId, messageId, status: "failed", errorMessage }).catch(() => undefined);
    }
  }

  return {
    success: true,
    scanned: messageIds.length,
    matched,
    imported,
    updated,
    alreadyImported: messageIds.length - pendingIds.length,
    failed: errors.length,
    errors: errors.slice(0, 10),
    syncedAt: new Date().toISOString()
  };
}

export async function syncGmailReservations(
  organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien"
) {
  const currentState = state();
  if (currentState.syncPromise) return currentState.syncPromise;

  currentState.syncPromise = performGmailReservationSync(organizationId).finally(() => {
    currentState.syncPromise = undefined;
  });
  return currentState.syncPromise;
}
