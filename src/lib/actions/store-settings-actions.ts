"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { OWNER_CONFIGURABLE_POINT_RULE_KEYS, POINT_RULE_DEFINITIONS } from "@/lib/points/point-service";
import { prisma } from "@/lib/prisma";

function formInteger(formData: FormData, key: string) {
  const raw = formData.get(key);
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isInteger(value) ? value : Number.NaN;
}

function assertRange(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label}は${minimum}〜${maximum}の整数で入力してください。`);
  }
}

export async function updateStoreOperationalSettingsAction(formData: FormData) {
  const session = await requireBackofficeSession(["ADMIN"]);
  if (!session.organizationId) throw new Error("店舗所属が設定されていません。");

  const taxRate = formInteger(formData, "taxRate");
  const defaultCouponDiscountRate = formInteger(formData, "defaultCouponDiscountRate");
  const referralReferrerDiscountRate = formInteger(formData, "referralReferrerDiscountRate");
  const referralReferredDiscountRate = formInteger(formData, "referralReferredDiscountRate");
  const pointDefaultValidDays = formInteger(formData, "pointDefaultValidDays");
  const pointMinimumRedeem = formInteger(formData, "pointMinimumRedeem");
  const pointMaxRedemptionPercent = formInteger(formData, "pointMaxRedemptionPercent");
  const reviewPrizeFirstPoints = formInteger(formData, "reviewPrizeFirstPoints");
  const reviewPrizeFirstRate = formInteger(formData, "reviewPrizeFirstRate");
  const reviewPrizeSecondPoints = formInteger(formData, "reviewPrizeSecondPoints");
  const reviewPrizeSecondRate = formInteger(formData, "reviewPrizeSecondRate");
  const reviewPrizeThirdPoints = formInteger(formData, "reviewPrizeThirdPoints");
  const reviewPrizeThirdRate = formInteger(formData, "reviewPrizeThirdRate");
  const couponDefaultValidDays = formInteger(formData, "couponDefaultValidDays");
  const couponMaxValidDays = formInteger(formData, "couponMaxValidDays");
  const couponMinimumDiscountRate = formInteger(formData, "couponMinimumDiscountRate");
  const couponMaximumDiscountRate = formInteger(formData, "couponMaximumDiscountRate");

  assertRange(taxRate, 0, 30, "消費税率");
  assertRange(defaultCouponDiscountRate, 1, 90, "限定クーポンの初期割引率");
  assertRange(referralReferrerDiscountRate, 1, 50, "紹介者の割引率");
  assertRange(referralReferredDiscountRate, 1, 50, "紹介された方の割引率");
  assertRange(pointDefaultValidDays, 1, 365, "ポイント標準有効日数");
  assertRange(pointMinimumRedeem, 1, 100_000, "ポイント最低利用数");
  assertRange(pointMaxRedemptionPercent, 1, 100, "会計で利用できる上限率");
  assertRange(reviewPrizeFirstPoints, 1, 100_000, "1等ポイント");
  assertRange(reviewPrizeSecondPoints, 1, 100_000, "2等ポイント");
  assertRange(reviewPrizeThirdPoints, 1, 100_000, "3等ポイント");
  assertRange(reviewPrizeFirstRate, 0, 100, "1等確率");
  assertRange(reviewPrizeSecondRate, 0, 100, "2等確率");
  assertRange(reviewPrizeThirdRate, 0, 100, "3等確率");
  if (reviewPrizeFirstRate + reviewPrizeSecondRate + reviewPrizeThirdRate !== 100) {
    throw new Error("抽選確率の合計は100%にしてください。");
  }
  assertRange(couponDefaultValidDays, 1, 365, "クーポン標準有効日数");
  assertRange(couponMaxValidDays, 1, 365, "クーポン有効日数上限");
  assertRange(couponMinimumDiscountRate, 1, 90, "クーポン最低割引率");
  assertRange(couponMaximumDiscountRate, 1, 90, "クーポン最大割引率");
  if (couponDefaultValidDays > couponMaxValidDays) throw new Error("クーポン標準有効日数は上限以内にしてください。");
  if (couponMinimumDiscountRate > couponMaximumDiscountRate) throw new Error("クーポン割引率の最小値と最大値を確認してください。");
  if (defaultCouponDiscountRate < couponMinimumDiscountRate || defaultCouponDiscountRate > couponMaximumDiscountRate) {
    throw new Error("限定クーポン初期値は設定した割引率の範囲内にしてください。");
  }

  const pointRuleUpdates = OWNER_CONFIGURABLE_POINT_RULE_KEYS.map((key) => {
    const definition = POINT_RULE_DEFINITIONS[key];
    const points = formInteger(formData, `pointRule:${key}:points`);
    const validDays = formInteger(formData, `pointRule:${key}:validDays`);
    assertRange(points, 0, 100_000, `${definition.label}の付与ポイント`);
    assertRange(validDays, 1, 365, `${definition.label}の有効日数`);
    return { key, definition, points, validDays, active: formData.get(`pointRule:${key}:active`) === "on" };
  });

  const stockUpdates = Array.from(formData.entries()).flatMap(([key, raw]) => {
    if (!key.startsWith("stockQuantity:")) return [];
    const productId = key.slice("stockQuantity:".length);
    const quantity = typeof raw === "string" ? Number(raw) : Number.NaN;
    assertRange(quantity, 0, 100_000, "在庫数");
    return [{ productId, quantity }];
  });

  await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.findUnique({
      where: { id: session.organizationId! },
      select: { id: true }
    });
    if (!organization) throw new Error("店舗情報が見つかりません。");

    await tx.organization.update({
      where: { id: organization.id },
      data: {
        taxRate,
        defaultCouponDiscountRate,
        referralReferrerDiscountRate,
        referralReferredDiscountRate,
        pointDefaultValidDays,
        pointMinimumRedeem,
        pointMaxRedemptionPercent,
        reviewPrizeFirstPoints,
        reviewPrizeFirstRate,
        reviewPrizeSecondPoints,
        reviewPrizeSecondRate,
        reviewPrizeThirdPoints,
        reviewPrizeThirdRate,
        couponDefaultValidDays,
        couponMaxValidDays,
        couponMinimumDiscountRate,
        couponMaximumDiscountRate
      }
    });

    for (const rule of pointRuleUpdates) {
      await tx.pointRule.upsert({
        where: { key: rule.key },
        update: { points: rule.points, validDays: rule.validDays, active: rule.active },
        create: {
          key: rule.key,
          label: rule.definition.label,
          eventType: rule.definition.eventType,
          points: rule.points,
          validDays: rule.validDays,
          active: rule.active
        }
      });
    }

    for (const stock of stockUpdates) {
      const updated = await tx.product.updateMany({
        where: {
          id: stock.productId,
          organizationId: organization.id,
          active: true
        },
        data: { stockQuantity: stock.quantity }
      });
      if (updated.count !== 1) throw new Error("在庫を更新できない商品が含まれています。画面を更新してください。");
    }
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/products");
  revalidatePath("/admin/appointments", "layout");
  revalidatePath("/u/points");
  redirect("/admin/settings?notice=saved");
}
