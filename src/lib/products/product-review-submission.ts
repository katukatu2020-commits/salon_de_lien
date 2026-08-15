import { prisma } from "@/lib/prisma";
import {
  parseStringArray,
  PRODUCT_REVIEW_COMMENT_MAX_LENGTH,
  PRODUCT_REVIEW_COMMENT_MIN_LENGTH,
  PRODUCT_REVIEW_REPEAT_INTENTS,
  PRODUCT_REVIEW_USED_STATUSES
} from "@/lib/products/product-review";
import { awardProductReviewPointsInTransaction } from "@/lib/points/point-service";

function booleanValue(value: unknown) {
  return value === true || value === "true" || value === "on";
}

export async function submitProductReview({
  reviewRequestId,
  expectedCustomerId,
  body
}: {
  reviewRequestId: string;
  expectedCustomerId?: string;
  body: Record<string, unknown>;
}) {
  const reviewRequest = await prisma.productReviewRequest.findFirst({
    where: {
      id: reviewRequestId,
      ...(expectedCustomerId ? { productProposal: { customerId: expectedCustomerId } } : {})
    },
    include: {
      review: { select: { id: true } },
      productProposal: {
        select: {
          id: true,
          customerId: true,
          purchased: true,
          status: true,
          reaction: true
        }
      }
    }
  });

  if (!reviewRequest) throw new Error("アンケートが見つかりません。");
  if (!reviewRequest.productProposal.purchased) throw new Error("購入済み商品のアンケートだけ回答できます。");
  if (reviewRequest.status === "answered" || reviewRequest.review) throw new Error("このアンケートは回答済みです。");
  if (reviewRequest.status !== "active") throw new Error("このアンケートは現在利用できません。");
  if (reviewRequest.expiresAt.getTime() < Date.now()) {
    await prisma.productReviewRequest.updateMany({
      where: { id: reviewRequest.id, status: "active" },
      data: { status: "expired" }
    });
    throw new Error("回答期限が過ぎています。");
  }

  const usedStatus = typeof body.usedStatus === "string" ? body.usedStatus : "";
  if (!(PRODUCT_REVIEW_USED_STATUSES as readonly string[]).includes(usedStatus)) {
    throw new Error("使用状況を選択してください。");
  }

  const allowAnonymousShare = booleanValue(body.allowAnonymousShare);
  const allowAnonymousQuote = booleanValue(body.allowAnonymousQuote);
  if (!allowAnonymousShare) throw new Error("匿名の集計データ利用への同意が必要です。");

  const isUsed = usedStatus === "used";
  const rating = typeof body.rating === "number" ? body.rating : Number(body.rating);
  const repeatIntent = typeof body.repeatIntent === "string" ? body.repeatIntent : null;
  if (isUsed && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new Error("満足度は1〜5で選択してください。");
  }
  if (isUsed && !(PRODUCT_REVIEW_REPEAT_INTENTS as readonly string[]).includes(repeatIntent ?? "")) {
    throw new Error("リピート意向を選択してください。");
  }

  const freeComment = typeof body.freeComment === "string" ? body.freeComment.trim() : "";
  if (freeComment.length < PRODUCT_REVIEW_COMMENT_MIN_LENGTH) {
    throw new Error(`コメントは${PRODUCT_REVIEW_COMMENT_MIN_LENGTH}文字以上入力してください。`);
  }
  if (freeComment.length > PRODUCT_REVIEW_COMMENT_MAX_LENGTH) {
    throw new Error(`コメントは${PRODUCT_REVIEW_COMMENT_MAX_LENGTH}文字以内で入力してください。`);
  }

  const submittedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const claim = await tx.productReviewRequest.updateMany({
      where: {
        id: reviewRequest.id,
        status: "active",
        answeredAt: null,
        expiresAt: { gte: submittedAt }
      },
      data: { status: "answered", answeredAt: submittedAt }
    });
    if (claim.count !== 1) throw new Error("このアンケートは回答済み、期限切れ、または取消済みです。");

    const review = await tx.productReview.create({
      data: {
        productProposalId: reviewRequest.productProposal.id,
        reviewRequestId: reviewRequest.id,
        usedStatus,
        rating: isUsed ? rating : null,
        goodPoints: isUsed ? parseStringArray(body.goodPoints).slice(0, 8) : undefined,
        badPoints: isUsed ? parseStringArray(body.badPoints).slice(0, 8) : undefined,
        repeatIntent: isUsed ? repeatIntent : null,
        freeComment,
        allowAnonymousShare,
        allowAnonymousQuote,
        submittedAt
      },
      select: { id: true }
    });

    await tx.consent.createMany({
      data: [
        {
          customerId: reviewRequest.productProposal.customerId,
          productReviewId: review.id,
          consentType: "aggregate_review_share",
          granted: allowAnonymousShare,
          source: "product_review"
        },
        {
          customerId: reviewRequest.productProposal.customerId,
          productReviewId: review.id,
          consentType: "anonymous_quote_share",
          granted: allowAnonymousQuote,
          source: "product_review"
        },
        {
          customerId: reviewRequest.productProposal.customerId,
          productReviewId: review.id,
          consentType: "public_ad_use",
          granted: false,
          source: "product_review"
        }
      ]
    });

    const reward = await awardProductReviewPointsInTransaction(
      tx,
      reviewRequest.productProposal.customerId,
      review.id,
      usedStatus
    );

    return {
      reviewId: review.id,
      awardedPoints: reward.awardedPoints,
      pointExpiresAt: reward.expiresAt,
      rewardPrizes: reward.prizes
    };
  });
}
