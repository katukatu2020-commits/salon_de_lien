import { NextResponse } from "next/server";
import {
  getGmailReservationSyncConfig,
  syncGmailReservations
} from "@/lib/appointments/gmail-reservation-sync";
import { requireBackofficeSession } from "@/lib/auth/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireBackofficeSession(["ADMIN", "STAFF"]);
  return NextResponse.json(getGmailReservationSyncConfig());
}

export async function POST() {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) {
    return NextResponse.json({ success: false, error: "店舗所属が設定されていません。" }, { status: 403 });
  }
  const config = getGmailReservationSyncConfig();
  if (!config.configured) {
    return NextResponse.json(
      {
        success: false,
        error: "Gmail OAuthの初期設定が完了していません。",
        missingEnvironmentVariables: config.missingEnvironmentVariables
      },
      { status: 503 }
    );
  }

  try {
    return NextResponse.json(await syncGmailReservations(session.organizationId));
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Gmail同期に失敗しました。"
      },
      { status: 502 }
    );
  }
}
