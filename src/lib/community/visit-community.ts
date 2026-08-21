import "server-only";

import type { AppRole, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeSalonStaffName } from "@/lib/salon/staff";
import { resolveCustomerPhotoReference } from "@/lib/storage/customer-photo";

export const COMMUNITY_PAGE_SIZE = 50;

export type CommunityActor = "customer" | "staff";
export type CommunitySort = "latest" | "oldest" | "likes";
export type CommunityAgeBand = "all" | "under20" | "20s" | "30s" | "40s" | "50s" | "60s" | "70plus";

export type CommunityListFilters = {
  sort: CommunitySort;
  stylist: string;
  course: string;
  gender: string;
  age: CommunityAgeBand;
  page: number;
};

export type CommunityFilterOption = { value: string; label: string };

export type CommunityCommentView = {
  id: string;
  authorDisplayName: string;
  authorRole: AppRole;
  isStylistComment: boolean;
  isAiAssistant: boolean;
  body: string;
  createdAt: string;
};

export type CommunityPostView = {
  id: string;
  customerName: string;
  visitDate: string;
  menu: string;
  stylistName: string;
  photos: Array<{ id: string; url: string; caption: string | null }>;
  likeCount: number;
  likedByCurrentUser: boolean;
  comments: CommunityCommentView[];
  publishedAt: string;
};

export type CommunityListPostView = {
  id: string;
  coverPhotoUrl: string;
};

export type CommunityListResult = {
  posts: CommunityListPostView[];
  totalCount: number;
  page: number;
  totalPages: number;
  filters: CommunityListFilters;
  options: {
    stylists: CommunityFilterOption[];
    courses: CommunityFilterOption[];
    genders: CommunityFilterOption[];
  };
};

const validSorts = new Set<CommunitySort>(["latest", "oldest", "likes"]);
const validAgeBands = new Set<CommunityAgeBand>(["all", "under20", "20s", "30s", "40s", "50s", "60s", "70plus"]);

function singleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function parseCommunityListFilters(searchParams?: Record<string, string | string[] | undefined>): CommunityListFilters {
  const requestedSort = singleQueryValue(searchParams?.sort) as CommunitySort;
  const requestedAge = singleQueryValue(searchParams?.age) as CommunityAgeBand;
  const requestedPage = Number(singleQueryValue(searchParams?.page));
  return {
    sort: validSorts.has(requestedSort) ? requestedSort : "latest",
    stylist: singleQueryValue(searchParams?.stylist).trim().slice(0, 80),
    course: singleQueryValue(searchParams?.course).trim().slice(0, 120),
    gender: singleQueryValue(searchParams?.gender).trim().slice(0, 40),
    age: validAgeBands.has(requestedAge) ? requestedAge : "all",
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  };
}

export function communityDisplayName(name: string) {
  const normalized = name.trim();
  if (!normalized) return "お客様";
  const parts = normalized.split(/[\s　]+/).filter(Boolean);
  if (parts.length > 1) return `${parts[parts.length - 1]}さん`;
  if (normalized.length <= 2) return `${normalized.slice(0, 1)}さん`;
  return `${normalized.slice(0, 1)}＊＊さん`;
}

export function normalizeCommunityComment(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (normalized.length < 1 || normalized.length > 300) return null;
  return normalized;
}

function yearsAgo(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

function ageCustomerFilter(age: CommunityAgeBand): Prisma.CustomerWhereInput | null {
  const currentYear = new Date().getFullYear();
  if (age === "all") return null;
  if (age === "under20") {
    return {
      OR: [
        { birthDate: { gt: yearsAgo(20) } },
        { birthDate: null, birthYear: { gte: currentYear - 19 } }
      ]
    };
  }
  if (age === "70plus") {
    return {
      OR: [
        { birthDate: { lte: yearsAgo(70) } },
        { birthDate: null, birthYear: { lte: currentYear - 70 } }
      ]
    };
  }

  const minimum = Number(age.replace("s", ""));
  const maximum = minimum + 9;
  return {
    OR: [
      { birthDate: { gt: yearsAgo(maximum + 1), lte: yearsAgo(minimum) } },
      { birthDate: null, birthYear: { gte: currentYear - maximum, lte: currentYear - minimum } }
    ]
  };
}

function communityWhere(organizationId: string, filters: CommunityListFilters): Prisma.VisitCommunityPostWhereInput {
  const hasVisitFilter = Boolean(filters.stylist || filters.course || filters.gender || filters.age !== "all");
  const visitPost: Prisma.VisitCommunityPostWhereInput = {
    postKind: "VISIT",
    customer: { is: { deletedAt: null } },
    visit: { is: { photos: { some: {} } } }
  };
  const conditions: Prisma.VisitCommunityPostWhereInput[] = [{
    organizationId,
    published: true,
    OR: hasVisitFilter
      ? [visitPost]
      : [visitPost, { postKind: "STORE", photoReferences: { isEmpty: false } }]
  }];
  if (filters.stylist) conditions.push({ visit: { is: { stylistName: filters.stylist } } });
  if (filters.course) {
    conditions.push({
      OR: [
        { visit: { is: { performedStyle: filters.course } } },
        { visit: { is: { requestedStyle: filters.course } } }
      ]
    });
  }
  if (filters.gender) conditions.push({ customer: { is: { gender: filters.gender } } });
  const ageFilter = ageCustomerFilter(filters.age);
  if (ageFilter) conditions.push({ customer: { is: ageFilter } });
  return { AND: conditions };
}

function communityOrderBy(sort: CommunitySort): Prisma.VisitCommunityPostOrderByWithRelationInput[] {
  if (sort === "oldest") return [{ publishedAt: "asc" }, { id: "asc" }];
  if (sort === "likes") return [{ likes: { _count: "desc" } }, { publishedAt: "desc" }];
  return [{ publishedAt: "desc" }, { id: "desc" }];
}

async function loadCommunityFilterOptions(organizationId: string) {
  const rows = await prisma.visitCommunityPost.findMany({
    where: {
      organizationId,
      published: true,
      postKind: "VISIT",
      customer: { is: { deletedAt: null } },
      visit: { is: { photos: { some: {} } } }
    },
    select: {
      customer: { select: { gender: true } },
      visit: { select: { stylistName: true, performedStyle: true, requestedStyle: true } }
    }
  });

  const stylistMap = new Map<string, string>();
  const courses = new Set<string>();
  const genders = new Set<string>();
  for (const row of rows) {
    const stylist = row.visit?.stylistName?.trim();
    if (stylist) stylistMap.set(stylist, normalizeSalonStaffName(stylist) ?? stylist);
    const course = (row.visit?.performedStyle ?? row.visit?.requestedStyle)?.trim();
    if (course) courses.add(course);
    const gender = row.customer?.gender?.trim();
    if (gender) genders.add(gender);
  }

  return {
    stylists: [...stylistMap.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "ja")),
    courses: [...courses].sort((a, b) => a.localeCompare(b, "ja")).map((value) => ({ value, label: value })),
    genders: [...genders].sort((a, b) => a.localeCompare(b, "ja")).map((value) => ({ value, label: value }))
  };
}

export async function loadVisitCommunityPostList({
  organizationId,
  filters
}: {
  organizationId: string;
  filters: CommunityListFilters;
}): Promise<CommunityListResult> {
  const where = communityWhere(organizationId, filters);
  const [totalCount, options] = await Promise.all([
    prisma.visitCommunityPost.count({ where }),
    loadCommunityFilterOptions(organizationId)
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / COMMUNITY_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const rows = await prisma.visitCommunityPost.findMany({
    where,
    orderBy: communityOrderBy(filters.sort),
    skip: (page - 1) * COMMUNITY_PAGE_SIZE,
    take: COMMUNITY_PAGE_SIZE,
    select: {
      id: true,
      postKind: true,
      photoReferences: true,
      visit: {
        select: {
          photos: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { storageReference: true }
          }
        }
      }
    }
  });

  const posts = (await Promise.all(rows.map(async (post) => ({
    id: post.id,
    coverPhotoUrl: await resolveCustomerPhotoReference(
      post.postKind === "STORE" ? post.photoReferences[0] : post.visit?.photos[0]?.storageReference
    )
  })))).filter((post): post is CommunityListPostView => Boolean(post.coverPhotoUrl));

  return {
    posts,
    totalCount,
    page,
    totalPages,
    filters: { ...filters, page },
    options
  };
}

export async function loadVisitCommunityPostDetail({
  organizationId,
  currentUserId,
  postId
}: {
  organizationId: string;
  currentUserId: string | null;
  postId: string;
}): Promise<CommunityPostView | null> {
  const post = await prisma.visitCommunityPost.findFirst({
    where: {
      id: postId,
      organizationId,
      published: true,
      OR: [
        { postKind: "STORE", photoReferences: { isEmpty: false } },
        { postKind: "VISIT", customer: { is: { deletedAt: null } }, visit: { is: { photos: { some: {} } } } }
      ]
    },
    select: {
      id: true,
      publishedAt: true,
      postKind: true,
      caption: true,
      photoReferences: true,
      publishedByName: true,
      customer: { select: { name: true } },
      visit: {
        select: {
          visitedAt: true,
          performedStyle: true,
          requestedStyle: true,
          stylistName: true,
          photos: {
            orderBy: { createdAt: "asc" },
            select: { id: true, storageReference: true, caption: true }
          }
        }
      },
      likes: { select: { appUserId: true } },
      comments: {
        where: { deletedAt: null, isAiAssistant: false },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: {
          id: true,
          authorDisplayName: true,
          authorRole: true,
          isStylistComment: true,
          isAiAssistant: true,
          body: true,
          createdAt: true
        }
      }
    }
  });
  if (!post) return null;

  const photos = post.postKind === "STORE"
    ? await Promise.all(post.photoReferences.map(async (reference, index) => ({
        id: `${post.id}-${index}`,
        url: await resolveCustomerPhotoReference(reference),
        caption: post.caption
      })))
    : await Promise.all((post.visit?.photos ?? []).map(async (photo) => ({
        id: photo.id,
        url: await resolveCustomerPhotoReference(photo.storageReference),
        caption: photo.caption
      })));

  return {
    id: post.id,
    customerName: post.postKind === "STORE" ? "Salon de Lien" : communityDisplayName(post.customer?.name ?? ""),
    visitDate: (post.visit?.visitedAt ?? post.publishedAt).toISOString(),
    menu: post.postKind === "STORE" ? "店舗スタイル" : post.visit?.performedStyle ?? post.visit?.requestedStyle ?? "施術記録",
    stylistName: post.postKind === "STORE" ? post.publishedByName?.trim() || "店舗スタッフ" : normalizeSalonStaffName(post.visit?.stylistName) ?? "フリー",
    photos: photos.filter((photo): photo is { id: string; url: string; caption: string | null } => Boolean(photo.url)),
    likeCount: post.likes.length,
    likedByCurrentUser: Boolean(currentUserId && post.likes.some((like) => like.appUserId === currentUserId)),
    comments: post.comments.map((comment) => ({ ...comment, createdAt: comment.createdAt.toISOString() })),
    publishedAt: post.publishedAt.toISOString()
  };
}
