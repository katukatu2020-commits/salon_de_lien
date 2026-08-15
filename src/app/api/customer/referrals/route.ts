import { NextResponse, type NextRequest } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { createReferralForCustomer } from "@/lib/points/point-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await getCurrentCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "お客様アプリへログインしてください。" }, { status: 401 });
  }

  const existing = await prisma.referral.findFirst({
    where: {
      referrerCustomerId: session.customerId,
      status: "issued"
    },
    orderBy: { issuedAt: "desc" }
  });
  const baseUrl = request.headers.get("origin") ?? new URL(request.url).origin;

  if (existing) {
    if (existing.expiresAt) {
      await prisma.referral.update({ where: { id: existing.id }, data: { expiresAt: null } });
    }
    return NextResponse.json({
      code: existing.code,
      referralUrl: `${baseUrl.replace(/\/$/, "")}/referral/${encodeURIComponent(existing.code)}`,
      referralId: existing.id,
      existing: true
    });
  }

  const result = await createReferralForCustomer(session.customerId, baseUrl);
  return NextResponse.json(
    {
      code: result.code,
      referralUrl: result.referralUrl,
      referralId: result.referral.id,
      existing: false
    },
    { status: 201 }
  );
}
