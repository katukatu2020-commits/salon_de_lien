'use strict'

const RELEASE = 'style-demo-ordering-v634'
let schemaReadyPromise = null

class StylePostOrderError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'StylePostOrderError'
    this.status = status
  }
}

async function ensureStylePostOrderSchema(prisma) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "VisitCommunityPost"
          ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER
      `)
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "VisitCommunityPost_organizationId_displayOrder_idx"
          ON "VisitCommunityPost"("organizationId", "displayOrder")
      `)
    })().catch(error => {
      schemaReadyPromise = null
      throw error
    })
  }
  return schemaReadyPromise
}

async function lockOrganization(prisma, organizationId) {
  await prisma.$queryRawUnsafe(
    'WITH locked AS MATERIALIZED (SELECT pg_advisory_xact_lock(hashtext($1))) SELECT 1::int AS locked FROM locked',
    `${RELEASE}:${organizationId}`,
  )
}

async function loadEligibleRows(prisma, organizationId) {
  return prisma.$queryRawUnsafe(
    `SELECT p."id", p."displayOrder"
       FROM "VisitCommunityPost" p
       LEFT JOIN "Customer" c
         ON c."id"=p."customerId" AND c."organizationId"=p."organizationId"
      WHERE p."organizationId"=$1
        AND p."deletedAt" IS NULL
        AND (
          (p."postKind"='STORE' AND CARDINALITY(p."photoReferences")>0)
          OR
          (p."postKind"<>'STORE' AND c."id" IS NOT NULL AND c."deletedAt" IS NULL
            AND EXISTS (
              SELECT 1 FROM "VisitPhoto" photo WHERE photo."visitId"=p."visitId"
            ))
        )
      ORDER BY
        CASE WHEN p."displayOrder" IS NULL OR p."displayOrder" < 1 THEN 1 ELSE 0 END,
        p."displayOrder" ASC NULLS LAST,
        p."publishedAt" DESC,
        p."id" DESC`,
    organizationId,
  )
}

async function persistOrder(prisma, organizationId, orderedIds) {
  if (!orderedIds.length) return 0
  const values = orderedIds.map((_, index) => `($${index + 2}::text,${index + 1})`).join(',')
  return prisma.$executeRawUnsafe(
    `UPDATE "VisitCommunityPost" post
        SET "displayOrder"=desired.position
       FROM (VALUES ${values}) AS desired(id,position)
      WHERE post."organizationId"=$1
        AND post."id"=desired.id
        AND post."displayOrder" IS DISTINCT FROM desired.position`,
    organizationId,
    ...orderedIds,
  )
}

function needsNormalization(rows) {
  return rows.some((row, index) => Number(row.displayOrder || 0) !== index + 1)
}

async function normalizeStylePostOrder(prisma, organizationId) {
  await ensureStylePostOrderSchema(prisma)
  return prisma.$transaction(async transaction => {
    await lockOrganization(transaction, organizationId)
    const rows = await loadEligibleRows(transaction, organizationId)
    if (needsNormalization(rows)) {
      await persistOrder(transaction, organizationId, rows.map(row => String(row.id)))
    }
    return { count: rows.length, changed: needsNormalization(rows) }
  })
}

async function moveStylePost(prisma, organizationId, postId, requestedOrder) {
  const target = Number(requestedOrder)
  if (!Number.isInteger(target) || target < 1) {
    throw new StylePostOrderError('Noは1以上の整数で入力してください。')
  }
  await ensureStylePostOrderSchema(prisma)
  return prisma.$transaction(async transaction => {
    await lockOrganization(transaction, organizationId)
    const rows = await loadEligibleRows(transaction, organizationId)
    const orderedIds = rows.map(row => String(row.id))
    const currentIndex = orderedIds.indexOf(String(postId))
    if (currentIndex < 0) throw new StylePostOrderError('並べ替えるスタイルが見つかりません。', 404)

    orderedIds.splice(currentIndex, 1)
    const targetIndex = Math.min(target - 1, orderedIds.length)
    orderedIds.splice(targetIndex, 0, String(postId))
    await persistOrder(transaction, organizationId, orderedIds)

    return {
      postId: String(postId),
      displayOrder: targetIndex + 1,
      totalCount: orderedIds.length,
    }
  })
}

async function stylePostOrderSummary(prisma, organizationId) {
  await normalizeStylePostOrder(prisma, organizationId)
  const rows = await prisma.$queryRawUnsafe(
    `WITH eligible AS (
       SELECT p."id",p."displayOrder"
         FROM "VisitCommunityPost" p
         LEFT JOIN "Customer" customer
           ON customer."id"=p."customerId" AND customer."organizationId"=p."organizationId"
        WHERE p."organizationId"=$1 AND p."deletedAt" IS NULL
          AND ((p."postKind"='STORE' AND CARDINALITY(p."photoReferences")>0)
            OR (p."postKind"<>'STORE' AND customer."id" IS NOT NULL AND customer."deletedAt" IS NULL
              AND EXISTS (SELECT 1 FROM "VisitPhoto" photo WHERE photo."visitId"=p."visitId")))
     )
     SELECT COUNT(*)::int AS "postCount",
            COUNT("displayOrder")::int AS "orderedCount",
            COALESCE(MIN("displayOrder"),0)::int AS "minimumOrder",
            COALESCE(MAX("displayOrder"),0)::int AS "maximumOrder",
            (COUNT("displayOrder")-COUNT(DISTINCT "displayOrder"))::int AS "duplicateCount"
       FROM eligible`,
    organizationId,
  )
  const row = rows[0] || {}
  return {
    postCount: Number(row.postCount || 0),
    orderedCount: Number(row.orderedCount || 0),
    minimumOrder: Number(row.minimumOrder || 0),
    maximumOrder: Number(row.maximumOrder || 0),
    duplicateCount: Number(row.duplicateCount || 0),
  }
}

module.exports = {
  RELEASE,
  StylePostOrderError,
  ensureStylePostOrderSchema,
  moveStylePost,
  normalizeStylePostOrder,
  stylePostOrderSummary,
}
