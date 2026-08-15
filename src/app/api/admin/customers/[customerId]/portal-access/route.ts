import { NextResponse, type NextRequest } from "next/server";
import { requireCustomerAccess } from "@/lib/auth/authorization";
import { issueCustomerPortalAccess } from "@/lib/auth/customer-portal";

export const dynamic = "force-dynamic";

type RouteContext = { params: { customerId: string } };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { session } = await requireCustomerAccess(params.customerId);
  const portal = await issueCustomerPortalAccess({
    customerId: params.customerId,
    organizationId: session.organizationId ?? undefined
  });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? new URL(request.url).origin;
  return NextResponse.json(
    {
      portalUrl: new URL(portal.urlPath, baseUrl).toString(),
      expiresAt: portal.expiresAt
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
