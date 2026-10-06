import { NextResponse } from "next/server";
import { requireBackofficeSession } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) return NextResponse.json({ error: "店舗を確認してください。" }, { status: 403 });
  const menus = await prisma.salonMenu.findMany({
    where: { organizationId: session.organizationId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, category: true, priceYen: true, durationMinutes: true }
  });
  return NextResponse.json({ menus }, { headers: { "Cache-Control": "no-store" } });
}
