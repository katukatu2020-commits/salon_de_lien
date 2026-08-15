import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBackofficeSession } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  const products = await prisma.product.findMany({
    where: { active: true, organizationId: session.organizationId ?? undefined },
    orderBy: [{ manufacturerName: "asc" }, { name: "asc" }],
    select: {
      id: true,
      manufacturerName: true,
      name: true,
      category: true,
      retailPrice: true,
      stockQuantity: true,
      concernTags: true,
      description: true
    }
  });

  return NextResponse.json({ products });
}
