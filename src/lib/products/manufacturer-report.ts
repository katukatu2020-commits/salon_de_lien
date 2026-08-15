import { prisma } from "@/lib/prisma";
import { parseStringArray } from "@/lib/products/product-review";

const MAX_REVIEWS_PER_PRODUCT = 50;
const MIN_ANONYMOUS_SAMPLE_SIZE = Number(process.env.MANUFACTURER_MIN_SAMPLE_SIZE ?? 5);

type DateRange = {
  from?: Date;
  to?: Date;
};

type RankingItem = {
  label: string;
  count: number;
};

function periodWhere(range: DateRange, field: "createdAt" | "submittedAt" | "requestedAt") {
  if (!range.from && !range.to) {
    return {};
  }

  return {
    [field]: {
      ...(range.from ? { gte: range.from } : {}),
      ...(range.to ? { lte: range.to } : {})
    }
  };
}

function increment(counts: Map<string, number>, label: string) {
  const normalized = label.trim();
  if (!normalized) {
    return;
  }

  counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
}

function ranking(counts: Map<string, number>, limit = 8): RankingItem[] {
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"))
    .slice(0, limit);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
}

function ratingBreakdown(values: number[]) {
  return {
    star1: values.filter((rating) => rating === 1).length,
    star2: values.filter((rating) => rating === 2).length,
    star3: values.filter((rating) => rating === 3).length,
    star4: values.filter((rating) => rating === 4).length,
    star5: values.filter((rating) => rating === 5).length
  };
}

function ageGroupFromBirthYear(birthYear: number | null | undefined) {
  if (!birthYear) {
    return "年代不明";
  }

  const age = new Date().getFullYear() - birthYear;

  if (age < 20) return "10代";
  if (age < 30) return "20代";
  if (age < 40) return "30代";
  if (age < 50) return "40代";
  if (age < 60) return "50代";
  if (age < 70) return "60代";
  return "70代以上";
}

function safeAnonymousComment(value: string | null | undefined) {
  const comment = value?.trim() ?? "";
  if (!comment) return "";
  if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(comment)) return "";
  if (/(?:0\d{1,4}[-ー‐－]?\d{1,4}[-ー‐－]?\d{3,4})/.test(comment)) return "";
  return comment;
}

function toOrderedBreakdown(counts: Map<string, number>, order: string[]) {
  const ordered = order
    .filter((label) => counts.has(label))
    .map((label) => ({ label, count: counts.get(label) ?? 0 }));

  const extras = Array.from(counts.entries())
    .filter(([label]) => !order.includes(label))
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ja"));

  return [...ordered, ...extras];
}

export async function getManufacturerProductNames(manufacturer: string, organizationId?: string | null) {
  const products = await prisma.product.findMany({
    where: {
      manufacturerName: manufacturer,
      ...(organizationId ? { organizationId } : {}),
      active: true
    },
    orderBy: { name: "asc" },
    select: { name: true }
  });

  return products.map((product) => product.name);
}

export async function getManufacturerNames(organizationId?: string | null) {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(organizationId ? { organizationId } : {})
    },
    distinct: ["manufacturerName"],
    orderBy: { manufacturerName: "asc" },
    select: { manufacturerName: true }
  });

  return products.map((product) => product.manufacturerName).filter(Boolean);
}

export async function getManufacturerProductCategories(manufacturer?: string, organizationId?: string | null) {
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(manufacturer ? { manufacturerName: manufacturer } : {}),
      ...(organizationId ? { organizationId } : {}),
      category: {
        not: null
      }
    },
    distinct: ["category"],
    orderBy: { category: "asc" },
    select: { category: true }
  });

  return products.map((product) => product.category).filter((category): category is string => Boolean(category));
}

export async function getManufacturerReviewEditorOptions(manufacturer: string, organizationId?: string | null) {
  const [products, customers] = await Promise.all([
    prisma.product.findMany({
      where: {
        manufacturerName: manufacturer,
        ...(organizationId ? { organizationId } : {}),
        active: true
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true
      }
    }),
    prisma.customer.findMany({
      where: {
        deletedAt: null,
        ...(organizationId ? { organizationId } : {})
      },
      orderBy: { name: "asc" },
      take: 300,
      select: {
        id: true,
        name: true,
        gender: true,
        birthYear: true
      }
    })
  ]);

  return { products, customers };
}

export async function getManufacturerProductReport({
  manufacturer,
  organizationId,
  productName,
  category,
  from,
  to,
  includeCustomerLinks = false
}: {
  manufacturer: string;
  organizationId?: string | null;
  productName?: string;
  category?: string;
  from?: Date;
  to?: Date;
  includeCustomerLinks?: boolean;
}) {
  const range = { from, to };
  const normalizedProductName = productName?.trim();
  const normalizedCategory = category?.trim();
  const products = await prisma.product.findMany({
    where: {
      manufacturerName: manufacturer,
      ...(organizationId ? { organizationId } : {}),
      active: true,
      ...(normalizedCategory ? { category: normalizedCategory } : {}),
      ...(normalizedProductName
        ? {
            name: {
              contains: normalizedProductName,
              mode: "insensitive"
            }
          }
        : {})
    },
    orderBy: [{ manufacturerName: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      manufacturerName: true,
      category: true,
      proposals: {
        where: {
          customer: { deletedAt: null, ...(organizationId ? { organizationId } : {}) },
          ...periodWhere(range, "createdAt")
        },
        select: {
          id: true,
          status: true,
          reaction: true,
          purchased: true,
          concernTags: true,
          customer: {
            select: {
              id: true,
              name: true,
              gender: true,
              birthYear: true
            }
          },
          reviewRequests: {
            where: periodWhere(range, "requestedAt"),
            select: {
              id: true,
              status: true
            }
          },
          reviews: {
            where: {
              allowAnonymousShare: true,
              ...periodWhere(range, "submittedAt")
            },
            orderBy: { submittedAt: "desc" },
            select: {
              id: true,
              usedStatus: true,
              rating: true,
              goodPoints: true,
              badPoints: true,
              repeatIntent: true,
              freeComment: true,
              allowAnonymousQuote: true,
              submittedAt: true
            }
          }
        }
      }
    }
  });

  const respondentById = new Map<string, { ageGroup: string; gender: string | null }>();
  const ageGroupCounts = new Map<string, number>();
  const genderCounts = new Map<string, number>();

  const mappedProducts = products.map((product) => {
    const goodCounts = new Map<string, number>();
    const badCounts = new Map<string, number>();
    const concernCounts = new Map<string, number>();

    for (const proposal of product.proposals) {
      for (const tag of parseStringArray(proposal.concernTags)) {
        increment(concernCounts, tag);
      }
    }

    const reviewRows = product.proposals.flatMap((proposal) =>
      proposal.reviews.map((review) => {
        const ageGroup = ageGroupFromBirthYear(proposal.customer.birthYear);
        const gender = proposal.customer.gender ?? "未設定";

        if (!respondentById.has(proposal.customer.id)) {
          respondentById.set(proposal.customer.id, { ageGroup, gender });
          increment(ageGroupCounts, ageGroup);
          increment(genderCounts, gender);
        }

        for (const point of parseStringArray(review.goodPoints)) {
          increment(goodCounts, point);
        }

        for (const point of parseStringArray(review.badPoints)) {
          increment(badCounts, point);
        }

        return {
          reviewId: review.id,
          reviewerName: includeCustomerLinks ? proposal.customer.name : "匿名のお客様",
          ...(includeCustomerLinks ? { reviewerHref: `/admin/customers/${proposal.customer.id}` } : {}),
          reviewerGender: includeCustomerLinks ? gender : "非表示",
          reviewerAgeGroup: includeCustomerLinks ? ageGroup : "非表示",
          rating: review.rating,
          usedStatus: review.usedStatus,
          comment: review.allowAnonymousQuote ? safeAnonymousComment(review.freeComment) : "",
          goodPoints: parseStringArray(review.goodPoints),
          badPoints: parseStringArray(review.badPoints),
          repeatIntent: review.repeatIntent,
          submittedAt: review.submittedAt.toISOString()
        };
      })
    );

    const protectedReviewRows = reviewRows.map((review) => ({
      ...review,
      comment: reviewRows.length >= Math.max(3, MIN_ANONYMOUS_SAMPLE_SIZE) ? review.comment : ""
    }));
    const ratingValues = protectedReviewRows
      .map((review) => review.rating)
      .filter((rating): rating is number => typeof rating === "number");

    return {
      productId: product.id,
      productName: product.name,
      category: product.category,
      reviewCount: protectedReviewRows.length,
      averageRating: average(ratingValues),
      ratingBreakdown: ratingBreakdown(ratingValues),
      goodPointRanking: ranking(goodCounts),
      badPointRanking: ranking(badCounts),
      concernTagBreakdown: ranking(concernCounts),
      reviews: protectedReviewRows
        .sort((a, b) => Date.parse(b.submittedAt) - Date.parse(a.submittedAt))
        .slice(0, MAX_REVIEWS_PER_PRODUCT)
    };
  });

  return {
    manufacturer,
    period: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null
    },
    respondentCount: respondentById.size,
    ageGroupBreakdown:
      respondentById.size >= Math.max(3, MIN_ANONYMOUS_SAMPLE_SIZE)
        ? toOrderedBreakdown(ageGroupCounts, ["10代", "20代", "30代", "40代", "50代", "60代", "70代以上", "年代不明"])
        : [],
    genderBreakdown: respondentById.size >= Math.max(3, MIN_ANONYMOUS_SAMPLE_SIZE) ? ranking(genderCounts) : [],
    products: mappedProducts
  };
}
