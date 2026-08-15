import { createHash, randomBytes } from "node:crypto";

const CUSTOMER_PORTAL_TOKEN_BYTES = 32;
const CUSTOMER_PORTAL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,80}$/;

export function generateCustomerPortalToken() {
  return randomBytes(CUSTOMER_PORTAL_TOKEN_BYTES).toString("base64url");
}

export function hashCustomerPortalToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isCustomerPortalTokenFormat(token: string) {
  return CUSTOMER_PORTAL_TOKEN_PATTERN.test(token);
}
