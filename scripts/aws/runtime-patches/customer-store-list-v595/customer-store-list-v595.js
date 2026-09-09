'use strict'
const crypto = require('crypto')
const { resolveCustomerSession } = require('./customer-session-v591.js')

async function availableStores(prisma, session) {
  const memberships = await prisma.$queryRawUnsafe(`SELECT u."organizationId",u."customerId"
    FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId" AND c."organizationId"=u."organizationId"
      AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL
    WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
    UNION
    SELECT i."organizationId",i."customerId"
    FROM "AppUser" u JOIN "CustomerRegistrationInvite" i ON LOWER(i."email")=LOWER(u."email") AND i."customerId" IS NOT NULL AND i."usedAt" IS NOT NULL
    JOIN "Customer" c ON c."id"=i."customerId" AND c."organizationId"=i."organizationId"
      AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL
    WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE`, session.userId)
  for (const membership of memberships) {
    await prisma.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING', crypto.randomUUID(), session.userId, membership.organizationId, membership.customerId)
  }

  // Only an existing owned link plus a same-store merge chain can repair a stale
  // customer pointer. Never infer ownership from names or phone numbers.
  try {
    await prisma.$executeRawUnsafe(`WITH RECURSIVE chain AS (
      SELECT l."id" AS link_id,l."organizationId" AS org,l."customerId" AS original_id,
        l."customerId" AS customer_id,ARRAY[l."customerId"] AS path
      FROM "CustomerStoreLink" l JOIN "AppUser" u ON u."id"=l."appUserId" AND u."role"='CUSTOMER' AND u."active"=TRUE
      JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
      WHERE l."appUserId"=$1
      UNION ALL
      SELECT m.link_id,m.org,m.original_id,h."targetCustomerId",m.path||h."targetCustomerId"
      FROM chain m JOIN "CustomerMergeHistory" h ON h."sourceCustomerId"=m.customer_id AND h."organizationId"=m.org
      JOIN "Customer" c ON c."id"=h."targetCustomerId" AND c."organizationId"=m.org AND c."deletedAt" IS NULL
      WHERE cardinality(m.path)<=16 AND NOT h."targetCustomerId"=ANY(m.path)
    )
    UPDATE "CustomerStoreLink" l SET "customerId"=m.customer_id
    FROM chain m JOIN "Customer" c ON c."id"=m.customer_id AND c."organizationId"=m.org
      AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL
    WHERE l."id"=m.link_id AND l."appUserId"=$1 AND l."organizationId"=m.org AND l."customerId"=m.original_id
      AND cardinality(m.path)>1
      AND NOT EXISTS (SELECT 1 FROM "CustomerMergeHistory" h WHERE h."sourceCustomerId"=m.customer_id AND h."organizationId"=m.org)
      AND NOT EXISTS (SELECT 1 FROM "CustomerStoreLink" other WHERE other."customerId"=m.customer_id AND other."id"<>l."id")
      AND NOT EXISTS (SELECT 1 FROM "AppUser" other WHERE other."customerId"=m.customer_id AND other."role"='CUSTOMER' AND other."id"<>$1)`, session.userId)
  } catch (error) {
    if (!(error.code === 'P2010' && error.meta?.code === '23505')) throw error
    // A concurrent ownership change won the unique constraint; leave it intact.
  }

  const rows = await prisma.$queryRawUnsafe(`SELECT l."organizationId",l."customerId",o."name",o."publicCode",TRUE AS "linked",
      l."organizationId"=$2 AS "current",l."createdAt"
    FROM "CustomerStoreLink" l JOIN "Organization" o ON o."id"=l."organizationId"
    JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
    JOIN "AppUser" u ON u."id"=l."appUserId" AND u."role"='CUSTOMER' AND u."active"=TRUE
    WHERE l."appUserId"=$1 ORDER BY "current" DESC,l."createdAt",l."organizationId"`, session.userId, session.organizationId)
  for (const row of rows) {
    const selected = await resolveCustomerSession(prisma, { ...session, customerId: row.customerId, organizationId: row.organizationId })
    row.available = Boolean(selected)
  }
  return rows
}

module.exports = { availableStores }
