import { NextRequest, NextResponse } from "next/server";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import {
  PhoneVerificationError,
  verifyCustomerPhoneCode
} from "@/lib/auth/customer-phone-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { challengeId?: unknown; code?: unknown };
    const result = await verifyCustomerPhoneCode({
      challengeId: typeof body.challengeId === "string" ? body.challengeId : "",
      code: typeof body.code === "string" ? body.code : ""
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    const known = error instanceof PhoneVerificationError;
    return NextResponse.json(
      { error: known ? error.message : "電話番号を確認できませんでした。" },
      { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
