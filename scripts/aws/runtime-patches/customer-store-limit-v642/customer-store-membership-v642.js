'use strict'

const crypto = require('crypto')

const MAX_STORES = 5
const schemaPromises = new WeakMap()

class StoreMembershipError extends Error {
  constructor(message, status = 400, code = 'STORE_MEMBERSHIP_ERROR') {
    super(message)
    this.name = 'StoreMembershipError'
    this.status = status
    this.code = code
  }
}

function ensureSchema(prisma) {
  let pending = schemaPromises.get(prisma)
  if (pending) return pending
  pending = prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext('customer-store-membership-v642'))")
    await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "CustomerStoreExclusion" (
      "id" TEXT NOT NULL,
      "appUserId" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "customerId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CustomerStoreExclusion_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CustomerStoreExclusion_appUserId_fkey" FOREIGN KEY ("appUserId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CustomerStoreExclusion_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`)
    await tx.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "CustomerStoreExclusion_appUserId_organizationId_key" ON "CustomerStoreExclusion"("appUserId","organizationId")')
    await tx.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "CustomerStoreExclusion_organizationId_createdAt_idx" ON "CustomerStoreExclusion"("organizationId","createdAt")')
  }).catch(error => {
    schemaPromises.delete(prisma)
    throw error
  })
  schemaPromises.set(prisma, pending)
  return pending
}

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
  if (existing[0]) return { alreadyLinked: true, customerId: existing[0].customerId, count: await countRegisteredStores(tx, appUserId) }

  let count = await countRegisteredStores(tx, appUserId)
  if (canonicalOrganizationId && canonicalCustomerId && canonicalOrganizationId !== targetOrganizationId && count < MAX_STORES) {
    const excluded = await tx.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreExclusion" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', appUserId, canonicalOrganizationId)
    if (!excluded[0]) {
      const inserted = await tx.$queryRawUnsafe(`INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt")
        SELECT $1,$2,$3,$4,NOW()
        WHERE EXISTS (SELECT 1 FROM "Customer" WHERE "id"=$4 AND "organizationId"=$3 AND "deletedAt" IS NULL)
        ON CONFLICT DO NOTHING RETURNING "id"`, crypto.randomUUID(), appUserId, canonicalOrganizationId, canonicalCustomerId)
      if (inserted[0]) count += 1
    }
  }

  existing = await tx.$queryRawUnsafe(`SELECT l."customerId" FROM "CustomerStoreLink" l
    JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
    WHERE l."appUserId"=$1 AND l."organizationId"=$2 LIMIT 1`, appUserId, targetOrganizationId)
  if (existing[0]) return { alreadyLinked: true, customerId: existing[0].customerId, count }
  if (count >= MAX_STORES) {
    throw new StoreMembershipError(
      '登録できる美容室は最大5店舗です。新しい店舗を追加するには、登録済みの店舗を1件解除してください。',
      409,
      'STORE_LIMIT_REACHED',
    )
  }
  await tx.$executeRawUnsafe('DELETE FROM "CustomerStoreExclusion" WHERE "appUserId"=$1 AND "organizationId"=$2', appUserId, targetOrganizationId)
  return { alreadyLinked: false, count }
}

async function unlinkStore(prisma, session, rawOrganizationId) {
  await ensureSchema(prisma)
  const organizationId = String(rawOrganizationId || '').trim()
  if (!organizationId || organizationId.length > 191) throw new StoreMembershipError('解除する店舗を確認してください。')

  return prisma.$transaction(async tx => {
    const users = await tx.$queryRawUnsafe(`SELECT "id","organizationId","customerId","loginId","email"
      FROM "AppUser" WHERE "id"=$1 AND "role"='CUSTOMER' AND "active"=TRUE FOR UPDATE`, session.userId)
    const user = users[0]
    if (!user) throw new StoreMembershipError('ログイン情報を確認できませんでした。', 401, 'STORE_SESSION_INVALID')

    const links = await tx.$queryRawUnsafe(`SELECT l."organizationId",l."customerId",l."createdAt",
        (c."storeHiddenAt" IS NULL) AS "available"
      FROM "CustomerStoreLink" l
      JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
      WHERE l."appUserId"=$1 ORDER BY l."createdAt",l."organizationId"`, session.userId)
    const target = links.find(link => link.organizationId === organizationId)
    if (!target) throw new StoreMembershipError('登録済みの店舗が見つかりません。', 404, 'STORE_LINK_NOT_FOUND')
    if (links.length <= 1) throw new StoreMembershipError('少なくとも1店舗の登録が必要です。最後の店舗は解除できません。', 409, 'LAST_STORE_REQUIRED')

    const usable = links.filter(link => link.organizationId !== organizationId && link.available !== false)
    const replacement = usable.find(link => link.organizationId === session.organizationId) || usable[0]
    const removesCurrent = session.organizationId === organizationId
    const removesCanonical = user.organizationId === organizationId && user.customerId === target.customerId
    if ((removesCurrent || removesCanonical) && !replacement) {
      throw new StoreMembershipError('利用可能な別の店舗へ切り替えてから、この店舗の登録を解除してください。', 409, 'REPLACEMENT_STORE_REQUIRED')
    }

    await tx.$executeRawUnsafe(`INSERT INTO "CustomerStoreExclusion" ("id","appUserId","organizationId","customerId","createdAt")
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT ("appUserId","organizationId") DO UPDATE SET "customerId"=EXCLUDED."customerId","createdAt"=NOW()`,
    crypto.randomUUID(), session.userId, organizationId, target.customerId)
    await tx.$executeRawUnsafe('DELETE FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2', session.userId, organizationId)

    if (removesCanonical) {
      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "organizationId"=$2,"customerId"=$3,"updatedAt"=NOW() WHERE "id"=$1', session.userId, replacement.organizationId, replacement.customerId)
    }
    return {
      removedOrganizationId: organizationId,
      removedCustomerId: target.customerId,
      removesCurrent,
      replacement: removesCurrent ? replacement : null,
      subject: user.loginId || user.email,
      remainingCount: links.length - 1,
    }
  }, { isolationLevel: 'ReadCommitted' })
}

async function availableStores(prisma, session, resolveCustomerSession) {
  await ensureSchema(prisma)
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
      WHERE NOT EXISTS (SELECT 1 FROM "CustomerStoreExclusion" x WHERE x."appUserId"=$1 AND x."organizationId"=candidates."organizationId")
      ORDER BY candidates.priority,candidates."linkedAt" NULLS LAST,candidates."organizationId"`, session.userId)
    let count = await countRegisteredStores(tx, session.userId)
    for (const membership of memberships) {
      if (count >= MAX_STORES) break
      const inserted = await tx.$queryRawUnsafe(`INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt")
        VALUES ($1,$2,$3,$4,NOW()) ON CONFLICT DO NOTHING RETURNING "id"`,
      crypto.randomUUID(), session.userId, membership.organizationId, membership.customerId)
      if (inserted[0]) count += 1
    }
  }, { isolationLevel: 'ReadCommitted' })

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
  }

  const rows = await prisma.$queryRawUnsafe(`SELECT l."organizationId",l."customerId",o."name",o."publicCode",TRUE AS "linked",
      l."organizationId"=$2 AS "current",l."createdAt"
    FROM "CustomerStoreLink" l
    JOIN "Organization" o ON o."id"=l."organizationId"
    JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
    JOIN "AppUser" u ON u."id"=l."appUserId" AND u."role"='CUSTOMER' AND u."active"=TRUE
    WHERE l."appUserId"=$1
      AND NOT EXISTS (SELECT 1 FROM "CustomerStoreExclusion" x WHERE x."appUserId"=l."appUserId" AND x."organizationId"=l."organizationId")
    ORDER BY "current" DESC,l."createdAt",l."organizationId"`, session.userId, session.organizationId)
  for (const row of rows) {
    const selected = await resolveCustomerSession(prisma, { ...session, customerId: row.customerId, organizationId: row.organizationId })
    row.available = Boolean(selected)
  }
  return rows
}

module.exports = {
  MAX_STORES,
  StoreMembershipError,
  ensureSchema,
  prepareLink,
  unlinkStore,
  availableStores,
  countRegisteredStores,
}
