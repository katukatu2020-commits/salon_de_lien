import { createHash, randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { POINT_VALID_DAYS, pointExpiresAt } from "@/lib/points/point-policy";

export const PRODUCT_PROPOSAL_STATUSES = ["proposed", "sample_given", "purchased", "used_in_service"] as const;
export const PRODUCT_PROPOSAL_REACTIONS = ["interested", "not_interested", "consider_next", "purchased"] as const;
export const PRODUCT_REVIEW_USED_STATUSES = ["used", "not_yet", "forgot"] as const;
export const PRODUCT_REVIEW_REPEAT_INTENTS = ["yes", "maybe", "no"] as const;
export const PRODUCT_REVIEW_COMMENT_MIN_LENGTH = 50;
export const PRODUCT_REVIEW_COMMENT_MAX_LENGTH = 500;

export type ProductProposalStatus = (typeof PRODUCT_PROPOSAL_STATUSES)[number];
export type ProductProposalReaction = (typeof PRODUCT_PROPOSAL_REACTIONS)[number];
export type ProductReviewUsedStatus = (typeof PRODUCT_REVIEW_USED_STATUSES)[number];
export type ProductReviewRepeatIntent = (typeof PRODUCT_REVIEW_REPEAT_INTENTS)[number];

export const GOOD_POINT_OPTIONS = ["手触り", "香り", "まとまり", "ツヤ", "ベタつきにくさ", "使いやすさ", "その他"];
export const BAD_POINT_OPTIONS = ["価格", "香り", "ベタつき", "効果が分かりにくい", "使い方が分かりにくい", "特になし", "その他"];

const REVIEW_TOKEN_BYTES = 32;
export const PRODUCT_REVIEW_POINT_VALID_DAYS = POINT_VALID_DAYS;
export const PRODUCT_REVIEW_REQUEST_VALID_DAYS = 30;

export function generateProductReviewToken() {
  return randomBytes(REVIEW_TOKEN_BYTES).toString("base64url");
}

export function hashProductReviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function reviewRequestExpiresAt(status: string, visitAt = new Date()) {
  if (status === "purchased") {
    return addDays(visitAt, PRODUCT_REVIEW_REQUEST_VALID_DAYS);
  }

  if (status === "used_in_service") {
    return addDays(visitAt, 7);
  }

  return addDays(visitAt, 14);
}

export function productReviewPointExpiresAt(awardedAt: Date) {
  return pointExpiresAt(awardedAt);
}

export function productReviewUrl(token: string, baseUrl?: string | null) {
  const normalizedBase = baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "";
  const path = `/review/product/${encodeURIComponent(token)}`;

  return normalizedBase ? `${normalizedBase.replace(/\/$/, "")}${path}` : path;
}

export function parseStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fall through to delimiter parsing.
    }

    return trimmed
      .split(/[,\n、]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function formStringArray(formData: FormData, key: string) {
  const repeated = formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => parseStringArray(value));

  return Array.from(new Set(repeated));
}

export function safeNullableString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function productProposalStatusLabel(status?: string | null) {
  if (status === "sample_given") return "商品を案内した";
  if (status === "purchased") return "購入した";
  if (status === "used_in_service") return "施術で使った";
  return "提案のみ";
}

export function productProposalReactionLabel(reaction?: string | null) {
  if (reaction === "purchased") return "購入";
  if (reaction === "consider_next") return "次回検討";
  if (reaction === "not_interested") return "興味なし";
  if (reaction === "interested") return "興味あり";
  return "未記録";
}

export function reviewRequestStatusLabel(status: string, expiresAt: Date, answeredAt?: Date | null) {
  if (status === "answered" || answeredAt) return "回答済み";
  if (status === "revoked") return "停止";
  if (expiresAt.getTime() < Date.now()) return "期限切れ";
  if (status === "active") return "依頼済み";
  return "未依頼";
}

export async function createProductReviewRequestRecord({
  db,
  proposal,
  visitAt,
  baseUrl
}: {
  db: Prisma.TransactionClient;
  proposal: { id: string; status: string; purchased?: boolean };
  visitAt: Date;
  baseUrl?: string | null;
}) {
  if (!proposal.purchased && proposal.status !== "purchased") {
    throw new Error("購入済みの商品だけアンケートを発行できます。");
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const token = generateProductReviewToken();
    const tokenHash = hashProductReviewToken(token);
    const existing = await db.productReviewRequest.findUnique({
      where: { tokenHash },
      select: { id: true }
    });

    if (existing) continue;

    const request = await db.productReviewRequest.create({
      data: {
        productProposalId: proposal.id,
        tokenHash,
        requestedAt: visitAt,
        expiresAt: reviewRequestExpiresAt("purchased", visitAt),
        status: "active"
      },
      select: {
        id: true,
        expiresAt: true
      }
    });

    return {
      requestId: request.id,
      reviewUrl: productReviewUrl(token, baseUrl),
      expiresAt: request.expiresAt
    };
  }

  throw new Error("レビュー依頼URLを生成できませんでした。もう一度お試しください。");
}

export async function createProductReviewRequestForProposal({
  proposalId,
  customerId,
  baseUrl
}: {
  proposalId: string;
  customerId?: string;
  baseUrl?: string | null;
}) {
  const proposal = await prisma.productProposal.findFirst({
    where: {
      id: proposalId,
      ...(customerId ? { customerId } : {}),
      customer: { deletedAt: null }
    },
    select: {
      id: true,
      status: true,
      purchased: true,
      createdAt: true,
      visit: { select: { visitedAt: true } }
    }
  });

  if (!proposal) {
    throw new Error("商品提案が見つかりません。");
  }

  if (!proposal.purchased) {
    throw new Error("購入済みの商品だけアンケートを発行できます。");
  }

  return createProductReviewRequestRecord({
    db: prisma,
    proposal,
    visitAt: proposal.visit?.visitedAt ?? proposal.createdAt,
    baseUrl
  });
}
