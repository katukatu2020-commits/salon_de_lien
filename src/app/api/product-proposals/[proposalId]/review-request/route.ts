import { NextResponse, type NextRequest } from "next/server";
import { createProductReviewRequestForProposal } from "@/lib/products/product-review";
import { requireProductProposalAccess } from "@/lib/auth/authorization";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    proposalId: string;
  };
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    await requireProductProposalAccess(params.proposalId);
    const baseUrl = request.headers.get("origin") ?? new URL(request.url).origin;
    const result = await createProductReviewRequestForProposal({
      proposalId: params.proposalId,
      baseUrl
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "review request failed" },
      { status: 400 }
    );
  }
}
