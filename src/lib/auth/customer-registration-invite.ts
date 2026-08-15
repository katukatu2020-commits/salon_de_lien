import { createHash, randomBytes } from "node:crypto";

export const CUSTOMER_REGISTRATION_TOKEN_BYTES = 32;
export const DEFAULT_CUSTOMER_REGISTRATION_MINUTES = 60;

export type CustomerRegistrationContext = {
  source?: string;
  campaign?: string;
  referrer?: string;
  referrerName?: string;
};

export function generateCustomerRegistrationToken() {
  return randomBytes(CUSTOMER_REGISTRATION_TOKEN_BYTES).toString("base64url");
}

export function hashCustomerRegistrationToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isCustomerRegistrationTokenFormat(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function customerRegistrationMinutes() {
  const configured = Number(process.env.CUSTOMER_REGISTRATION_TOKEN_MINUTES);
  if (!Number.isFinite(configured)) return DEFAULT_CUSTOMER_REGISTRATION_MINUTES;
  return Math.min(24 * 60, Math.max(15, Math.floor(configured)));
}

export function customerRegistrationExpiresAt(now = new Date()) {
  return new Date(now.getTime() + customerRegistrationMinutes() * 60_000);
}

export function normalizeRegistrationEmail(value: string) {
  return value.trim().toLowerCase();
}

export function sanitizeCustomerRegistrationContext(input: CustomerRegistrationContext) {
  const clean = (value: string | undefined, maxLength: number) => {
    const normalized = value?.trim();
    return normalized ? normalized.slice(0, maxLength) : undefined;
  };

  return {
    source: clean(input.source, 80),
    campaign: clean(input.campaign, 80),
    referrer: clean(input.referrer, 80),
    referrerName: clean(input.referrerName, 80)
  } satisfies CustomerRegistrationContext;
}

export function parseCustomerRegistrationContext(value: unknown): CustomerRegistrationContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const context = value as Record<string, unknown>;
  return sanitizeCustomerRegistrationContext({
    source: typeof context.source === "string" ? context.source : undefined,
    campaign: typeof context.campaign === "string" ? context.campaign : undefined,
    referrer: typeof context.referrer === "string" ? context.referrer : undefined,
    referrerName: typeof context.referrerName === "string" ? context.referrerName : undefined
  });
}
