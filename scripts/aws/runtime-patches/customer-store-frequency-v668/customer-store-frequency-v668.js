'use strict'

const crypto = require('crypto')
const baseMembership = require('./customer-store-unlink-v654.js')

async function countRegisteredStores(db, appUserId) {
  const rows = await db.$queryRawUnsafe(`SELECT COUNT(*)::int AS "count"
    FROM "CustomerStoreLink" l
    JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
    WHERE l."appUserId"=$1`, appUserId)
  return Number(rows[0]?.count || 0)
}

async function prepareLink(tx, { appUserId, targetOrganizationId, canonicalOrganizationId, canonicalCustomerId }) {
  await tx.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE "id"=$1 AND "role"=\'CUSTOMER\' AND "active"=TRUE FOR UPDATE', appUserId)

  let existing = await tx.$queryRawUnsafe(`SELECT l."customerId" FROM "CustomerStoreLink" l
    JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
    WHERE l."appUserId"=$1 AND l."organizationId"=$2 LIMIT 1`, appUserId, targetOrganizationId)
  if (existing[0]) {
    return { alreadyLinked: true, customerId: existing[0].customerId, count: await countRegisteredStores(tx, appUserId) }
  }

  if (canonicalOrganizationId && canonicalCustomerId && canonicalOrganizationId !== targetOrganizationId) {
    const excluded = await tx.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreExclusion" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', appUserId, canonicalOrganizationId)
    if (!excluded[0]) {
      await tx.$queryRawUnsafe(`INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt")
        SELECT $1,$2,$3,$4,NOW()
        WHERE EXISTS (SELECT 1 FROM "Customer" WHERE "id"=$4 AND "organizationId"=$3 AND "deletedAt" IS NULL)
        ON CONFLICT DO NOTHING RETURNING "id"`, crypto.randomUUID(), appUserId, canonicalOrganizationId, canonicalCustomerId)
    }
  }

  existing = await tx.$queryRawUnsafe(`SELECT l."customerId" FROM "CustomerStoreLink" l
    JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
    WHERE l."appUserId"=$1 AND l."organizationId"=$2 LIMIT 1`, appUserId, targetOrganizationId)
  if (existing[0]) {
    return { alreadyLinked: true, customerId: existing[0].customerId, count: await countRegisteredStores(tx, appUserId) }
  }

  await tx.$executeRawUnsafe('DELETE FROM "CustomerStoreExclusion" WHERE "appUserId"=$1 AND "organizationId"=$2', appUserId, targetOrganizationId)
  return { alreadyLinked: false, count: await countRegisteredStores(tx, appUserId) }
}

async function restoreAllEligibleLinks(prisma, session) {
  await baseMembership.ensureSchema(prisma)
  await prisma.$transaction(async tx => {
    await tx.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE "id"=$1 AND "role"=\'CUSTOMER\' AND "active"=TRUE FOR UPDATE', session.userId)
    const memberships = await tx.$queryRawUnsafe(`SELECT candidates."organizationId",candidates."customerId"
      FROM (
        SELECT u."organizationId",u."customerId",0 AS priority,u."updatedAt" AS "linkedAt"
        FROM "AppUser" u
        JOIN "Customer" c ON c."id"=u."customerId" AND c."organizationId"=u."organizationId"
          AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL
        WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
        UNION ALL
        SELECT i."organizationId",i."customerId",1 AS priority,i."usedAt" AS "linkedAt"
        FROM "AppUser" u
        JOIN "CustomerRegistrationInvite" i ON LOWER(i."email")=LOWER(u."email") AND i."customerId" IS NOT NULL AND i."usedAt" IS NOT NULL
        JOIN "Customer" c ON c."id"=i."customerId" AND c."organizationId"=i."organizationId"
          AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL
        WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
      ) candidates
      WHERE NOT EXISTS (
        SELECT 1 FROM "CustomerStoreExclusion" x
        WHERE x."appUserId"=$1 AND x."organizationId"=candidates."organizationId"
      )
        AND NOT EXISTS (
          SELECT 1 FROM "CustomerStoreLink" l
          WHERE l."appUserId"=$1 AND l."organizationId"=candidates."organizationId"
        )
      ORDER BY candidates.priority,candidates."linkedAt" NULLS LAST,candidates."organizationId"`, session.userId)

    const restoredOrganizations = new Set()
    for (const membership of memberships) {
      if (restoredOrganizations.has(membership.organizationId)) continue
      restoredOrganizations.add(membership.organizationId)
      await tx.$queryRawUnsafe(`INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt")
        VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING RETURNING "id"`,
      crypto.randomUUID(), session.userId, membership.organizationId, membership.customerId)
    }
  }, { isolationLevel: 'ReadCommitted' })
}

async function availableStores(prisma, session, resolveCustomerSession) {
  await restoreAllEligibleLinks(prisma, session)
  const stores = await baseMembership.availableStores(prisma, session, resolveCustomerSession)
  const visitRows = await prisma.$queryRawUnsafe(`SELECT l."organizationId",COUNT(v."id")::int AS "visitCount"
    FROM "CustomerStoreLink" l
    JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
    LEFT JOIN "Visit" v ON v."customerId"=c."id"
    WHERE l."appUserId"=$1
      AND NOT EXISTS (
        SELECT 1 FROM "CustomerStoreExclusion" x
        WHERE x."appUserId"=l."appUserId" AND x."organizationId"=l."organizationId"
      )
    GROUP BY l."organizationId"`, session.userId)
  const visitsByOrganization = new Map(visitRows.map(row => [row.organizationId, Number(row.visitCount || 0)]))

  return stores
    .map(store => ({ ...store, visitCount: visitsByOrganization.get(store.organizationId) || 0 }))
    .sort((left, right) => right.visitCount - left.visitCount || String(left.organizationId).localeCompare(String(right.organizationId)))
}

module.exports = {
  ...baseMembership,
  MAX_STORES: null,
  STORE_LIMITED: false,
  countRegisteredStores,
  prepareLink,
  restoreAllEligibleLinks,
  availableStores,
}
