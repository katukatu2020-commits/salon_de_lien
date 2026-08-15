export const REFERRAL_DISCOUNT_RATES = {
  referrer: 15,
  referredCustomer: 20
} as const;

export type ReferralDiscountKind = "referrer" | "referred_customer";

export function referralDiscountAmount(serviceAmount: number, rate: number) {
  if (!Number.isSafeInteger(serviceAmount) || serviceAmount <= 0) return 0;
  if (!Number.isInteger(rate) || rate <= 0 || rate >= 100) return 0;
  return Math.floor((serviceAmount * rate) / 100);
}
