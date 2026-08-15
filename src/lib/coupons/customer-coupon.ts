import "server-only";

import { formatCouponDiscount, startOfToday } from "@/lib/coupons";
import { getReferralDiscountRatesForOrganization, registerReferralForExistingCustomer } from "@/lib/points/point-service";
import { prisma } from "@/lib/prisma";

export type CustomerCouponResult =
  | {
      kind: "referral";
      code: string;
      title: string;
      description: string;
      alreadyRegistered: boolean;
    }
  | {
      kind: "coupon";
      code: string;
      title: string;
      benefit: string;
      expiresAt: string | null;
    };

function normalizeCouponEntry(value: string) {
  return value
    .trim()
    .replace(/[‐‑‒–—―ー－]/g, "-")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isAvailableStatus(status: string) {
  return ["issued", "published", "active"].includes(status);
}

export async function applyCustomerCouponCode({
  rawCode,
  customerId,
  organizationId
}: {
  rawCode: string;
  customerId: string;
  organizationId: string;
}): Promise<CustomerCouponResult> {
  const code = normalizeCouponEntry(rawCode);
  if (!/^[A-Z0-9-]{5,40}$/.test(code)) {
    throw new Error("クーポンコードを正しく入力してください。");
  }

  const referralCode = await prisma.referral.findUnique({
    where: { code },
    select: { id: true }
  });

  if (referralCode) {
    const [result, discountRates] = await Promise.all([
      registerReferralForExistingCustomer({ code, customerId, organizationId }),
      getReferralDiscountRatesForOrganization(organizationId)
    ]);
    return {
      kind: "referral",
      code,
      title: "友達紹介クーポン",
      description: result.alreadyRegistered
        ? "この友達紹介クーポンは登録済みです。"
        : `登録しました。あなたの初回お会計は${discountRates.referredCustomer}%OFFです。会計完了後、紹介者の次回お会計が${discountRates.referrer}%OFFになります。`,
      alreadyRegistered: result.alreadyRegistered
    };
  }

  const [coupon, issue, offer] = await Promise.all([
    prisma.coupon.findFirst({
      where: { customerId, couponCode: code },
      select: {
        title: true,
        targetMenu: true,
        discountType: true,
        discountValue: true,
        validFrom: true,
        validUntil: true,
        status: true
      }
    }),
    prisma.couponIssue.findFirst({
      where: { customerId, couponCode: code },
      select: {
        discountRate: true,
        expiresAt: true,
        issuedAt: true,
        status: true
      }
    }),
    prisma.customerOffer.findFirst({
      where: { customerId, couponCode: code },
      select: {
        title: true,
        benefit: true,
        validFrom: true,
        validUntil: true,
        status: true
      }
    })
  ]);
  const today = startOfToday();

  if (
    coupon &&
    isAvailableStatus(coupon.status) &&
    coupon.validFrom <= new Date() &&
    coupon.validUntil >= today
  ) {
    return {
      kind: "coupon",
      code,
      title: coupon.title,
      benefit: `${coupon.targetMenu}・${formatCouponDiscount(coupon.discountType, coupon.discountValue)}`,
      expiresAt: coupon.validUntil.toISOString()
    };
  }

  if (
    issue &&
    isAvailableStatus(issue.status) &&
    issue.issuedAt <= new Date() &&
    issue.expiresAt >= today
  ) {
    return {
      kind: "coupon",
      code,
      title: "あなた専用の限定クーポン",
      benefit: `${issue.discountRate}%OFF`,
      expiresAt: issue.expiresAt.toISOString()
    };
  }

  if (
    offer &&
    isAvailableStatus(offer.status) &&
    (!offer.validFrom || offer.validFrom <= new Date()) &&
    (!offer.validUntil || offer.validUntil >= today)
  ) {
    return {
      kind: "coupon",
      code,
      title: offer.title,
      benefit: offer.benefit ?? "店舗スタッフへコードをご提示ください。",
      expiresAt: offer.validUntil?.toISOString() ?? null
    };
  }

  throw new Error("このクーポンは利用できないか、有効期限が切れています。");
}
