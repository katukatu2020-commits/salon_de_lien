import { NextResponse } from "next/server";
import { expireAllPoints } from "@/lib/points/point-service";
import { requireBackofficeSession } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  return NextResponse.json(await expireAllPoints(session.organizationId));
}
