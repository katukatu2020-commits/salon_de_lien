import { createHash, randomBytes, randomInt } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { POINT_VALID_DAYS, pointExpiresAt } from "@/lib/points/point-policy";
import {
  REVIEW_REWARD_ROLL_MAX,
  reviewRewardForRoll,
  reviewRewardPrizesFromSettings,
  reviewRewardTier
} from "@/lib/points/review-reward";
import {
  REFERRAL_DISCOUNT_RATES,
  type ReferralDiscountKind,
  referralDiscountAmount
} from "@/lib/points/referral-reward";
import { referralRatesFromOrganization, type ReferralDiscountRates } from "@/lib/salon/operational-settings";

type PointTx = Prisma.TransactionClient;

export const POINT_RULE_KEYS = {
  productReviewSubmitted: "product_review_submitted",
  productReviewUsedSubmitted: "product_review_used_submitted",
  feedbackSubmitted: "feedback_submitted",
  appointmentCheckoutCompleted: "appointment_checkout_completed"
} as const;

export const OWNER_CONFIGURABLE_POINT_RULE_KEYS = [
  POINT_RULE_KEYS.feedbackSubmitted,
  POINT_RULE_KEYS.appointmentCheckoutCompleted
] as const;

export const POINT_RULE_DEFINITIONS: Record<string, { label: string; eventType: string; points: number; validDays: number }> = {
  product_review_submitted: {
    label: "商品レビュー回答",
    eventType: "product_review_submitted",
    points: 30,
    validDays: POINT_VALID_DAYS
  },
  product_review_used_submitted: {
    label: "商品使用感レビュー回答",
    eventType: "product_review_used_submitted",
    points: 20,
    validDays: POINT_VALID_DAYS
  },
  feedback_submitted: {
    label: "来店後フィードバック回答",
    eventType: "feedback_submitted",
    points: 30,
    validDays: POINT_VALID_DAYS
  },
  appointment_checkout_completed: {
    label: "オンライン予約会計完了",
    eventType: "appointment_checkout_completed",
    points: 100,
    validDays: POINT_VALID_DAYS
  }
};

async function getCustomerPointSettingsTx(tx: PointTx, customerId: string) {
  const customer = await tx.customer.findUnique({
    where: { id: customerId },
    select: {
      organization: {
        select: {
          pointDefaultValidDays: true,
          pointMinimumRedeem: true,
          pointMaxRedemptionPercent: true,
          reviewPrizeFirstPoints: true,
          reviewPrizeFirstRate: true,
          reviewPrizeSecondPoints: true,
          reviewPrizeSecondRate: true,
          reviewPrizeThirdPoints: true,
          reviewPrizeThirdRate: true
        }
      }
    }
  });
  if (!customer) throw new Error("顧客が見つかりません。");
  return customer.organization;
}

export function addPointDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isOnlineReservationSource(source?: string | null) {
  return source === "お客様アプリ" || Boolean(source?.startsWith("gmail:"));
}

export function hashReferralToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function getOrCreatePointAccount(customerId: string) {
  return prisma.customerPointAccount.upsert({
    where: { customerId },
    update: {},
    create: { customerId }
  });
}

async function getOrCreatePointAccountTx(tx: PointTx, customerId: string) {
  const account = await tx.customerPointAccount.upsert({
    where: { customerId },
    update: {},
    create: { customerId }
  });
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerPointAccount" WHERE "id" = ${account.id} FOR UPDATE`);
  return tx.customerPointAccount.findUniqueOrThrow({ where: { id: account.id } });
}

async function getPointRuleTx(tx: PointTx, key: string) {
  const fallback = POINT_RULE_DEFINITIONS[key];
  const rule = await tx.pointRule.findFirst({
    where: {
      key,
      active: true
    }
  });

  if (rule) {
    return rule;
  }

  if (!fallback) {
    throw new Error(`ポイントルールが見つかりません: ${key}`);
  }

  return fallback;
}

export async function awardPointsAmount({
  customerId,
  amount,
  sourceType,
  sourceId,
  reason,
  note,
  createdByStaffId,
  type = "earn"
}: {
  customerId: string;
  amount: number;
  sourceType: string;
  sourceId?: string | null;
  reason: string;
  note?: string | null;
  createdByStaffId?: string | null;
  type?: "earn" | "adjust";
}) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("付与ポイントは1pt以上の整数で指定してください。");
  }

  return prisma.$transaction(async (tx) => {
    if (sourceId) {
      const existing = await tx.pointTransaction.findFirst({
        where: {
          sourceType,
          sourceId,
          type
        },
        select: { id: true, amount: true }
      });

      if (existing) {
        return { awardedPoints: 0, balanceAfter: null, transactionId: existing.id, duplicate: true };
      }
    }

    const [account, settings] = await Promise.all([
      getOrCreatePointAccountTx(tx, customerId),
      getCustomerPointSettingsTx(tx, customerId)
    ]);
    const expiresAt = pointExpiresAt(new Date(), settings.pointDefaultValidDays);
    const balanceAfter = account.availablePoints + amount;
    const transaction = await tx.pointTransaction.create({
      data: {
        customerId,
        accountId: account.id,
        type,
        amount,
        balanceAfter,
        sourceType,
        sourceId: sourceId ?? null,
        reason,
        note: note ?? null,
        expiresAt,
        createdByStaffId: createdByStaffId ?? null
      }
    });

    await tx.pointLot.create({
      data: {
        customerId,
        earnTransactionId: transaction.id,
        originalAmount: amount,
        remainingAmount: amount,
        expiresAt
      }
    });

    await tx.customerPointAccount.update({
      where: { id: account.id },
      data: {
        availablePoints: { increment: amount },
        lifetimeEarned: { increment: amount }
      }
    });

    return { awardedPoints: amount, balanceAfter, transactionId: transaction.id, duplicate: false };
  });
}

async function awardRulePointsInTransaction(
  tx: PointTx,
  customerId: string,
  ruleKey: string,
  sourceType: string,
  sourceId: string,
  options?: { reason?: string; note?: string; awardedAt?: Date }
) {
  const rule = await getPointRuleTx(tx, ruleKey);
  const existing = await tx.pointTransaction.findFirst({
    where: {
      sourceType,
      sourceId,
      type: "earn"
    },
    select: { id: true, amount: true }
  });

  if (existing) {
    return { awardedPoints: 0, existingPoints: existing.amount, transactionId: existing.id, duplicate: true };
  }

  const awardedAt = options?.awardedAt ?? new Date();
  const account = await getOrCreatePointAccountTx(tx, customerId);
  const expiresAt = pointExpiresAt(awardedAt, rule.validDays);
  const balanceAfter = account.availablePoints + rule.points;
  const transaction = await tx.pointTransaction.create({
    data: {
      customerId,
      accountId: account.id,
      type: "earn",
      amount: rule.points,
      balanceAfter,
      sourceType,
      sourceId,
      reason: options?.reason ?? rule.label,
      note: options?.note ?? null,
      expiresAt,
      createdAt: awardedAt
    }
  });

  await tx.pointLot.create({
    data: {
      customerId,
      earnTransactionId: transaction.id,
      originalAmount: rule.points,
      remainingAmount: rule.points,
      expiresAt,
      createdAt: awardedAt
    }
  });

  await tx.customerPointAccount.update({
    where: { id: account.id },
    data: {
      availablePoints: { increment: rule.points },
      lifetimeEarned: { increment: rule.points }
    }
  });

  return {
    awardedPoints: rule.points,
    existingPoints: 0,
    transactionId: transaction.id,
    duplicate: false
  };
}

export async function awardPoints(customerId: string, ruleKey: string, sourceType: string, sourceId: string, options?: { reason?: string; note?: string }) {
  return prisma.$transaction((tx) => awardRulePointsInTransaction(tx, customerId, ruleKey, sourceType, sourceId, options));
}

export async function awardProductReviewPointsInTransaction(
  tx: PointTx,
  customerId: string,
  productReviewId: string,
  _usedStatus: string
) {
    void _usedStatus;
    const settings = await getCustomerPointSettingsTx(tx, customerId);
    const prizes = reviewRewardPrizesFromSettings({
      firstPoints: settings.reviewPrizeFirstPoints,
      firstRate: settings.reviewPrizeFirstRate,
      secondPoints: settings.reviewPrizeSecondPoints,
      secondRate: settings.reviewPrizeSecondRate,
      thirdPoints: settings.reviewPrizeThirdPoints,
      thirdRate: settings.reviewPrizeThirdRate
    });
    const existing = await tx.pointTransaction.findFirst({
      where: {
        sourceType: "product_review",
        sourceId: productReviewId,
        type: "earn"
      },
      select: { id: true, amount: true, expiresAt: true }
    });

    if (existing) {
      return {
        awardedPoints: existing.amount,
        prizeTier: reviewRewardTier(existing.amount, prizes),
        prizes,
        transactionId: existing.id,
        expiresAt: existing.expiresAt,
        duplicate: true
      };
    }

    const points = reviewRewardForRoll(randomInt(REVIEW_REWARD_ROLL_MAX), prizes);
    const account = await getOrCreatePointAccountTx(tx, customerId);
    const expiresAt = pointExpiresAt(new Date(), settings.pointDefaultValidDays);
    const balanceAfter = account.availablePoints + points;
    const transaction = await tx.pointTransaction.create({
      data: {
        customerId,
        accountId: account.id,
        type: "earn",
        amount: points,
        balanceAfter,
        sourceType: "product_review",
        sourceId: productReviewId,
        reason: `商品アンケート抽選 ${reviewRewardTier(points, prizes)}等`,
        expiresAt
      }
    });

    await tx.pointLot.create({
      data: {
        customerId,
        earnTransactionId: transaction.id,
        originalAmount: points,
        remainingAmount: points,
        expiresAt
      }
    });

    await tx.customerPointAccount.update({
      where: { id: account.id },
      data: {
        availablePoints: { increment: points },
        lifetimeEarned: { increment: points }
      }
    });

  return {
    awardedPoints: points,
    prizeTier: reviewRewardTier(points, prizes),
    prizes,
    transactionId: transaction.id,
    expiresAt,
    duplicate: false
  };
}

export async function awardAppointmentCheckoutPointsInTransaction(
  tx: PointTx,
  customerId: string,
  appointmentId: string,
  paidAt = new Date()
) {
  const sourceType = "appointment_checkout";
  const existing = await tx.pointTransaction.findFirst({
    where: { sourceType, sourceId: appointmentId, type: "earn" },
    select: { id: true }
  });
  if (existing) {
    return { awardedPoints: 0, transactionId: existing.id, duplicate: true };
  }

  const rule = await getPointRuleTx(tx, POINT_RULE_KEYS.appointmentCheckoutCompleted);
  const account = await getOrCreatePointAccountTx(tx, customerId);
  const expiresAt = pointExpiresAt(paidAt, rule.validDays);
  const balanceAfter = account.availablePoints + rule.points;
  const transaction = await tx.pointTransaction.create({
    data: {
      customerId,
      accountId: account.id,
      type: "earn",
      amount: rule.points,
      balanceAfter,
      sourceType,
      sourceId: appointmentId,
      reason: "オンライン予約・会計完了特典",
      expiresAt
    }
  });
  await tx.pointLot.create({
    data: {
      customerId,
      earnTransactionId: transaction.id,
      originalAmount: rule.points,
      remainingAmount: rule.points,
      expiresAt
    }
  });
  await tx.customerPointAccount.update({
    where: { id: account.id },
    data: {
      availablePoints: { increment: rule.points },
      lifetimeEarned: { increment: rule.points }
    }
  });

  return { awardedPoints: rule.points, transactionId: transaction.id, duplicate: false, expiresAt };
}

export async function awardProductReviewPoints(customerId: string, productReviewId: string, usedStatus: string) {
  return prisma.$transaction((tx) => awardProductReviewPointsInTransaction(tx, customerId, productReviewId, usedStatus));
}

export async function awardFeedbackPoints(customerId: string, feedbackId: string) {
  return awardPoints(customerId, POINT_RULE_KEYS.feedbackSubmitted, "feedback", feedbackId, {
    reason: "来店後フィードバック回答"
  });
}

export async function awardFeedbackPointsInTransaction(tx: PointTx, customerId: string, feedbackId: string) {
  const rule = await getPointRuleTx(tx, POINT_RULE_KEYS.feedbackSubmitted);
  const existing = await tx.pointTransaction.findFirst({
    where: { sourceType: "feedback", sourceId: feedbackId, type: "earn" },
    select: { id: true }
  });
  if (existing) return { awardedPoints: 0, transactionId: existing.id, duplicate: true };

  const account = await getOrCreatePointAccountTx(tx, customerId);
  const expiresAt = pointExpiresAt(new Date(), rule.validDays);
  const balanceAfter = account.availablePoints + rule.points;
  const transaction = await tx.pointTransaction.create({
    data: {
      customerId,
      accountId: account.id,
      type: "earn",
      amount: rule.points,
      balanceAfter,
      sourceType: "feedback",
      sourceId: feedbackId,
      reason: "来店後フィードバック回答",
      expiresAt
    }
  });
  await tx.pointLot.create({
    data: {
      customerId,
      earnTransactionId: transaction.id,
      originalAmount: rule.points,
      remainingAmount: rule.points,
      expiresAt
    }
  });
  await tx.customerPointAccount.update({
    where: { id: account.id },
    data: {
      availablePoints: { increment: rule.points },
      lifetimeEarned: { increment: rule.points }
    }
  });
  return { awardedPoints: rule.points, transactionId: transaction.id, duplicate: false };
}

async function getAvailableLotsTx(tx: PointTx, customerId: string, now = new Date()) {
  return tx.pointLot.findMany({
    where: {
      customerId,
      remainingAmount: { gt: 0 },
      expiresAt: { gte: now }
    },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }]
  });
}

async function consumeLotsTx(tx: PointTx, customerId: string, points: number) {
  const lots = await getAvailableLotsTx(tx, customerId);
  let remaining = points;
  const allocations: { pointLotId: string; amount: number }[] = [];

  for (const lot of lots) {
    if (remaining <= 0) {
      break;
    }

    const amount = Math.min(lot.remainingAmount, remaining);
    await tx.pointLot.update({
      where: { id: lot.id },
      data: { remainingAmount: { decrement: amount } }
    });
    allocations.push({ pointLotId: lot.id, amount });
    remaining -= amount;
  }

  if (remaining > 0) {
    throw new Error("利用できる有効ポイントが不足しています。");
  }

  return allocations;
}

type RedeemPointsInput = {
  customerId: string;
  points: number;
  checkoutAmount: number;
  visitId?: string | null;
  couponIssueId?: string | null;
  checkoutSourceId?: string | null;
  note?: string | null;
};

export async function redeemPointsInTransaction(
  tx: PointTx,
  {
  customerId,
  points,
  checkoutAmount,
  visitId,
  couponIssueId,
  checkoutSourceId,
  note
  }: RedeemPointsInput
) {
  if (!Number.isInteger(points) || points <= 0) {
    throw new Error("利用ポイントは1pt以上の整数で指定してください。");
  }

  if (!Number.isInteger(checkoutAmount) || checkoutAmount <= 0) {
    throw new Error("会計金額を入力してください。");
  }

  const settings = await getCustomerPointSettingsTx(tx, customerId);
  if (points < settings.pointMinimumRedeem) {
    throw new Error(`ポイントは${settings.pointMinimumRedeem}ptから利用できます。`);
  }

  const maxRedeem = Math.floor(checkoutAmount * (settings.pointMaxRedemptionPercent / 100));
  if (points > maxRedeem) {
    throw new Error(`1回の会計で使えるポイントは会計金額の${settings.pointMaxRedemptionPercent}%までです。`);
  }

  const account = await getOrCreatePointAccountTx(tx, customerId);
  if (points > account.availablePoints) {
    throw new Error("保有ポイントを超えて利用できません。");
  }

  const allocations = await consumeLotsTx(tx, customerId, points);
  const balanceAfter = account.availablePoints - points;
  const transaction = await tx.pointTransaction.create({
    data: {
      customerId,
      accountId: account.id,
      type: "redeem",
      amount: -points,
      balanceAfter,
      sourceType: "checkout",
      sourceId: checkoutSourceId ?? visitId ?? couponIssueId ?? `checkout-${randomBytes(8).toString("hex")}`,
      reason: "会計時ポイント利用",
      note: note ?? null
    }
  });

  await tx.pointRedemptionAllocation.createMany({
    data: allocations.map((allocation) => ({
      redeemTransactionId: transaction.id,
      pointLotId: allocation.pointLotId,
      amount: allocation.amount
    }))
  });

  await tx.customerPointAccount.update({
    where: { id: account.id },
    data: {
      availablePoints: { decrement: points },
      lifetimeRedeemed: { increment: points }
    }
  });

  return { usedPoints: points, balanceAfter, discountAmount: points, transactionId: transaction.id };
}

export async function redeemPoints(input: RedeemPointsInput) {
  await expirePointsForCustomer(input.customerId);
  return prisma.$transaction((tx) => redeemPointsInTransaction(tx, input));
}

export async function adjustPoints({
  customerId,
  amount,
  reason,
  note,
  createdByStaffId
}: {
  customerId: string;
  amount: number;
  reason: string;
  note?: string | null;
  createdByStaffId: string;
}) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error("調整ポイントは0以外の整数で指定してください。");
  }

  if (amount > 0) {
    return awardPointsAmount({
      customerId,
      amount,
      sourceType: "manual",
      sourceId: `manual-${randomBytes(12).toString("hex")}`,
      reason,
      note,
      createdByStaffId,
      type: "adjust"
    });
  }

  const points = Math.abs(amount);
  await expirePointsForCustomer(customerId);

  return prisma.$transaction(async (tx) => {
    const account = await getOrCreatePointAccountTx(tx, customerId);
    if (points > account.availablePoints) {
      throw new Error("保有ポイントを超えて減算できません。");
    }

    await consumeLotsTx(tx, customerId, points);
    const balanceAfter = account.availablePoints - points;
    const transaction = await tx.pointTransaction.create({
      data: {
        customerId,
        accountId: account.id,
        type: "adjust",
        amount,
        balanceAfter,
        sourceType: "manual",
        sourceId: `manual-${randomBytes(12).toString("hex")}`,
        reason,
        note: note ?? null,
        createdByStaffId
      }
    });

    await tx.customerPointAccount.update({
      where: { id: account.id },
      data: { availablePoints: { decrement: points } }
    });

    return { adjustedPoints: amount, balanceAfter, transactionId: transaction.id };
  });
}

export async function expirePointsForCustomer(customerId: string, now = new Date()) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.customerPointAccount.findUnique({
      where: { customerId }
    });

    if (!account) {
      return { expiredPoints: 0 };
    }

    const lots = await tx.pointLot.findMany({
      where: {
        customerId,
        remainingAmount: { gt: 0 },
        expiresAt: { lt: now }
      },
      orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }]
    });

    let expiredPoints = 0;
    let balance = account.availablePoints;

    for (const lot of lots) {
      const amount = lot.remainingAmount;
      const existing = await tx.pointTransaction.findFirst({
        where: {
          sourceType: "manual",
          sourceId: lot.id,
          type: "expire"
        },
        select: { id: true }
      });

      if (existing) {
        await tx.pointLot.update({
          where: { id: lot.id },
          data: { remainingAmount: 0 }
        });
        continue;
      }

      balance -= amount;
      await tx.pointTransaction.create({
        data: {
          customerId,
          accountId: account.id,
          type: "expire",
          amount: -amount,
          balanceAfter: balance,
          sourceType: "manual",
          sourceId: lot.id,
          reason: "ポイント有効期限切れ",
          expiresAt: lot.expiresAt
        }
      });
      await tx.pointLot.update({
        where: { id: lot.id },
        data: { remainingAmount: 0 }
      });
      expiredPoints += amount;
    }

    if (expiredPoints > 0) {
      await tx.customerPointAccount.update({
        where: { id: account.id },
        data: {
          availablePoints: { decrement: expiredPoints },
          lifetimeExpired: { increment: expiredPoints }
        }
      });
    }

    return { expiredPoints };
  });
}

export async function expireAllPoints(organizationId?: string | null) {
  const lots = await prisma.pointLot.findMany({
    where: {
      remainingAmount: { gt: 0 },
      expiresAt: { lt: new Date() },
      ...(organizationId ? { customer: { organizationId } } : {})
    },
    distinct: ["customerId"],
    select: { customerId: true }
  });

  let expiredPoints = 0;
  for (const lot of lots) {
    const result = await expirePointsForCustomer(lot.customerId);
    expiredPoints += result.expiredPoints;
  }

  return { expiredPoints, customerCount: lots.length };
}

export async function getPointBalance(customerId: string) {
  await expirePointsForCustomer(customerId);
  const account = await getOrCreatePointAccount(customerId);
  const soon = addPointDays(new Date(), 30);
  const expiringLots = await prisma.pointLot.findMany({
    where: {
      customerId,
      remainingAmount: { gt: 0 },
      expiresAt: { lte: soon }
    },
    orderBy: { expiresAt: "asc" },
    select: {
      remainingAmount: true,
      expiresAt: true
    }
  });

  return {
    customerId,
    availablePoints: account.availablePoints,
    pendingPoints: account.pendingPoints,
    lifetimeEarned: account.lifetimeEarned,
    lifetimeRedeemed: account.lifetimeRedeemed,
    lifetimeExpired: account.lifetimeExpired,
    expiringSoon: expiringLots.map((lot) => ({
      points: lot.remainingAmount,
      expiresAt: lot.expiresAt
    }))
  };
}

export async function getPointTransactions(customerId: string) {
  return prisma.pointTransaction.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      type: true,
      amount: true,
      balanceAfter: true,
      sourceType: true,
      sourceId: true,
      reason: true,
      note: true,
      expiresAt: true,
      createdByStaffId: true,
      createdAt: true
    }
  });
}

export async function createReferralForCustomer(customerId: string, baseUrl?: string | null) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = `LIEN-${randomBytes(4).toString("base64url").replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 6)}`;
    const tokenHash = hashReferralToken(code);
    try {
      const referral = await prisma.referral.create({
        data: {
          referrerCustomerId: customerId,
          code,
          tokenHash,
          status: "issued"
        }
      });
      const path = `/referral/${encodeURIComponent(code)}`;
      const referralUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}${path}` : path;
      return { referral, code, referralUrl, expiresAt: null };
    } catch (error) {
      if (attempt === 19) {
        throw error;
      }
    }
  }

  throw new Error("紹介コードを発行できませんでした。");
}

export async function registerReferralForExistingCustomer({
  code,
  customerId,
  organizationId
}: {
  code: string;
  customerId: string;
  organizationId: string;
}) {
  const normalizedCode = code.trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    const referral = await tx.referral.findUnique({
      where: { code: normalizedCode },
      select: {
        id: true,
        referrerCustomerId: true,
        referredCustomerId: true,
        status: true,
        expiresAt: true,
        referrerCustomer: { select: { organizationId: true } }
      }
    });

    if (!referral || !["issued", "registered"].includes(referral.status)) {
      throw new Error("この紹介クーポンは利用できません。");
    }

    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Referral" WHERE "id" = ${referral.id} FOR UPDATE`);
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Customer" WHERE "id" = ${customerId} FOR UPDATE`);

    const [lockedReferral, customer] = await Promise.all([
      tx.referral.findUniqueOrThrow({
        where: { id: referral.id },
        select: {
          id: true,
          referrerCustomerId: true,
          referredCustomerId: true,
          status: true,
          expiresAt: true
        }
      }),
      tx.customer.findFirst({
        where: { id: customerId, organizationId, deletedAt: null },
        select: { id: true, referredByCustomerId: true }
      })
    ]);

    if (!customer) {
      throw new Error("お客様情報を確認できませんでした。");
    }
    if (referral.referrerCustomer.organizationId !== organizationId) {
      throw new Error("この紹介クーポンは別の店舗で発行されています。");
    }
    if (lockedReferral.referrerCustomerId === customerId) {
      throw new Error("ご自身の紹介クーポンは登録できません。");
    }
    if (lockedReferral.status === "registered" && lockedReferral.referredCustomerId === customerId) {
      return { referralId: lockedReferral.id, code: normalizedCode, alreadyRegistered: true };
    }
    if (lockedReferral.status !== "issued" || lockedReferral.referredCustomerId) {
      throw new Error("この紹介クーポンはすでに利用されています。");
    }

    const [existingReferral, visitCount, saleCount] = await Promise.all([
      tx.referral.findFirst({
        where: {
          referredCustomerId: customerId,
          status: { in: ["registered", "first_visit_completed", "rewarded"] }
        },
        select: { id: true }
      }),
      tx.visit.count({ where: { customerId } }),
      tx.serviceSale.count({ where: { customerId } })
    ]);

    if (customer.referredByCustomerId || existingReferral) {
      throw new Error("友達紹介クーポンはすでに登録されています。");
    }
    if (visitCount > 0 || saleCount > 0) {
      throw new Error("友達紹介クーポンは初回来店前のお客様のみ登録できます。");
    }

    const registeredAt = new Date();
    await tx.customer.update({
      where: { id: customerId },
      data: { referredByCustomerId: lockedReferral.referrerCustomerId }
    });
    await tx.referral.update({
      where: { id: lockedReferral.id },
      data: {
        referredCustomerId: customerId,
        status: "registered",
        registeredAt
      }
    });

    return { referralId: lockedReferral.id, code: normalizedCode, alreadyRegistered: false };
  });
}

export type ReferralCheckoutDiscount = {
  referralId: string;
  kind: ReferralDiscountKind;
  rate: number;
  label: string;
};

async function findReferralDiscountRates(
  db: Pick<PointTx, "organization">,
  organizationId: string
): Promise<ReferralDiscountRates> {
  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    select: {
      referralReferrerDiscountRate: true,
      referralReferredDiscountRate: true
    }
  });
  return organization ? referralRatesFromOrganization(organization) : REFERRAL_DISCOUNT_RATES;
}

async function findReferralDiscountRatesForCustomer(
  db: Pick<PointTx, "customer" | "organization">,
  customerId: string
) {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { organizationId: true }
  });
  return customer
    ? findReferralDiscountRates(db, customer.organizationId)
    : REFERRAL_DISCOUNT_RATES;
}

export async function getReferralDiscountRatesForOrganization(organizationId: string) {
  return findReferralDiscountRates(prisma, organizationId);
}

export async function getReferralDiscountRatesForCustomer(customerId: string) {
  return findReferralDiscountRatesForCustomer(prisma, customerId);
}

function referralDiscountView(
  referralId: string,
  kind: ReferralDiscountKind,
  rates: ReferralDiscountRates
): ReferralCheckoutDiscount {
  const isReferrer = kind === "referrer";
  const rate = isReferrer
    ? rates.referrer
    : rates.referredCustomer;

  return {
    referralId,
    kind,
    rate,
    label: isReferrer
      ? `友達紹介（紹介者）${rate}%OFF`
      : `友達紹介（紹介された方）${rate}%OFF`
  };
}

async function findReferralCheckoutDiscount(
  db: Pick<PointTx, "referral" | "customer" | "organization">,
  customerId: string
): Promise<ReferralCheckoutDiscount | null> {
  const rates = await findReferralDiscountRatesForCustomer(db, customerId);
  const referredDiscount = await db.referral.findFirst({
    where: {
      referredCustomerId: customerId,
      status: "registered",
      referredDiscountUsedAt: null
    },
    orderBy: { registeredAt: "asc" },
    select: { id: true }
  });
  if (referredDiscount) {
    return referralDiscountView(referredDiscount.id, "referred_customer", rates);
  }

  const referrerDiscount = await db.referral.findFirst({
    where: {
      referrerCustomerId: customerId,
      status: "rewarded",
      referrerDiscountIssuedAt: { not: null },
      referrerDiscountUsedAt: null
    },
    orderBy: { referrerDiscountIssuedAt: "asc" },
    select: { id: true }
  });

  return referrerDiscount
    ? referralDiscountView(referrerDiscount.id, "referrer", rates)
    : null;
}

export async function getReferralCheckoutDiscount(customerId: string) {
  return findReferralCheckoutDiscount(prisma, customerId);
}

export async function applyReferralCheckoutDiscountInTransaction(
  tx: PointTx,
  customerId: string,
  serviceAmount: number,
  usedAt = new Date()
) {
  const candidate = await findReferralCheckoutDiscount(tx, customerId);
  if (!candidate) {
    return { discount: null, amount: 0 };
  }

  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "Referral" WHERE "id" = ${candidate.referralId} FOR UPDATE`
  );

  const locked = await tx.referral.findUniqueOrThrow({
    where: { id: candidate.referralId },
    select: {
      id: true,
      referrerCustomerId: true,
      referredCustomerId: true,
      status: true,
      referrerDiscountIssuedAt: true,
      referrerDiscountUsedAt: true,
      referredDiscountUsedAt: true
    }
  });

  const canUseReferredDiscount =
    candidate.kind === "referred_customer" &&
    locked.referredCustomerId === customerId &&
    locked.status === "registered" &&
    !locked.referredDiscountUsedAt;
  const canUseReferrerDiscount =
    candidate.kind === "referrer" &&
    locked.referrerCustomerId === customerId &&
    locked.status === "rewarded" &&
    Boolean(locked.referrerDiscountIssuedAt) &&
    !locked.referrerDiscountUsedAt;

  if (!canUseReferredDiscount && !canUseReferrerDiscount) {
    return { discount: null, amount: 0 };
  }

  const amount = referralDiscountAmount(serviceAmount, candidate.rate);
  if (amount <= 0) {
    return { discount: null, amount: 0 };
  }

  await tx.referral.update({
    where: { id: locked.id },
    data:
      candidate.kind === "referrer"
        ? { referrerDiscountUsedAt: usedAt }
        : { referredDiscountUsedAt: usedAt }
  });

  return { discount: candidate, amount };
}

export async function completeReferralFirstVisitInTransaction(
  tx: PointTx,
  referredCustomerId: string,
  completedAt = new Date()
) {
  const rates = await findReferralDiscountRatesForCustomer(tx, referredCustomerId);
  const referral = await tx.referral.findFirst({
    where: {
      referredCustomerId,
      status: { in: ["registered", "first_visit_completed", "rewarded"] }
    },
    orderBy: { createdAt: "asc" }
  });

  if (!referral) {
    return { awardedPoints: 0, referrerAwardedPoints: 0, referredAwardedPoints: 0, skipped: true };
  }

  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Referral" WHERE "id" = ${referral.id} FOR UPDATE`);
  const lockedReferral = await tx.referral.findUniqueOrThrow({ where: { id: referral.id } });

  if (lockedReferral.status === "rewarded") {
    return {
      awardedPoints: 0,
      referrerAwardedPoints: 0,
      referredAwardedPoints: 0,
      referrerDiscountRate: rates.referrer,
      referredDiscountRate: rates.referredCustomer,
      referralId: lockedReferral.id,
      duplicate: true,
      skipped: true
    };
  }

  if (lockedReferral.referrerCustomerId === referredCustomerId) {
    await tx.referral.update({
      where: { id: lockedReferral.id },
      data: { status: "cancelled" }
    });
    return { awardedPoints: 0, referrerAwardedPoints: 0, referredAwardedPoints: 0, skipped: true };
  }

  const saleCount = await tx.serviceSale.count({
    where: { customerId: referredCustomerId }
  });

  if (saleCount === 0) {
    return { awardedPoints: 0, referrerAwardedPoints: 0, referredAwardedPoints: 0, skipped: true };
  }

  if (!lockedReferral.referredDiscountUsedAt) {
    return { awardedPoints: 0, referrerAwardedPoints: 0, referredAwardedPoints: 0, skipped: true };
  }

  await tx.referral.update({
    where: { id: lockedReferral.id },
    data: {
      status: "rewarded",
      firstVisitCompletedAt: lockedReferral.firstVisitCompletedAt ?? completedAt,
      rewardedAt: completedAt,
      referrerDiscountIssuedAt: lockedReferral.referrerDiscountIssuedAt ?? completedAt,
      referredDiscountUsedAt: lockedReferral.referredDiscountUsedAt
    }
  });

  return {
    awardedPoints: 0,
    referrerAwardedPoints: 0,
    referredAwardedPoints: 0,
    referrerDiscountRate: rates.referrer,
    referredDiscountRate: rates.referredCustomer,
    referralId: lockedReferral.id,
    duplicate: false,
    skipped: false
  };
}

export async function completeReferralFirstVisitForCustomer(referredCustomerId: string) {
  return prisma.$transaction((tx) => completeReferralFirstVisitInTransaction(tx, referredCustomerId));
}
