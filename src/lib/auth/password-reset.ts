import { createHash, randomBytes } from "node:crypto";

export type PasswordResetAudience = "admin" | "customer";

export const PASSWORD_RESET_TOKEN_BYTES = 32;
export const DEFAULT_PASSWORD_RESET_MINUTES = 30;

export function generatePasswordResetToken() {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isPasswordResetTokenFormat(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function passwordResetMinutes() {
  const configured = Number(process.env.PASSWORD_RESET_TOKEN_MINUTES);
  if (!Number.isFinite(configured)) return DEFAULT_PASSWORD_RESET_MINUTES;
  return Math.min(120, Math.max(10, Math.floor(configured)));
}

export function passwordResetExpiresAt(now = new Date()) {
  return new Date(now.getTime() + passwordResetMinutes() * 60_000);
}

export function normalizeRecoveryEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isDeliverableRecoveryEmail(email: string) {
  const normalized = normalizeRecoveryEmail(email);
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) &&
    !normalized.endsWith(".local") &&
    !normalized.endsWith("@customer.salon-de-lien.local")
  );
}
