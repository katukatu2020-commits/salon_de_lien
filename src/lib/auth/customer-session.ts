const SESSION_VERSION = 1;

export const CUSTOMER_SESSION_COOKIE = "lien_customer_session";
export const DEFAULT_CUSTOMER_SESSION_DAYS = 30;

export type CustomerSessionPayload = {
  version: number;
  subject: string;
  role: "CUSTOMER";
  customerId: string;
  organizationId: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  sessionId: string;
};

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encodePayload(payload: CustomerSessionPayload) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

function decodePayload(value: string) {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as CustomerSessionPayload;
  } catch {
    return null;
  }
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function normalizeCustomerLoginId(value: string) {
  return value.trim().toLowerCase();
}

export function customerAuthSecret() {
  return process.env.CUSTOMER_AUTH_SECRET || process.env.ADMIN_AUTH_SECRET;
}

export function getCustomerSessionDays() {
  const configured = Number(process.env.CUSTOMER_SESSION_DAYS);
  if (!Number.isFinite(configured)) return DEFAULT_CUSTOMER_SESSION_DAYS;
  return Math.min(90, Math.max(1, Math.floor(configured)));
}

export async function createCustomerSessionToken({
  loginId,
  customerId,
  organizationId,
  userId,
  secret,
  now = Date.now(),
  sessionDays = DEFAULT_CUSTOMER_SESSION_DAYS
}: {
  loginId: string;
  customerId: string;
  organizationId: string;
  userId: string;
  secret: string;
  now?: number;
  sessionDays?: number;
}) {
  const issuedAt = Math.floor(now / 1000);
  const payload: CustomerSessionPayload = {
    version: SESSION_VERSION,
    subject: normalizeCustomerLoginId(loginId),
    role: "CUSTOMER",
    customerId,
    organizationId,
    userId,
    issuedAt,
    expiresAt: issuedAt + sessionDays * 24 * 60 * 60,
    sessionId: crypto.randomUUID()
  };
  const encoded = encodePayload(payload);
  return `${encoded}.${await sign(encoded, secret)}`;
}

export async function verifyCustomerSessionToken(
  token: string | null | undefined,
  secret: string | null | undefined,
  now = Date.now()
) {
  if (!token || !secret || secret.length < 32) return null;
  const [encoded, providedSignature, extra] = token.split(".");
  if (!encoded || !providedSignature || extra) return null;
  const expectedSignature = await sign(encoded, secret);
  if (!constantTimeEqual(providedSignature, expectedSignature)) return null;
  const payload = decodePayload(encoded);
  if (
    !payload ||
    payload.version !== SESSION_VERSION ||
    payload.role !== "CUSTOMER" ||
    !payload.customerId ||
    !payload.organizationId ||
    !payload.userId ||
    !payload.sessionId ||
    payload.expiresAt <= Math.floor(now / 1000)
  ) {
    return null;
  }
  return payload;
}
