"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createProductReviewRequestRecord,
  createProductReviewRequestForProposal,
  formStringArray,
  PRODUCT_PROPOSAL_REACTIONS,
  PRODUCT_PROPOSAL_STATUSES,
  safeNullableString
} from "@/lib/products/product-review";
import {
  requireBackofficeSession,
  requireCustomerAccess,
  requireProductProposalAccess
} from "@/lib/auth/authorization";

const PRODUCT_MASTER_CATEGORIES = ["シャンプー", "トリートメント", "スタイリング剤", "アウトバス", "その他"] as const;

function requiredString(formData: FormData, key: string) {
  const value = safeNullableString(formData.get(key));

  if (!value) {
    throw new Error(`${key} は必須です。`);
  }

  return value;
}

function limitedString(value: string, label: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length > maxLength) {
    throw new Error(`${label}は${maxLength}文字以内で入力してください。`);
  }

  return normalized;
}

function requiredInteger(formData: FormData, key: string, label: string, minimum: number, maximum: number) {
  const value = Number(requiredString(formData, key));

  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label}を正しく入力してください。`);
  }

  return value;
}

function productMasterInput(formData: FormData) {
  const manufacturerName = limitedString(requiredString(formData, "manufacturerName"), "メーカー名", 80);
  const name = limitedString(requiredString(formData, "name"), "商品名", 140);
  const categoryValue = limitedString(requiredString(formData, "category"), "カテゴリ", 60);
  const category = (PRODUCT_MASTER_CATEGORIES as readonly string[]).includes(categoryValue) ? categoryValue : null;
  const descriptionValue = safeNullableString(formData.get("description"));
  const description = descriptionValue ? limitedString(descriptionValue, "商品説明", 1200) : null;
  const alternativeRecommendationValue = safeNullableString(formData.get("alternativeRecommendation"));
  const alternativeRecommendation = alternativeRecommendationValue
    ? limitedString(alternativeRecommendationValue, "合わない場合の代替提案", 180)
    : null;
  const retailPrice = requiredInteger(formData, "retailPrice", "店頭価格", 1, 10_000_000);
  const stockQuantity = requiredInteger(formData, "stockQuantity", "在庫数", 0, 100_000);
  const concernTags = Array.from(
    new Set(
      formStringArray(formData, "concernTags")
        .map((tag) => tag.replace(/\s+/g, " ").trim())
        .filter((tag) => tag.length > 0 && tag.length <= 30)
    )
  ).slice(0, 16);

  if (!category) {
    throw new Error("カテゴリは指定された5種類から選択してください。");
  }

  return {
    manufacturerName,
    name,
    category,
    retailPrice,
    stockQuantity,
    concernTags,
    description,
    alternativeRecommendation
  };
}

function revalidateProductMaster() {
  revalidatePath("/admin/products");
  revalidatePath("/api/products");
  revalidatePath("/api/admin/products");
  revalidatePath("/admin/reports/manufacturer-products");
  revalidatePath("/admin/reports/product-feedback");
}

function redirectProductMaster(params: { notice?: string; error?: string; focus?: string }): never {
  const query = new URLSearchParams();
  if (params.notice) query.set("notice", params.notice);
  if (params.error) query.set("error", params.error);
  if (params.focus) query.set("focus", params.focus);
  redirect(`/admin/products?${query.toString()}#${params.focus ? `product-${params.focus}` : "product-catalog"}`);
}

function normalizeProductProposalStatus(value: string | null): string {
  return value && (PRODUCT_PROPOSAL_STATUSES as readonly string[]).includes(value) ? value : "proposed";
}

function normalizeProductProposalReaction(value: string | null): string | null {
  return value && (PRODUCT_PROPOSAL_REACTIONS as readonly string[]).includes(value) ? value : null;
}

export async function createProductMasterAction(formData: FormData) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  const input = productMasterInput(formData);
  const existing = await prisma.product.findFirst({
    where: {
      manufacturerName: { equals: input.manufacturerName, mode: "insensitive" },
      name: { equals: input.name, mode: "insensitive" },
      organizationId: session.organizationId ?? undefined
    },
    select: { id: true, active: true }
  });

  if (existing?.active) {
    redirectProductMaster({ error: "product-exists" });
  }

  if (existing) {
    await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...input,
        active: true
      }
    });
    revalidateProductMaster();
    redirectProductMaster({ notice: "product-reactivated", focus: existing.id });
  }

  const created = await prisma.product.create({
    data: {
      ...input,
      active: true,
      organizationId: session.organizationId ?? undefined
    },
    select: { id: true }
  });

  revalidateProductMaster();
  redirectProductMaster({ notice: "product-created", focus: created.id });
}

export async function updateProductMasterAction(formData: FormData) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  const productId = requiredString(formData, "productId");
  const input = productMasterInput(formData);
  const duplicate = await prisma.product.findFirst({
    where: {
      id: { not: productId },
      manufacturerName: { equals: input.manufacturerName, mode: "insensitive" },
      name: { equals: input.name, mode: "insensitive" },
      organizationId: session.organizationId ?? undefined,
      active: true
    },
    select: { id: true }
  });

  if (duplicate) {
    redirectProductMaster({ error: "product-exists" });
  }

  const result = await prisma.product.updateMany({
    where: {
      id: productId,
      organizationId: session.organizationId ?? undefined,
      active: true
    },
    data: input
  });

  if (result.count !== 1) {
    redirectProductMaster({ error: "product-not-found" });
  }

  revalidateProductMaster();
  redirectProductMaster({ notice: "product-updated" });
}

export async function deleteProductMasterAction(formData: FormData) {
  const session = await requireBackofficeSession(["ADMIN", "STAFF"]);
  const productId = requiredString(formData, "productId");
  const outcome = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, organizationId: session.organizationId ?? undefined },
      select: {
        id: true,
        _count: {
          select: {
            proposals: true
          }
        }
      }
    });

    if (!product) return "missing" as const;

    if (product._count.proposals > 0) {
      await tx.product.update({
        where: { id: product.id },
        data: { active: false }
      });
      return "archived" as const;
    }

    await tx.product.delete({ where: { id: product.id } });
    return "deleted" as const;
  });

  if (outcome === "missing") {
    redirectProductMaster({ error: "product-not-found" });
  }

  revalidateProductMaster();
  redirectProductMaster({ notice: outcome === "archived" ? "product-archived" : "product-deleted" });
}

export async function createProductProposalAction(customerId: string, formData: FormData) {
  const { session } = await requireCustomerAccess(customerId);
  const productId = requiredString(formData, "productId");
  const status = normalizeProductProposalStatus(safeNullableString(formData.get("status")));
  const reaction = normalizeProductProposalReaction(safeNullableString(formData.get("reaction")));
  const concernTags = formStringArray(formData, "concernTags").slice(0, 8);
  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      organizationId: session.organizationId ?? undefined,
      deletedAt: null
    },
    select: { id: true }
  });

  if (!customer) {
    throw new Error("顧客が見つかりません。");
  }

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      organizationId: session.organizationId ?? undefined,
      active: true
    },
    select: { id: true }
  });

  if (!product) {
    throw new Error("商品が見つかりません。");
  }

  const purchased = status === "purchased" || reaction === "purchased";

  await prisma.$transaction(async (tx) => {
    const proposal = await tx.productProposal.create({
      data: {
        customerId,
        productId,
        visitId: safeNullableString(formData.get("visitId")) ?? undefined,
        proposalReason: safeNullableString(formData.get("proposalReason")) ?? undefined,
        concernTags,
        status,
        reaction: reaction ?? undefined,
        purchased,
        note: safeNullableString(formData.get("note")) ?? undefined
      },
      select: {
        id: true,
        status: true,
        purchased: true,
        createdAt: true,
        visit: { select: { visitedAt: true } }
      }
    });

    if (purchased) {
      await createProductReviewRequestRecord({
        db: tx,
        proposal,
        visitAt: proposal.visit?.visitedAt ?? proposal.createdAt
      });
    }
  });

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath("/admin/reports/manufacturer-products");
}

export async function createProductReviewRequestAction(productProposalId: string, customerId: string) {
  const { proposal } = await requireProductProposalAccess(productProposalId);
  if (proposal.customerId !== customerId) throw new Error("商品提案と顧客が一致しません。");
  const result = await createProductReviewRequestForProposal({
    proposalId: productProposalId,
    customerId
  });

  revalidatePath(`/admin/customers/${customerId}`);
  return result;
}
