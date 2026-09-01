import { createHmac, randomBytes, randomInt, timingSafeEqual } from "crypto";

export const SMS_CODE_LENGTH = 6;
export const SMS_CODE_TTL_MINUTES = 10;
export const PHONE_REGISTRATION_TTL_MINUTES = 30;
export const SMS_MAX_VERIFY_ATTEMPTS = 5;

export function normalizeJapaneseMobilePhone(rawValue: string) {
  const compact = rawValue.normalize("NFKC").trim().replace(/[\s()-]/g, "");
  const digits = compact.replace(/\D/g, "");
  let e164 = "";

  if (/^0(?:70|80|90)\d{8}$/.test(digits)) {
    e164 = `+81${digits.slice(1)}`;
  } else if (/^81(?:70|80|90)\d{8}$/.test(digits)) {
    e164 = `+${digits}`;
  }

  return /^\+81(?:70|80|90)\d{8}$/.test(e164) ? e164 : null;
}

export function formatJapaneseMobilePhone(phoneE164: string) {
  const match = phoneE164.match(/^\+81(70|80|90)(\d{4})(\d{4})$/);
  return match ? `0${match[1]}-${match[2]}-${match[3]}` : phoneE164;
}

export function maskJapaneseMobilePhone(phoneE164: string) {
  const formatted = formatJapaneseMobilePhone(phoneE164);
  return formatted.replace(/^(0\d{2})-\d{4}-(\d{4})$/, "$1-****-$2");
}

export function generateSmsVerificationCode() {
  return randomInt(0, 10 ** SMS_CODE_LENGTH).toString().padStart(SMS_CODE_LENGTH, "0");
}

export function generatePhoneRegistrationToken() {
  return randomBytes(32).toString("base64url");
}

function hmac(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function hashSmsVerificationCode(input: { challengeId: string; phoneE164: string; code: string; secret: string }) {
  return hmac(`sms-code:${input.challengeId}:${input.phoneE164}:${input.code}`, input.secret);
}

export function hashPhoneRegistrationToken(input: { challengeId: string; token: string; secret: string }) {
  return hmac(`sms-registration:${input.challengeId}:${input.token}`, input.secret);
}

export function hashSmsRequestIp(address: string, secret: string) {
  return hmac(`sms-ip:${address}`, secret);
}

export function secureHashMatches(actual: string | null | undefined, expected: string) {
  if (!actual || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual, "utf8"), Buffer.from(expected, "utf8"));
}

export function phoneVerificationSecret() {
  const secret = process.env.SMS_VERIFICATION_SECRET || process.env.CUSTOMER_AUTH_SECRET || "";
  if (secret.length < 32) {
    throw new Error("SMS認証の秘密鍵が設定されていません。");
  }
  return secret;
}
