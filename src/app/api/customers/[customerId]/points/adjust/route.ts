import { NextResponse, type NextRequest } from "next/server";
import { adjustPoints } from "@/lib/points/point-service";
import { requireCustomerAccess } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    customerId: string;
  };
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { session } = await requireCustomerAccess(params.customerId);
    const body = (await request.json()) as Record<string, unknown>;
    const amount = Number(body.amount);
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "手動調整";
    const createdByStaffId = session.userId ?? session.subject;
    const result = await adjustPoints({
      customerId: params.customerId,
      amount,
      reason,
      note: typeof body.note === "string" ? body.note : null,
      createdByStaffId
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "point adjust failed" }, { status: 400 });
  }
}
