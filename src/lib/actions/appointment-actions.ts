"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { createProductReviewRequestRecord } from "@/lib/products/product-review";
import {
  applyReferralCheckoutDiscountInTransaction,
  awardAppointmentCheckoutPointsInTransaction,
  completeReferralFirstVisitInTransaction,
  expirePointsForCustomer,
  isOnlineReservationSource,
  redeemPointsInTransaction
} from "@/lib/points/point-service";
import { ensureHistoryVisit } from "@/lib/visits/history-visit";
import {
  isLongHairLength,
  longHairFee,
  percentageDiscountAmount
} from "@/lib/appointments/checkout-items";
import { includedTaxAmount } from "@/lib/salon/operational-settings";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formInteger(formData: FormData, key: string) {
  const value = Number(formString(formData, key));
  return Number.isInteger(value) ? value : Number.NaN;
}

export async function completeAppointmentCheckoutAction(appointmentId: string, formData: FormData) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  const menu = formString(formData, "menu");
  const subtotal = formInteger(formData, "subtotal");
  const pointDiscount = formInteger(formData, "pointDiscount");
  const paymentMethod = formString(formData, "paymentMethod");
  const longHairLength = formString(formData, "longHairLength");
  const couponSelection = formString(formData, "couponSelection");
  const productIds = formData.getAll("productId").map((value) => (typeof value === "string" ? value.trim() : ""));
  const productQuantities = formData.getAll("productQuantity").map((value) => Number(value));
  let customerId = "";
  let errorMessage = "";

  try {
    if (!menu) throw new Error("本日のメニューを入力してください。");
    if (!Number.isInteger(subtotal) || subtotal <= 0) throw new Error("施術料金を正しく入力してください。");
    if (!Number.isInteger(pointDiscount) || pointDiscount < 0) throw new Error("利用ポイントを正しく入力してください。");
    if (!paymentMethod) throw new Error("支払い方法を選択してください。");
    if (longHairLength && !isLongHairLength(longHairLength)) throw new Error("ロング料金を選び直してください。");
    if (couponSelection && couponSelection !== "referral" && !couponSelection.startsWith("couponIssue:")) {
      throw new Error("クーポンを選び直してください。");
    }
    if (productIds.length !== productQuantities.length) {
      throw new Error("購入商品の入力内容が一致しません。商品を選び直してください。");
    }
    if (new Set(productIds).size !== productIds.length || productIds.some((id) => !id)) {
      throw new Error("同じ商品は数量をまとめて入力してください。");
    }
    const productInputs = productIds.map((productId, index) => ({
      productId,
      quantity: productQuantities[index]
    }));
    for (const item of productInputs) {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) {
        throw new Error("商品の数量を正しく入力してください。");
      }
    }

    const appointmentSnapshot = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { customerId: true }
    });
    if (!appointmentSnapshot) throw new Error("予約が見つかりません。");
    customerId = appointmentSnapshot.customerId;

    await expirePointsForCustomer(customerId);

    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          customerId: true,
          scheduledAt: true,
          staffName: true,
          source: true,
          couponIssueId: true,
          customer: {
            select: {
              organizationId: true,
              organization: { select: { taxRate: true } }
            }
          },
          serviceSales: { select: { id: true }, take: 1 }
        }
      });
      if (!appointment) throw new Error("予約が見つかりません。");
      if (!session.organizationId || appointment.customer.organizationId !== session.organizationId) {
        throw new Error("この予約を操作する権限がありません。");
      }
      if (appointment.serviceSales.length > 0) throw new Error("この予約はすでに会計済みです。");
      const effectiveCouponSelection = appointment.couponIssueId
        ? `couponIssue:${appointment.couponIssueId}`
        : couponSelection;

      const products = productInputs.length
        ? await tx.product.findMany({
            where: {
              id: { in: productInputs.map((item) => item.productId) },
              organizationId: session.organizationId,
              active: true
            },
            select: { id: true, manufacturerName: true, name: true, retailPrice: true, stockQuantity: true }
          })
        : [];
      if (products.length !== productInputs.length) {
        throw new Error("選択した商品が商品棚にありません。画面を更新して選び直してください。");
      }
      const productById = new Map(products.map((product) => [product.id, product]));
      for (const item of productInputs) {
        const product = productById.get(item.productId);
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error(`${product?.name ?? "選択した商品"}の在庫が不足しています。商品棚を確認してください。`);
        }
      }
      const productTotal = productInputs.reduce((sum, item) => {
        const product = productById.get(item.productId);
        return sum + item.quantity * (product?.retailPrice ?? 0);
      }, 0);
      const longCharge = longHairFee(longHairLength);
      const serviceAmount = subtotal + longCharge;
      const checkoutAmount = serviceAmount + productTotal;
      const paidAt = new Date();
      let couponDiscountAmount = 0;
      let couponDiscountLabel = "クーポン利用なし";

      if (effectiveCouponSelection === "referral") {
        const referralDiscount = await applyReferralCheckoutDiscountInTransaction(
          tx,
          appointment.customerId,
          serviceAmount,
          paidAt
        );
        if (!referralDiscount.discount) throw new Error("選択した紹介クーポンは利用できません。画面を更新してください。");
        couponDiscountAmount = referralDiscount.amount;
        couponDiscountLabel = referralDiscount.discount.label;
      } else if (effectiveCouponSelection.startsWith("couponIssue:")) {
        const couponIssueId = effectiveCouponSelection.slice("couponIssue:".length);
        const couponIssue = await tx.couponIssue.findFirst({
          where: {
            id: couponIssueId,
            customerId: appointment.customerId,
            status: "issued",
            issuedAt: { lte: paidAt },
            expiresAt: { gte: paidAt }
          },
          select: { id: true, couponCode: true, discountRate: true }
        });
        if (!couponIssue) throw new Error("選択したクーポンは期限切れまたは使用済みです。");
        couponDiscountAmount = percentageDiscountAmount(serviceAmount, couponIssue.discountRate);
        if (couponDiscountAmount <= 0) throw new Error("選択したクーポンの割引内容を確認してください。");
        couponDiscountLabel = `限定クーポン ${couponIssue.discountRate}%OFF（${couponIssue.couponCode}）`;
        const couponUpdate = await tx.couponIssue.updateMany({
          where: { id: couponIssue.id, status: "issued" },
          data: { status: "used" }
        });
        if (couponUpdate.count !== 1) throw new Error("選択したクーポンはすでに使用されています。");
      }

      const checkoutAfterCouponDiscount = checkoutAmount - couponDiscountAmount;

      if (pointDiscount > 0) {
        await redeemPointsInTransaction(tx, {
          customerId: appointment.customerId,
          points: pointDiscount,
          checkoutAmount: checkoutAfterCouponDiscount,
          checkoutSourceId: appointment.id,
          note: `${menu}の予約会計で利用`
        });
      }

      const finalAmount = checkoutAfterCouponDiscount - pointDiscount;
      const taxRate = appointment.customer.organization.taxRate;
      const includedTax = includedTaxAmount(finalAmount, taxRate);
      const longChargeNote = longHairLength
        ? `ロング料金 ${longHairLength} +${longCharge.toLocaleString("ja-JP")}円`
        : "ロング料金 なし 0円";
      const couponDiscountNote = `${couponDiscountLabel} -${couponDiscountAmount.toLocaleString("ja-JP")}円`;
      const sale = await tx.serviceSale.create({
        data: {
          customerId: appointment.customerId,
          appointmentId: appointment.id,
          title: menu,
          amount: finalAmount,
          paymentMethod,
          paidAt,
          source: "予約会計",
          note: `基本施術料金 ${subtotal.toLocaleString("ja-JP")}円 / ${longChargeNote} / 商品 ${productTotal.toLocaleString("ja-JP")}円 / クーポン ${couponDiscountNote} / ポイント割引 ${pointDiscount.toLocaleString("ja-JP")}円 / お支払い ${finalAmount.toLocaleString("ja-JP")}円 / うち消費税（${taxRate}%） ${includedTax.toLocaleString("ja-JP")}円`
        },
        select: { id: true }
      });

      for (const item of productInputs) {
        const product = productById.get(item.productId);
        if (!product) throw new Error("購入商品の保存に失敗しました。");

        const stockUpdate = await tx.product.updateMany({
          where: {
            id: product.id,
            organizationId: session.organizationId,
            active: true,
            stockQuantity: { gte: item.quantity }
          },
          data: { stockQuantity: { decrement: item.quantity } }
        });
        if (stockUpdate.count !== 1) {
          throw new Error(`${product.name}の在庫が不足しています。商品棚を確認してください。`);
        }

        await tx.productSaleLine.create({
          data: {
            serviceSaleId: sale.id,
            productId: product.id,
            productNameSnapshot: product.name,
            manufacturerNameSnapshot: product.manufacturerName,
            unitPrice: product.retailPrice,
            quantity: item.quantity,
            lineTotal: product.retailPrice * item.quantity
          }
        });

        const proposal = await tx.productProposal.create({
          data: {
            customerId: appointment.customerId,
            productId: product.id,
            proposalReason: "会計時に購入",
            status: "purchased",
            reaction: "purchased",
            purchased: true,
            note: `${item.quantity}点 / ${product.retailPrice.toLocaleString("ja-JP")}円`
          },
          select: { id: true, status: true, purchased: true }
        });
        await createProductReviewRequestRecord({
          db: tx,
          proposal,
          visitAt: appointment.scheduledAt
        });
      }

      if (isOnlineReservationSource(appointment.source)) {
        await awardAppointmentCheckoutPointsInTransaction(
          tx,
          appointment.customerId,
          appointment.id,
          paidAt
        );
      }

      await tx.contactLog.create({
        data: {
          customerId: appointment.customerId,
          channel: "店頭",
          purpose: "来店後フォロー予定",
          message: `予約会計: ${menu} / 基本施術料金 ${subtotal.toLocaleString("ja-JP")}円 / ${longChargeNote} / 商品 ${productTotal.toLocaleString("ja-JP")}円 / ${couponDiscountNote} / ポイント ${pointDiscount.toLocaleString("ja-JP")}pt / お支払い ${finalAmount.toLocaleString("ja-JP")}円`,
          outcome: "売上登録済み",
          nextAction: "仕上がり確認、レビュー依頼、次回メンテナンス提案を送る",
          scheduledFollowUp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          menu,
          estimatedPrice: serviceAmount,
          status: "来店済み"
        }
      });

      await ensureHistoryVisit(tx, {
        customerId: appointment.customerId,
        occurredAt: appointment.scheduledAt,
        menu,
        staffName: appointment.staffName
      });

      await completeReferralFirstVisitInTransaction(tx, appointment.customerId, paidAt);
    });
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "会計を確定できませんでした。";
  }

  if (errorMessage) {
    redirect(`/admin/appointments/${appointmentId}?error=${encodeURIComponent(errorMessage)}`);
  }

  revalidatePath("/admin/appointments");
  revalidatePath(`/admin/appointments/${appointmentId}`);
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/customers?section=points");
  revalidatePath("/u/reviews");
  redirect(`/admin/appointments/${appointmentId}/completed`);
}
