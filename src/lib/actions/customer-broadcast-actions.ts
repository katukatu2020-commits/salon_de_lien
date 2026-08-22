"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { generateCouponIssueCode } from "@/lib/coupons/coupon-code";
import { prisma } from "@/lib/prisma";

type BroadcastTx = Prisma.TransactionClient;

function textValue(formData: FormData, key: string, maximum: number) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key === "title" ? "件名" : "本文"}を入力してください。`);
  if (value.length > maximum) throw new Error(`${key === "title" ? "件名" : "本文"}は${maximum}文字以内で入力してください。`);
  return value;
}

function optionalInteger(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`${key}は整数で入力してください。`);
  return value;
}

function customerAge(customer: { birthDate: Date | null; birthYear: number | null }, now = new Date()) {
  if (customer.birthDate) {
    let age = now.getFullYear() - customer.birthDate.getFullYear();
    const birthdayThisYear = new Date(now.getFullYear(), customer.birthDate.getMonth(), customer.birthDate.getDate());
    if (birthdayThisYear.getTime() > now.getTime()) age -= 1;
    return age;
  }
  return customer.birthYear ? now.getFullYear() - customer.birthYear : null;
}

function normalizedGender(value?: string | null) {
  const gender = (value ?? "").trim().toLowerCase();
  if (/女性|female|woman|^f$/.test(gender)) return "female";
  if (/男性|male|man|^m$/.test(gender)) return "male";
  return "other";
}

async function uniqueCouponCode(tx: BroadcastTx, issuedAt: Date) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const couponCode = generateCouponIssueCode(issuedAt);
    const existing = await tx.couponIssue.findUnique({ where: { couponCode }, select: { id: true } });
    if (!existing) return couponCode;
  }
  throw new Error("クーポンコードを発行できませんでした。もう一度お試しください。");
}

export async function createCustomerBroadcastAction(formData: FormData) {
  const session = await requireBackofficeSession(["ADMIN"]);
  if (!session.organizationId) throw new Error("店舗所属が設定されていません。");

  const title = textValue(formData, "title", 60);
  const body = textValue(formData, "body", 500);
  const audienceGender = String(formData.get("audienceGender") ?? "all");
  if (!["all", "female", "male", "other"].includes(audienceGender)) throw new Error("性別フィルターを確認してください。");
  const audienceMinAge = optionalInteger(formData, "audienceMinAge");
  const audienceMaxAge = optionalInteger(formData, "audienceMaxAge");
  if (audienceMinAge !== null && (audienceMinAge < 0 || audienceMinAge > 120)) throw new Error("年齢の下限を確認してください。");
  if (audienceMaxAge !== null && (audienceMaxAge < 0 || audienceMaxAge > 120)) throw new Error("年齢の上限を確認してください。");
  if (audienceMinAge !== null && audienceMaxAge !== null && audienceMinAge > audienceMaxAge) throw new Error("年齢範囲を確認してください。");

  const couponEnabled = formData.get("couponEnabled") === "on";
  const couponTitle = couponEnabled ? String(formData.get("couponTitle") ?? "").trim() : null;
  const couponDescription = couponEnabled ? String(formData.get("couponDescription") ?? "").trim() || null : null;
  const couponTargetMenu = couponEnabled ? String(formData.get("couponTargetMenu") ?? "").trim() : null;
  const couponDiscountRate = couponEnabled ? optionalInteger(formData, "couponDiscountRate") : null;
  const couponValidDays = couponEnabled ? optionalInteger(formData, "couponValidDays") : null;

  const organization = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: {
      couponMinimumDiscountRate: true,
      couponMaximumDiscountRate: true,
      couponMaxValidDays: true
    }
  });
  if (!organization) throw new Error("店舗情報が見つかりません。");

  if (couponEnabled) {
    if (!couponTitle || couponTitle.length > 60) throw new Error("クーポン名は1〜60文字で入力してください。");
    if (!couponTargetMenu || couponTargetMenu.length > 40) throw new Error("対象メニューは1〜40文字で入力してください。");
    if (couponDescription && couponDescription.length > 200) throw new Error("クーポン説明は200文字以内で入力してください。");
    if (couponDiscountRate === null || couponDiscountRate < organization.couponMinimumDiscountRate || couponDiscountRate > organization.couponMaximumDiscountRate) {
      throw new Error(`割引率は${organization.couponMinimumDiscountRate}〜${organization.couponMaximumDiscountRate}%で入力してください。`);
    }
    if (couponValidDays === null || couponValidDays < 1 || couponValidDays > organization.couponMaxValidDays) {
      throw new Error(`有効期限は1〜${organization.couponMaxValidDays}日で入力してください。`);
    }
  }

  const candidates = await prisma.customer.findMany({
    where: { organizationId: session.organizationId, deletedAt: null, storeHiddenAt: null },
    select: { id: true, name: true, gender: true, birthDate: true, birthYear: true }
  });
  const recipients = candidates.filter((customer) => {
    if (audienceGender !== "all" && normalizedGender(customer.gender) !== audienceGender) return false;
    const age = customerAge(customer);
    if (audienceMinAge !== null && (age === null || age < audienceMinAge)) return false;
    if (audienceMaxAge !== null && (age === null || age > audienceMaxAge)) return false;
    return true;
  });
  if (recipients.length === 0) throw new Error("条件に一致する顧客がいません。配信条件を変更してください。");

  const sentAt = new Date();
  await prisma.$transaction(async (tx) => {
    const broadcast = await tx.customerBroadcast.create({
      data: {
        organizationId: session.organizationId!,
        createdByStaffId: session.userId,
        title,
        body,
        audienceGender: audienceGender === "all" ? null : audienceGender,
        audienceMinAge,
        audienceMaxAge,
        audienceMatchedCount: recipients.length,
        couponEnabled,
        couponTitle,
        couponDescription,
        couponTargetMenu,
        couponDiscountRate,
        couponValidDays,
        sentAt
      }
    });

    for (const customer of recipients) {
      let couponIssueId: string | null = null;
      if (couponEnabled && couponDiscountRate && couponValidDays && couponTargetMenu) {
        const expiresAt = new Date(sentAt);
        expiresAt.setDate(expiresAt.getDate() + couponValidDays);
        const couponCode = await uniqueCouponCode(tx, sentAt);
        const issue = await tx.couponIssue.create({
          data: {
            customerId: customer.id,
            staffUserId: session.userId,
            couponCode,
            customerName: customer.name,
            discountRate: couponDiscountRate,
            targetMenusJson: [couponTargetMenu],
            issuedAt: sentAt,
            expiresAt,
            templateVersion: "coupon-v2",
            status: "issued"
          },
          select: { id: true }
        });
        couponIssueId = issue.id;
      }

      await tx.customerBroadcastRecipient.create({
        data: { broadcastId: broadcast.id, customerId: customer.id, couponIssueId, deliveredAt: sentAt }
      });
    }
  }, { timeout: 60_000 });

  revalidatePath("/admin/customers/messages");
  revalidatePath("/u/home");
  revalidatePath("/u/messages");
  revalidatePath("/u/points");
  redirect(`/admin/customers/messages?notice=sent&count=${recipients.length}`);
}

export async function markCustomerBroadcastsReadAction() {
  const session = await getCurrentCustomerSession();
  if (!session) throw new Error("ログインが必要です。");
  await prisma.customerBroadcastRecipient.updateMany({
    where: { customerId: session.customerId, readAt: null },
    data: { readAt: new Date() }
  });
  revalidatePath("/u/home");
  revalidatePath("/u/messages");
}
