import { createHash, randomBytes } from "node:crypto";

export const CUSTOMER_WITHDRAWAL_TOKEN_MINUTES = 30;

export function createCustomerWithdrawalToken() {
  return randomBytes(32).toString("base64url");
}

export function hashCustomerWithdrawalToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isCustomerWithdrawalToken(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function customerWithdrawalTokenMinutes() {
  const configured = Number(process.env.CUSTOMER_WITHDRAWAL_TOKEN_MINUTES);
  return Number.isFinite(configured)
    ? Math.min(120, Math.max(10, Math.floor(configured)))
    : CUSTOMER_WITHDRAWAL_TOKEN_MINUTES;
}

export function customerWithdrawalExpiresAt(now = new Date()) {
  return new Date(now.getTime() + customerWithdrawalTokenMinutes() * 60_000);
}
