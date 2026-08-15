"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseStringArray, safeNullableString } from "@/lib/products/product-review";
import { AuthorizationError, requireBackofficeSession } from "@/lib/auth/authorization";

const REPORT_PATH = "/admin/products";
const REPORT_VIEW_PATH = "/admin/products?section=feedback";

async function requireEditorOrganization() {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  if (!session.organizationId) throw new AuthorizationError("店舗所属が設定されていません。", 403);
  return session.organizationId;
}

function requiredString(formData: FormData, key: string) {
  const value = safeNullableString(formData.get(key));

  if (!value) {
    throw new Error(`${key} is required.`);
  }

  return value;
}

function optionalString(formData: FormData, key: string) {
  return safeNullableString(formData.get(key)) ?? undefined;
}

function parseRating(formData: FormData) {
  const rating = Number(formData.get("rating"));

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("rating must be an integer between 1 and 5.");
  }

  return rating;
}

function parseSubmittedAt(formData: FormData) {
  const raw = safeNullableString(formData.get("submittedAt"));
  const date = raw ? new Date(`${raw}T12:00:00.000+09:00`) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error("submittedAt is invalid.");
  }

  return date;
}

function parseTextArray(formData: FormData, key: string) {
  return parseStringArray(formData.get(key)).slice(0, 8);
}

function normalizeReviewComment(comment: string) {
  return comment.replace(/\s+/g, " ").trim();
}

async function assertUniqueManufacturerReviewComment({
  organizationId,
  manufacturerName,
  freeComment,
  excludeReviewId
}: {
  organizationId: string;
  manufacturerName: string;
  freeComment: string;
  excludeReviewId?: string;
}) {
  const normalizedComment = normalizeReviewComment(freeComment);
  const existingReviews = await prisma.productReview.findMany({
    where: {
      ...(excludeReviewId ? { id: { not: excludeReviewId } } : {}),
      productProposal: {
        product: {
          organizationId,
          manufacturerName,
          active: true
        }
      }
    },
    select: {
      freeComment: true
    }
  });

  const exists = existingReviews.some((review) => normalizeReviewComment(review.freeComment ?? "") === normalizedComment);

  if (exists) {
    throw new Error("同じ口コミ本文が既に存在します。内容を少し変えて保存してください。");
  }
}

function reviewTokenHash() {
  return createHash("sha256").update(`manual-review:${randomBytes(32).toString("hex")}`).digest("hex");
}

function revalidateManufacturerReport() {
  revalidatePath(REPORT_VIEW_PATH);
  revalidatePath("/admin/reports/manufacturer-products");
  revalidatePath("/admin/reports/product-feedback");
  revalidatePath("/api/reports/manufacturer-products");
  revalidatePath("/api/admin/reports/manufacturer-products");
}

function redirectWithNotice(formData: FormData, notice: string): never {
  const returnTo = safeNullableString(formData.get("returnTo"));
  const candidate = new URL(returnTo ?? REPORT_VIEW_PATH, "http://salon.local");
  const url =
    candidate.pathname === REPORT_PATH && candidate.searchParams.get("section") === "feedback"
      ? candidate
      : new URL(REPORT_VIEW_PATH, "http://salon.local");

  url.searchParams.set("notice", notice);
  redirect(`${url.pathname}${url.search}`);
}

export async function createManufacturerReviewAction(formData: FormData) {
  const organizationId = await requireEditorOrganization();
  const productId = requiredString(formData, "productId");
  const customerId = requiredString(formData, "customerId");
  const rating = parseRating(formData);
  const submittedAt = parseSubmittedAt(formData);
  const freeComment = requiredString(formData, "comment");
  const goodPoints = parseTextArray(formData, "goodPoints");
  const badPoints = parseTextArray(formData, "badPoints");
  const repeatIntent = optionalString(formData, "repeatIntent") ?? (rating >= 4 ? "yes" : rating === 3 ? "maybe" : "no");

  const [product, customer] = await Promise.all([
    prisma.product.findFirst({
      where: {
        id: productId,
        organizationId,
        active: true
      },
      select: { id: true, name: true, manufacturerName: true }
    }),
    prisma.customer.findFirst({
      where: {
        id: customerId,
        organizationId,
        deletedAt: null
      },
      select: { id: true }
    })
  ]);

  if (!product) {
    throw new Error("Product was not found.");
  }

  if (!customer) {
    throw new Error("Customer was not found.");
  }

  await assertUniqueManufacturerReviewComment({
    organizationId,
    manufacturerName: product.manufacturerName,
    freeComment
  });

  await prisma.$transaction(async (tx) => {
    const proposal = await tx.productProposal.create({
      data: {
        customerId,
        productId,
        proposalReason: `${product.name}の手動レビュー登録`,
        concernTags: [],
        status: "purchased",
        reaction: "purchased",
        purchased: true,
        note: "MANUAL_MANUFACTURER_REVIEW",
        createdAt: submittedAt,
        updatedAt: submittedAt
      },
      select: { id: true }
    });

    const request = await tx.productReviewRequest.create({
      data: {
        productProposalId: proposal.id,
        tokenHash: reviewTokenHash(),
        expiresAt: submittedAt,
        requestedAt: submittedAt,
        answeredAt: submittedAt,
        status: "answered",
        createdAt: submittedAt,
        updatedAt: submittedAt
      },
      select: { id: true }
    });

    await tx.productReview.create({
      data: {
        productProposalId: proposal.id,
        reviewRequestId: request.id,
        usedStatus: "used",
        rating,
        goodPoints,
        badPoints,
        repeatIntent,
        freeComment,
        allowAnonymousShare: true,
        allowAnonymousQuote: true,
        submittedAt,
        createdAt: submittedAt,
        updatedAt: submittedAt
      }
    });
  });

  revalidateManufacturerReport();
  redirectWithNotice(formData, "review-created");
}

export async function updateManufacturerReviewAction(formData: FormData) {
  const organizationId = await requireEditorOrganization();
  const reviewId = requiredString(formData, "reviewId");
  const rating = parseRating(formData);
  const submittedAt = parseSubmittedAt(formData);
  const freeComment = requiredString(formData, "comment");
  const goodPoints = parseTextArray(formData, "goodPoints");
  const badPoints = parseTextArray(formData, "badPoints");
  const repeatIntent = optionalString(formData, "repeatIntent") ?? (rating >= 4 ? "yes" : rating === 3 ? "maybe" : "no");

  const review = await prisma.productReview.findFirst({
    where: {
      id: reviewId,
      productProposal: {
        customer: { organizationId, deletedAt: null },
        product: { organizationId }
      }
    },
    select: {
      id: true,
      reviewRequestId: true,
      productProposalId: true,
      productProposal: {
        select: {
          product: {
            select: {
              manufacturerName: true
            }
          }
        }
      }
    }
  });

  if (!review) {
    throw new Error("Review was not found.");
  }

  await assertUniqueManufacturerReviewComment({
    organizationId,
    manufacturerName: review.productProposal.product.manufacturerName,
    freeComment,
    excludeReviewId: review.id
  });

  await prisma.$transaction([
    prisma.productReview.update({
      where: { id: review.id },
      data: {
        rating,
        submittedAt,
        freeComment,
        goodPoints,
        badPoints,
        repeatIntent,
        usedStatus: "used",
        updatedAt: new Date()
      }
    }),
    prisma.productReviewRequest.update({
      where: { id: review.reviewRequestId },
      data: {
        answeredAt: submittedAt,
        status: "answered",
        updatedAt: new Date()
      }
    }),
    prisma.productProposal.update({
      where: { id: review.productProposalId },
      data: {
        status: "purchased",
        reaction: "purchased",
        purchased: true,
        updatedAt: new Date()
      }
    })
  ]);

  revalidateManufacturerReport();
  redirectWithNotice(formData, "review-updated");
}
