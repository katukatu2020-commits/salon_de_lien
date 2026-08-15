import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  hashProductReviewToken,
  parseStringArray
} from "@/lib/products/product-review";
import { submitProductReview } from "@/lib/products/product-review-submission";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    token: string;
  };
};

async function findActiveReviewRequest(token: string) {
  const tokenHash = hashProductReviewToken(token);
  const reviewRequest = await prisma.productReviewRequest.findUnique({
    where: { tokenHash },
    include: {
      review: {
        select: { id: true }
      },
      productProposal: {
        select: {
          id: true,
          customerId: true,
          proposalReason: true,
          concernTags: true,
          product: {
            select: {
              name: true,
              manufacturerName: true,
              category: true
            }
          }
        }
      }
    }
  });

  if (!reviewRequest) {
    return { ok: false as const, status: 404, error: "レビュー依頼が見つかりません。" };
  }

  if (reviewRequest.status === "answered" || reviewRequest.review) {
    return { ok: false as const, status: 409, error: "このアンケートは回答済みです。" };
  }

  if (reviewRequest.status !== "active") {
    return { ok: false as const, status: 410, error: "このアンケートは現在利用できません。" };
  }

  if (reviewRequest.expiresAt.getTime() < Date.now()) {
    await prisma.productReviewRequest.update({
      where: { id: reviewRequest.id },
      data: { status: "expired" }
    });

    return { ok: false as const, status: 410, error: "回答期限が過ぎています。" };
  }

  return { ok: true as const, reviewRequest };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const result = await findActiveReviewRequest(params.token);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const proposal = result.reviewRequest.productProposal;

  return NextResponse.json({
    productName: proposal.product.name,
    manufacturerName: proposal.product.manufacturerName,
    category: proposal.product.category,
    proposalReason: proposal.proposalReason,
    concernTags: parseStringArray(proposal.concernTags),
    expiresAt: result.reviewRequest.expiresAt
  });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await findActiveReviewRequest(params.token);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    const submission = await submitProductReview({
      reviewRequestId: result.reviewRequest.id,
      body
    });

    return NextResponse.json({
      ok: true,
      success: true,
      reviewId: submission.reviewId,
      awardedPoints: submission.awardedPoints,
      pointExpiresAt: submission.pointExpiresAt,
      rewardPrizes: submission.rewardPrizes
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "レビューを保存できませんでした。" },
      { status: 400 }
    );
  }
}
