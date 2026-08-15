export const DEFAULT_OPERATIONAL_SETTINGS = {
  taxRate: 10,
  defaultCouponDiscountRate: 10,
  referralReferrerDiscountRate: 15,
  referralReferredDiscountRate: 20
} as const;

export type ReferralDiscountRates = {
  referrer: number;
  referredCustomer: number;
};

export function includedTaxAmount(taxIncludedAmount: number, taxRate: number) {
  if (!Number.isSafeInteger(taxIncludedAmount) || taxIncludedAmount <= 0) return 0;
  if (!Number.isInteger(taxRate) || taxRate <= 0) return 0;
  return Math.floor((taxIncludedAmount * taxRate) / (100 + taxRate));
}

export function referralRatesFromOrganization(organization: {
  referralReferrerDiscountRate: number;
  referralReferredDiscountRate: number;
}): ReferralDiscountRates {
  return {
    referrer: organization.referralReferrerDiscountRate,
    referredCustomer: organization.referralReferredDiscountRate
  };
}
