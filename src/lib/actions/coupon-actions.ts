"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateCouponIssueCode, isValidCouponCode, normalizeCouponCode } from "@/lib/coupons/coupon-code";
import { COUPON_TEMPLATE } from "@/lib/coupons/coupon-template.config";
import { readCouponIssueInput, validateCouponIssueInput } from "@/lib/coupons/coupon-validation";
import { requireCustomerAccess } from "@/lib/auth/authorization";

async function generateUniqueCouponIssueCode(issuedAt: Date) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const code = generateCouponIssueCode(issuedAt);
    const existing = await prisma.couponIssue.findUnique({
      where: { couponCode: code },
      select: { id: true }
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("識別コードの生成に失敗しました。もう一度お試しください。");
}

async function resolveUniqueCouponCode(rawCode: string, issuedAt: Date) {
  const couponCode = normalizeCouponCode(rawCode);

  if (!isValidCouponCode(couponCode)) {
    return couponCode;
  }

  const existing = await prisma.couponIssue.findUnique({
    where: { couponCode },
    select: { id: true }
  });

  if (!existing) {
    return couponCode;
  }

  return generateUniqueCouponIssueCode(issuedAt);
}

export async function createCouponIssueAction(customerId: string, formData: FormData) {
  await requireCustomerAccess(customerId);
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      deletedAt: null
    },
    select: {
      id: true,
      name: true,
      organization: {
        select: {
          couponMinimumDiscountRate: true,
          couponMaximumDiscountRate: true,
          couponMaxValidDays: true
        }
      }
    }
  });

  if (!customer) {
    throw new Error("顧客が見つかりません。");
  }

  const input = readCouponIssueInput(customer.id, formData);
  input.customerName = input.customerName || customer.name;
  input.couponCode = await resolveUniqueCouponCode(input.couponCode, input.issuedAt);

  const validation = validateCouponIssueInput(input, new Date(), {
    minimumDiscountRate: customer.organization.couponMinimumDiscountRate,
    maximumDiscountRate: customer.organization.couponMaximumDiscountRate,
    maximumValidDays: customer.organization.couponMaxValidDays
  });

  if (validation.errors.length > 0) {
    throw new Error(validation.errors.join("\n"));
  }

  const issue = await prisma.couponIssue.create({
    data: {
      customerId: customer.id,
      styleSuggestionId: nullableString(formData.get("styleSuggestionId")),
      couponCode: input.couponCode,
      customerName: input.customerName,
      discountRate: input.discountRate,
      targetMenusJson: input.targetMenus,
      issuedAt: input.issuedAt,
      expiresAt: input.expiresAt,
      salonMessage: input.salonMessage,
      footerAddress: input.footerAddress,
      footerHours: input.footerHours,
      footerReservation: input.footerReservation,
      footerPayments: input.footerPayments,
      templateVersion: COUPON_TEMPLATE.version,
      status: "issued"
    },
    select: {
      id: true
    }
  });

  revalidatePath(`/admin/customers/${customer.id}`);
  revalidatePath(`/admin/customers/${customer.id}/coupons/new`);
  redirect(`/admin/coupon-issues/${issue.id}/print`);
}

export async function markCouponIssuePrintedAction(couponIssueId: string, customerId: string) {
  const result = await prisma.couponIssue.updateMany({
    where: {
      id: couponIssueId,
      customerId
    },
    data: {
      printedAt: new Date()
    }
  });

  if (result.count === 0) {
    throw new Error("クーポン発行履歴が見つかりません。");
  }

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath(`/admin/customers/${customerId}/coupons/new`);
  revalidatePath(`/admin/coupon-issues/${couponIssueId}/print`);
}

export async function markCouponIssueUsedAction(couponIssueId: string, customerId: string) {
  const result = await prisma.couponIssue.updateMany({
    where: {
      id: couponIssueId,
      customerId
    },
    data: {
      status: "used"
    }
  });

  if (result.count === 0) {
    throw new Error("クーポン発行履歴が見つかりません。");
  }

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath(`/admin/customers/${customerId}/coupons/new`);
}

function nullableString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
