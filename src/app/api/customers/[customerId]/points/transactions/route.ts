import { NextResponse } from "next/server";
import { getPointTransactions } from "@/lib/points/point-service";
import { requireCustomerAccess } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    customerId: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  await requireCustomerAccess(params.customerId);
  return NextResponse.json({
    transactions: await getPointTransactions(params.customerId)
  });
}
