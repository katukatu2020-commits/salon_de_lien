import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { completeReferralFirstVisitForCustomer } from "@/lib/points/point-service";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    code: string;
  };
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
    if (!session.organizationId) throw new AuthorizationError("店舗所属が設定されていません。", 403);
    const referral = await prisma.referral.findFirst({
      where: {
        OR: [{ id: params.code }, { code: params.code.toUpperCase() }],
        referrerCustomer: { organizationId: session.organizationId, deletedAt: null },
        referredCustomer: { organizationId: session.organizationId, deletedAt: null }
      },
      select: { referredCustomerId: true }
    });

    if (!referral?.referredCustomerId) {
      return NextResponse.json({ error: "referred customer not found" }, { status: 404 });
    }

    return NextResponse.json(await completeReferralFirstVisitForCustomer(referral.referredCustomerId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "referral reward failed" },
      { status: error instanceof AuthorizationError ? error.status : 400 }
    );
  }
}
