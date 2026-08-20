import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import {
  createCustomerWithdrawalToken,
  customerWithdrawalExpiresAt,
  customerWithdrawalTokenMinutes,
  hashCustomerWithdrawalToken
} from "@/lib/auth/customer-withdrawal";
import { getExternalRequestUrl, hasValidRequestOrigin } from "@/lib/auth/request-security";
import { isDeliverableRecoveryEmail } from "@/lib/auth/password-reset";
import { sendCustomerWithdrawalMail } from "@/lib/mail/customer-withdrawal-mail";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function redirectToProfile(request: NextRequest, status: string) {
  const url = getExternalRequestUrl(request, "/u/profile");
  url.searchParams.set("withdrawal", status);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.redirect(getExternalRequestUrl(request, "/u/login"), 303);

  const appUser = await prisma.appUser.findFirst({
    where: {
      id: session.userId,
      customerId: session.customerId,
      organizationId: session.organizationId,
      active: true,
      customer: { deletedAt: null }
    },
    select: { id: true, email: true, customerId: true, customer: { select: { name: true } } }
  });
  if (!appUser?.customerId || !appUser.customer || !isDeliverableRecoveryEmail(appUser.email)) {
    return redirectToProfile(request, "email-required");
  }

  const windowStart = new Date(Date.now() - 60 * 60_000);
  const recentRequests = await prisma.customerWithdrawalRequest.count({
    where: { appUserId: appUser.id, createdAt: { gte: windowStart } }
  });
  if (recentRequests >= 3) return redirectToProfile(request, "limited");

  const token = createCustomerWithdrawalToken();
  const tokenHash = hashCustomerWithdrawalToken(token);
  const now = new Date();
  const withdrawalRequest = await prisma.$transaction(async (tx) => {
    await tx.customerWithdrawalRequest.updateMany({
      where: { appUserId: appUser.id, usedAt: null },
      data: { usedAt: now }
    });
    return tx.customerWithdrawalRequest.create({
      data: {
        id: randomUUID(),
        customerId: appUser.customerId!,
        appUserId: appUser.id,
        email: appUser.email.trim().toLowerCase(),
        tokenHash,
        expiresAt: customerWithdrawalExpiresAt(now)
      }
    });
  });

  const confirmationUrl = getExternalRequestUrl(request, `/u/withdrawal/${token}`).toString();
  try {
    await sendCustomerWithdrawalMail({
      to: withdrawalRequest.email,
      customerName: appUser.customer.name,
      confirmationUrl,
      expiresInMinutes: customerWithdrawalTokenMinutes(),
      customerId: appUser.customerId
    });
  } catch (error) {
    console.error("customer withdrawal mail failed", { customerId: appUser.customerId, error });
    await prisma.customerWithdrawalRequest.delete({ where: { id: withdrawalRequest.id } }).catch(() => undefined);
    return redirectToProfile(request, "mail-failed");
  }
  return redirectToProfile(request, "sent");
}
