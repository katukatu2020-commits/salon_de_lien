import { NextResponse, type NextRequest } from "next/server";
import { redeemPoints } from "@/lib/points/point-service";
import { requireCustomerAccess } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    customerId: string;
  };
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    await requireCustomerAccess(params.customerId);
    const body = (await request.json()) as Record<string, unknown>;
    const result = await redeemPoints({
      customerId: params.customerId,
      points: Number(body.points),
      checkoutAmount: Number(body.checkoutAmount),
      visitId: typeof body.visitId === "string" ? body.visitId : null,
      couponIssueId: typeof body.couponIssueId === "string" ? body.couponIssueId : null,
      note: typeof body.note === "string" ? body.note : null
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "point redeem failed" }, { status: 400 });
  }
}
