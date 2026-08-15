"use server";

import { revalidatePath } from "next/cache";
import { adjustPoints, createReferralForCustomer, redeemPoints } from "@/lib/points/point-service";
import { requireCustomerAccess } from "@/lib/auth/authorization";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formInt(formData: FormData, key: string) {
  const value = formString(formData, key);
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function adjustCustomerPointsAction(customerId: string, formData: FormData) {
  const { session } = await requireCustomerAccess(customerId);
  const amount = formInt(formData, "amount") ?? 0;
  const reason = formString(formData, "reason") ?? "手動調整";
  const createdByStaffId = session.userId ?? session.subject;

  await adjustPoints({
    customerId,
    amount,
    reason,
    note: formString(formData, "note"),
    createdByStaffId
  });

  revalidatePointPaths(customerId);
}

export async function redeemCustomerPointsAction(customerId: string, formData: FormData) {
  await requireCustomerAccess(customerId);
  await redeemPoints({
    customerId,
    points: formInt(formData, "points") ?? 0,
    checkoutAmount: formInt(formData, "checkoutAmount") ?? 0,
    visitId: formString(formData, "visitId"),
    couponIssueId: formString(formData, "couponIssueId"),
    note: formString(formData, "note")
  });

  revalidatePointPaths(customerId);
}

export async function issueReferralAction(customerId: string) {
  await requireCustomerAccess(customerId);
  await createReferralForCustomer(customerId, process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? null);
  revalidatePointPaths(customerId);
}

function revalidatePointPaths(customerId: string) {
  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath(`/customers/${customerId}`);
  revalidatePath(`/u/${customerId}`);
  revalidatePath(`/app/${customerId}`);
  revalidatePath(`/admin/customers/${customerId}/coupons/new`);
}
