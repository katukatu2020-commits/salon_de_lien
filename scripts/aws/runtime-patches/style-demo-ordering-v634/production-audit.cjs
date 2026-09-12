'use strict'

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const organizationId = 'org_salon_de_lien'

function numeric(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [key, Number(value || 0)]))
}

async function main() {
  const organization = await prisma.$queryRawUnsafe(
    'SELECT "id","name" FROM "Organization" WHERE "id"=$1 LIMIT 1',
    organizationId,
  )
  if (!organization.length) throw new Error('Salon de Lien organization is missing.')

  const orderRows = await prisma.$queryRawUnsafe(
    `WITH eligible AS (
       SELECT post."id",post."displayOrder"
         FROM "VisitCommunityPost" post
         LEFT JOIN "Customer" customer
           ON customer."id"=post."customerId" AND customer."organizationId"=post."organizationId"
        WHERE post."organizationId"=$1 AND post."deletedAt" IS NULL
          AND ((post."postKind"='STORE' AND CARDINALITY(post."photoReferences")>0)
            OR (post."postKind"<>'STORE' AND customer."id" IS NOT NULL AND customer."deletedAt" IS NULL
              AND EXISTS (SELECT 1 FROM "VisitPhoto" photo WHERE photo."visitId"=post."visitId")))
     )
     SELECT COUNT(*)::int AS "postCount",
            COUNT("displayOrder")::int AS "orderedCount",
            COALESCE(MIN("displayOrder"),0)::int AS "minimumOrder",
            COALESCE(MAX("displayOrder"),0)::int AS "maximumOrder",
            (COUNT("displayOrder")-COUNT(DISTINCT "displayOrder"))::int AS "duplicateCount"
       FROM eligible`,
    organizationId,
  )
  const order = numeric(orderRows[0])

  const engagementRows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int AS "publishedPostCount",
            COUNT(*) FILTER (WHERE NOT EXISTS (
              SELECT 1 FROM "VisitCommunityLike" likes WHERE likes."postId"=post."id"
            ))::int AS "zeroLikeCount",
            COUNT(*) FILTER (WHERE NOT EXISTS (
              SELECT 1 FROM "VisitCommunityComment" comments
               WHERE comments."postId"=post."id" AND comments."deletedAt" IS NULL AND comments."isAiAssistant"=FALSE
            ))::int AS "zeroCommentCount",
            (SELECT COUNT(*)::int
               FROM "VisitCommunityComment" demo
               JOIN "VisitCommunityPost" demo_post ON demo_post."id"=demo."postId"
              WHERE demo_post."organizationId"=$1 AND demo."id" LIKE 'v634comment_%'
                AND demo."deletedAt" IS NULL) AS "demoCommentCount",
            (SELECT COUNT(*)::int
               FROM "VisitCommunityLike" demo_like
               JOIN "VisitCommunityPost" demo_post ON demo_post."id"=demo_like."postId"
              WHERE demo_post."organizationId"=$1 AND demo_like."id" LIKE 'v634like_%') AS "demoLikeCount"
       FROM "VisitCommunityPost" post
      WHERE post."organizationId"=$1 AND post."published"=TRUE AND post."deletedAt" IS NULL
        AND ((post."postKind"='STORE' AND CARDINALITY(post."photoReferences")>0)
          OR (post."postKind"<>'STORE' AND EXISTS (SELECT 1 FROM "VisitPhoto" photo WHERE photo."visitId"=post."visitId")))`,
    organizationId,
  )
  const engagement = numeric(engagementRows[0])
  const seeds = await prisma.$queryRawUnsafe(
    'SELECT "details" FROM "_OrimiaRuntimeSeed" WHERE "key"=$1 LIMIT 1',
    'style-demo-engagement-v634:org_salon_de_lien',
  )

  if (!order.postCount) throw new Error('Salon de Lien has no style posts.')
  if (order.orderedCount !== order.postCount || order.minimumOrder !== 1 || order.maximumOrder !== order.postCount || order.duplicateCount !== 0) {
    throw new Error(`Style No verification failed: ${JSON.stringify(order)}`)
  }
  if (!engagement.publishedPostCount || engagement.zeroLikeCount || engagement.zeroCommentCount) {
    throw new Error(`Demo engagement verification failed: ${JSON.stringify(engagement)}`)
  }
  if (!engagement.demoCommentCount || !engagement.demoLikeCount || !seeds.length) {
    throw new Error(`Demo seed persistence verification failed: ${JSON.stringify({ engagement, seed: seeds[0] || null })}`)
  }

  console.log(`STYLE_DEMO_ORDER_AUDIT_V634 ${JSON.stringify({
    organizationId,
    organizationName: organization[0].name,
    order,
    engagement,
    seed: seeds[0].details,
  })}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async error => {
    console.error(`STYLE_DEMO_ORDER_AUDIT_V634_FAILED ${error instanceof Error ? error.message : error}`)
    await prisma.$disconnect().catch(() => undefined)
    process.exit(1)
  })
