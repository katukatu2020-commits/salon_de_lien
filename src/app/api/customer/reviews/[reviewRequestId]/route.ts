import { NextResponse, type NextRequest } from "next/server";
import { getCurrentCustomerSession } from "@/lib/auth/current-customer";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import { submitProductReview } from "@/lib/products/product-review-submission";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { reviewRequestId: string };
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }

  const session = await getCurrentCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const submission = await submitProductReview({
      reviewRequestId: params.reviewRequestId,
      expectedCustomerId: session.customerId,
      body
    });

    return NextResponse.json({ ok: true, success: true, ...submission });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "アンケートを保存できませんでした。" },
      { status: 400 }
    );
  }
}
