import { NextRequest, NextResponse } from "next/server";
import { hasValidRequestOrigin } from "@/lib/auth/request-security";
import {
  PhoneVerificationError,
  requestCustomerPhoneVerification
} from "@/lib/auth/customer-phone-verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  if (!hasValidRequestOrigin(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { phone?: unknown };
    const result = await requestCustomerPhoneVerification({
      rawPhone: typeof body.phone === "string" ? body.phone : "",
      organizationId: process.env.DEFAULT_ORGANIZATION_ID || "org_salon_de_lien",
      requestAddress: requestAddress(request)
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    const known = error instanceof PhoneVerificationError;
    return NextResponse.json(
      { error: known ? error.message : "認証コードを送信できませんでした。" },
      { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
