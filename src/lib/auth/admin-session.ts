const SESSION_VERSION = 2;

export const ADMIN_SESSION_COOKIE = "lien_admin_session";
export const DEFAULT_ADMIN_SESSION_HOURS = 12;

export type AdminRole = "ADMIN" | "STAFF" | "MANUFACTURER";

export type AdminSessionPayload = {
  version: number;
  subject: string;
  role: AdminRole;
  organizationId: string | null;
  manufacturerName: string | null;
  userId: string | null;
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

function encodePayload(payload: AdminSessionPayload) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
}

function decodePayload(value: string): AdminSessionPayload | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as AdminSessionPayload;
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

export function normalizeAdminEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getAdminSessionHours() {
  const configured = Number(process.env.ADMIN_SESSION_HOURS);
  if (!Number.isFinite(configured)) return DEFAULT_ADMIN_SESSION_HOURS;
  return Math.min(24, Math.max(1, Math.floor(configured)));
}

export async function createAdminSessionToken({
  email,
  secret,
  role = "ADMIN",
  organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien",
  manufacturerName = null,
  userId = null,
  now = Date.now(),
  sessionHours = DEFAULT_ADMIN_SESSION_HOURS
}: {
  email: string;
  secret: string;
  role?: AdminRole;
  organizationId?: string | null;
  manufacturerName?: string | null;
  userId?: string | null;
  now?: number;
  sessionHours?: number;
}) {
  const issuedAt = Math.floor(now / 1000);
  const payload: AdminSessionPayload = {
    version: SESSION_VERSION,
    subject: normalizeAdminEmail(email),
    role,
    organizationId,
    manufacturerName,
    userId,
    issuedAt,
    expiresAt: issuedAt + sessionHours * 60 * 60,
    sessionId: crypto.randomUUID()
  };
  const encodedPayload = encodePayload(payload);
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSessionToken(
  token: string | null | undefined,
  secret: string | null | undefined,
  now = Date.now()
) {
  if (!token || !secret || secret.length < 32) return null;

  const [encodedPayload, providedSignature, extra] = token.split(".");
  if (!encodedPayload || !providedSignature || extra) return null;

  const expectedSignature = await sign(encodedPayload, secret);
  if (!constantTimeEqual(providedSignature, expectedSignature)) return null;

  const payload = decodePayload(encodedPayload);
  if (
    !payload ||
    payload.version !== SESSION_VERSION ||
    !["ADMIN", "STAFF", "MANUFACTURER"].includes(payload.role) ||
    !payload.subject ||
    !payload.sessionId ||
    payload.expiresAt <= Math.floor(now / 1000)
  ) {
    return null;
  }

  return payload;
}
