import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class CommunityOrderError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "CommunityOrderError";
  }
}

async function orderedPostIds(organizationId: string, client: Prisma.TransactionClient) {
  const rows = await client.visitCommunityPost.findMany({
    where: { organizationId },
    select: { id: true, displayOrder: true },
    orderBy: [
      { displayOrder: { sort: "asc", nulls: "last" } },
      { publishedAt: "desc" },
      { id: "desc" }
    ]
  });
  return rows;
}

async function writeContiguousOrder(
  organizationId: string,
  ids: string[],
  client: Prisma.TransactionClient
) {
  if (!ids.length) return;
  const values = ids.map((id, index) => Prisma.sql`(${id}::text, ${index + 1}::integer)`);
  await client.$executeRaw`
    UPDATE "VisitCommunityPost" AS post
       SET "displayOrder" = desired.position
      FROM (VALUES ${Prisma.join(values)}) AS desired(id, position)
     WHERE post."organizationId" = ${organizationId}
       AND post."id" = desired.id
       AND post."displayOrder" IS DISTINCT FROM desired.position
  `;
}

export async function normalizeCommunityDisplayOrder(organizationId: string) {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`WITH locked AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${`community-order:${organizationId}`}))) SELECT 1::int AS locked FROM locked`;
    const rows = await orderedPostIds(organizationId, transaction);
    const needsUpdate = rows.some((row, index) => row.displayOrder !== index + 1);
    if (needsUpdate) await writeContiguousOrder(organizationId, rows.map((row) => row.id), transaction);
    return rows.length;
  });
}

export async function moveCommunityPost(organizationId: string, postId: string, requestedOrder: number) {
  if (!Number.isInteger(requestedOrder) || requestedOrder < 1) {
    throw new CommunityOrderError("Noは1以上の整数で入力してください。");
  }

  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`WITH locked AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext(${`community-order:${organizationId}`}))) SELECT 1::int AS locked FROM locked`;
    const rows = await orderedPostIds(organizationId, transaction);
    const ids = rows.map((row) => row.id);
    const currentIndex = ids.indexOf(postId);
    if (currentIndex < 0) throw new CommunityOrderError("スタイル投稿が見つかりません。", 404);

    ids.splice(currentIndex, 1);
    const targetIndex = Math.min(requestedOrder - 1, ids.length);
    ids.splice(targetIndex, 0, postId);
    await writeContiguousOrder(organizationId, ids, transaction);
    return { postId, displayOrder: targetIndex + 1, totalCount: ids.length };
  });
}
