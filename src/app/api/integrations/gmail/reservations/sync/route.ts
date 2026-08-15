import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncGmailReservations } from "@/lib/appointments/gmail-reservation-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.GMAIL_SYNC_CRON_SECRET?.trim();
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!expected || !actual) return false;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

export async function POST(request: NextRequest) {
  if (!process.env.GMAIL_SYNC_CRON_SECRET?.trim()) {
    return NextResponse.json({ success: false, error: "同期用シークレットが未設定です。" }, { status: 503 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "認証できません。" }, { status: 401 });
  }

  try {
    return NextResponse.json(
      await syncGmailReservations(
        process.env.GMAIL_SYNC_ORGANIZATION_ID ?? process.env.DEFAULT_ORGANIZATION_ID
      )
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Gmail同期に失敗しました。" },
      { status: 502 }
    );
  }
}
