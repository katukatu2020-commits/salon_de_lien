import { NextResponse } from "next/server";
import { getPointBalance } from "@/lib/points/point-service";
import { requireCustomerAccess } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    customerId: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await requireCustomerAccess(params.customerId);
    return NextResponse.json(await getPointBalance(params.customerId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "point balance failed" }, { status: 400 });
  }
}
