import type { PrismaClient } from "@prisma/client";

type CommunityOwnershipQueryClient = Pick<PrismaClient, "$queryRawUnsafe">;

export type CommunityCommentOwner = {
  appUserId: string | null;
  authorRole: string;
  appUser: {
    customerId: string | null;
    customerStoreLinks: Array<{ customerId: string }>;
  } | null;
};

export async function loadCommunityCustomerIdentityIds(
  db: CommunityOwnershipQueryClient,
  organizationId: string,
  currentCustomerId: string | null | undefined
) {
  const identityIds = new Set<string>();
  if (!currentCustomerId) return identityIds;
  identityIds.add(currentCustomerId);

  try {
    const rows = await db.$queryRawUnsafe<Array<{ customerId: string }>>(
      `WITH RECURSIVE "CustomerIdentity"("customerId", "depth") AS (
         SELECT $1::text, 0
         UNION ALL
         SELECT h."sourceCustomerId", i."depth" + 1
           FROM "CustomerIdentity" i
           JOIN "CustomerMergeHistory" h
             ON h."targetCustomerId" = i."customerId"
            AND h."organizationId" = $2
          WHERE i."depth" < 16
       )
       SELECT DISTINCT "customerId" FROM "CustomerIdentity"`,
      currentCustomerId,
      organizationId
    );
    rows.forEach((row) => {
      if (row.customerId) identityIds.add(row.customerId);
    });
  } catch (error) {
    console.warn("[community-comment-ownership] customer merge history is unavailable", {
      organizationId,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return identityIds;
}

export function canManageCommunityComment({
  actor,
  currentUserId,
  currentCustomerId,
  customerIdentityIds,
  comment
}: {
  actor: "customer" | "staff";
  currentUserId: string | null;
  currentCustomerId?: string | null;
  customerIdentityIds?: ReadonlySet<string>;
  comment: CommunityCommentOwner;
}) {
  if (currentUserId && comment.appUserId === currentUserId) return true;
  if (actor !== "customer" || comment.authorRole !== "CUSTOMER" || !currentCustomerId || !comment.appUser) {
    return false;
  }

  const identities = customerIdentityIds ?? new Set([currentCustomerId]);
  const ownerCustomerIds = [
    comment.appUser.customerId,
    ...comment.appUser.customerStoreLinks.map((link) => link.customerId)
  ];
  return ownerCustomerIds.some((customerId) => Boolean(customerId && identities.has(customerId)));
}
