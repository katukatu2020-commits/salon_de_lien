export const LONG_HAIR_FEES = {
  M: 600,
  L: 1100,
  LL: 1700
} as const;

export type LongHairLength = keyof typeof LONG_HAIR_FEES;

export function isLongHairLength(value: string): value is LongHairLength {
  return Object.prototype.hasOwnProperty.call(LONG_HAIR_FEES, value);
}

export function longHairFee(value: string) {
  return isLongHairLength(value) ? LONG_HAIR_FEES[value] : 0;
}

export function percentageDiscountAmount(amount: number, rate: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) return 0;
  if (!Number.isSafeInteger(rate) || rate <= 0 || rate > 100) return 0;
  return Math.floor((amount * rate) / 100);
}
