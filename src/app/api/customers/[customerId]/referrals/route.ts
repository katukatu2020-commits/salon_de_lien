import { NextResponse, type NextRequest } from "next/server";
import { createReferralForCustomer } from "@/lib/points/point-service";
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
    const baseUrl = request.headers.get("origin") ?? new URL(request.url).origin;
    const result = await createReferralForCustomer(params.customerId, baseUrl);

    return NextResponse.json(
      {
        code: result.code,
        referralUrl: result.referralUrl,
        referralId: result.referral.id
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "referral issue failed" }, { status: 400 });
  }
}
