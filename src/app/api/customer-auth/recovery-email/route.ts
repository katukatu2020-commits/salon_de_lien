import { NextRequest, NextResponse } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { isDeliverableRecoveryEmail, normalizeRecoveryEmail } from "@/lib/auth/password-reset";
import { getExternalRequestUrl, hasValidRequestOrigin } from "@/lib/auth/request-security";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const session = await getCurrentCustomerSession();
  if (!session) return NextResponse.redirect(getExternalRequestUrl(request, "/u/login"), 303);
  const formData = await request.formData();
  const email = normalizeRecoveryEmail(String(formData.get("email") || ""));
  const resultUrl = getExternalRequestUrl(request, "/u/profile");
  if (!isDeliverableRecoveryEmail(email)) {
    resultUrl.searchParams.set("email", "invalid");
    return NextResponse.redirect(resultUrl, 303);
  }
  const duplicate = await prisma.appUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, role: "CUSTOMER", NOT: { id: session.userId } },
    select: { id: true }
  });
  if (duplicate) {
    resultUrl.searchParams.set("email", "duplicate");
    return NextResponse.redirect(resultUrl, 303);
  }
  await prisma.appUser.update({ where: { id: session.userId }, data: { email } });
  resultUrl.searchParams.set("email", "saved");
  return NextResponse.redirect(resultUrl, 303);
}
