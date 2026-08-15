import { NextResponse } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { applyCustomerCouponCode } from "@/lib/coupons/customer-coupon";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getCurrentCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "お客様アプリへログインしてください。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code : "";

  try {
    const result = await applyCustomerCouponCode({
      rawCode: code,
      customerId: session.customerId,
      organizationId: session.organizationId
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "クーポンを確認できませんでした。" },
      { status: 400 }
    );
  }
}
