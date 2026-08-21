import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/auth/customer-session";
import { hashCustomerWithdrawalToken, isCustomerWithdrawalToken } from "@/lib/auth/customer-withdrawal";
import { getExternalRequestUrl, isExternalHttpsRequest } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // The opaque 256-bit token delivered to the registered email address is the
  // authorization for this one-time action. Some mail-app privacy browsers
  // submit a null or mail-app Origin, so rejecting on Origin here prevents a
  // legitimate customer from completing withdrawal. The request endpoint is
  // still session-protected and retains its same-origin validation.
  const formData = await request.formData();
  const token = String(formData.get("token") || "");
  if (!isCustomerWithdrawalToken(token)) {
    return NextResponse.redirect(getExternalRequestUrl(request, "/u/withdrawal/invalid"), 303);
  }

  const now = new Date();
  const requestRow = await prisma.customerWithdrawalRequest.findUnique({
    where: { tokenHash: hashCustomerWithdrawalToken(token) },
    include: { customer: { select: { deletedAt: true } }, appUser: { select: { active: true } } }
  });
  if (!requestRow || requestRow.usedAt || requestRow.expiresAt <= now || requestRow.customer.deletedAt || !requestRow.appUser.active) {
    return NextResponse.redirect(getExternalRequestUrl(request, "/u/withdrawal/invalid"), 303);
  }

  await prisma.$transaction(async (tx) => {
    const consumed = await tx.customerWithdrawalRequest.updateMany({
      where: { id: requestRow.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now }
    });
    if (consumed.count !== 1) throw new Error("Withdrawal token was already consumed");
    await tx.customer.update({
      where: { id: requestRow.customerId },
      data: {
        deletedAt: now,
        smsTransactionalOptIn: false,
        smsTransactionalOptOutAt: now
      }
    });
    // A customer can have legacy/linked login rows from an earlier registration
    // flow.  Deactivate every login tied to the withdrawn customer so none of
    // those rows can keep the customer visible or usable in a store context.
    await tx.appUser.updateMany({
      where: { customerId: requestRow.customerId },
      data: { active: false }
    });
    await tx.customerPortalAccess.updateMany({
      where: { customerId: requestRow.customerId, revokedAt: null },
      data: { revokedAt: now }
    });
    await tx.passwordResetToken.updateMany({
      where: { appUser: { customerId: requestRow.customerId }, usedAt: null },
      data: { usedAt: now }
    });
    await tx.customerWithdrawalRequest.updateMany({
      where: { customerId: requestRow.customerId, usedAt: null },
      data: { usedAt: now }
    });
  });

  const response = NextResponse.redirect(getExternalRequestUrl(request, "/u/withdrawal/completed"), 303);
  response.cookies.set({
    name: CUSTOMER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isExternalHttpsRequest(request),
    path: "/",
    maxAge: 0
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
