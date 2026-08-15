import { completeJan13, isValidJan13 } from "@/lib/coupons/barcode-jan13";

const JAN_COMPANY_PREFIX = "45";
const JAN_CODE_PATTERN = /^\d{13}$/;

function shortDatePart(date: Date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function randomDigit() {
  const webCrypto = globalThis.crypto;

  if (webCrypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    webCrypto.getRandomValues(buffer);
    return String(buffer[0] % 10);
  }

  return String(Math.floor(Math.random() * 10));
}

function randomDigits(length: number) {
  return Array.from({ length }, randomDigit).join("");
}

export function generateCouponIssueCode(date = new Date()) {
  const first12Digits = `${JAN_COMPANY_PREFIX}${shortDatePart(date)}${randomDigits(4)}`;
  return completeJan13(first12Digits);
}

export function normalizeCouponCode(code: string) {
  const digits = code.replace(/\D/g, "");

  if (digits.length === 12) {
    return completeJan13(digits);
  }

  return digits;
}

export function isValidCouponCode(code: string) {
  const normalizedCode = normalizeCouponCode(code);
  return JAN_CODE_PATTERN.test(normalizedCode) && isValidJan13(normalizedCode);
}
