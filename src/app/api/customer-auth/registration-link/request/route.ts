import { NextRequest, NextResponse } from "next/server";
import {
  customerRegistrationExpiresAt,
  customerRegistrationMinutes,
  generateCustomerRegistrationToken,
  hashCustomerRegistrationToken,
  normalizeRegistrationEmail,
  sanitizeCustomerRegistrationContext
} from "@/lib/auth/customer-registration-invite";
import { isDeliverableRecoveryEmail } from "@/lib/auth/password-reset";
import { getExternalRequestUrl, hasValidRequestOrigin } from "@/lib/auth/request-security";
import { sendCustomerRegistrationMail } from "@/lib/mail/customer-registration-mail";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const REQUEST_WINDOW_MINUTES = 15;
const MAX_REQUESTS_PER_EMAIL = 3;

function successResponse(request: NextRequest) {
  const url = getExternalRequestUrl(request, "/u/register");
  url.searchParams.set("sent", "1");
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const formData = await request.formData();
  const email = normalizeRegistrationEmail(String(formData.get("email") || ""));
  const success = () => successResponse(request);
  if (!isDeliverableRecoveryEmail(email)) return success();

  const organizationId = process.env.DEFAULT_ORGANIZATION_ID ?? "org_salon_de_lien";
  const existingAccount = await prisma.appUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true }
  });
  if (existingAccount) return success();

  const requestedSince = new Date(Date.now() - REQUEST_WINDOW_MINUTES * 60_000);
  const recentRequests = await prisma.customerRegistrationInvite.count({
    where: { organizationId, email, createdAt: { gte: requestedSince } }
  });
  if (recentRequests >= MAX_REQUESTS_PER_EMAIL) return success();

  const context = sanitizeCustomerRegistrationContext({
    source: String(formData.get("source") || ""),
    campaign: String(formData.get("campaign") || ""),
    referrer: String(formData.get("referrer") || ""),
    referrerName: String(formData.get("referrerName") || "")
  });
  const token = generateCustomerRegistrationToken();
  const invite = await prisma.$transaction(async (tx) => {
    await tx.customerRegistrationInvite.updateMany({
      where: { organizationId, email, usedAt: null },
      data: { usedAt: new Date() }
    });
    return tx.customerRegistrationInvite.create({
      data: {
        organizationId,
        email,
        tokenHash: hashCustomerRegistrationToken(token),
        contextJson: context,
        expiresAt: customerRegistrationExpiresAt()
      },
      select: { id: true }
    });
  });

  try {
    await sendCustomerRegistrationMail({
      to: email,
      registrationUrl: getExternalRequestUrl(request, `/u/register/${token}`).toString(),
      expiresInMinutes: customerRegistrationMinutes()
    });
  } catch (error) {
    await prisma.customerRegistrationInvite.deleteMany({ where: { id: invite.id } });
    console.error("customer registration mail delivery failed", {
      provider: "gmail",
      error: error instanceof Error ? error.message : "unknown error"
    });
  }

  return success();
}
