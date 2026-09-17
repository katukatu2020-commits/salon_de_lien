'use strict'

const crypto = require('crypto')
const baseMembership = require('./customer-store-membership-v642.js')

async function unlinkStore(prisma, session, rawOrganizationId) {
  await baseMembership.ensureSchema(prisma)
  const organizationId = String(rawOrganizationId || '').trim()
  if (!organizationId || organizationId.length > 191) {
    throw new baseMembership.StoreMembershipError('解除する店舗を確認してください。')
  }

  return prisma.$transaction(async tx => {
    const users = await tx.$queryRawUnsafe(`SELECT "id","organizationId","customerId","loginId","email"
      FROM "AppUser" WHERE "id"=$1 AND "role"='CUSTOMER' AND "active"=TRUE FOR UPDATE`, session.userId)
    const user = users[0]
    if (!user) {
      throw new baseMembership.StoreMembershipError('ログイン情報を確認できませんでした。', 401, 'STORE_SESSION_INVALID')
    }

    const links = await tx.$queryRawUnsafe(`SELECT l."organizationId",l."customerId",l."createdAt",
        (c."storeHiddenAt" IS NULL) AS "available"
      FROM "CustomerStoreLink" l
      JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL
      WHERE l."appUserId"=$1 ORDER BY l."createdAt",l."organizationId"`, session.userId)
    const target = links.find(link => link.organizationId === organizationId)
    if (!target) {
      throw new baseMembership.StoreMembershipError('登録済みの店舗が見つかりません。', 404, 'STORE_LINK_NOT_FOUND')
    }

    const usable = links.filter(link => link.organizationId !== organizationId && link.available !== false)
    const replacement = usable.find(link => link.organizationId === session.organizationId) || usable[0] || null
    const removesCurrent = session.organizationId === organizationId
    const removesCanonical = user.organizationId === organizationId && user.customerId === target.customerId

    await tx.$executeRawUnsafe(`INSERT INTO "CustomerStoreExclusion" ("id","appUserId","organizationId","customerId","createdAt")
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT ("appUserId","organizationId") DO UPDATE SET "customerId"=EXCLUDED."customerId","createdAt"=NOW()`,
    crypto.randomUUID(), session.userId, organizationId, target.customerId)
    await tx.$executeRawUnsafe('DELETE FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2', session.userId, organizationId)

    if (removesCanonical && replacement) {
      await tx.$executeRawUnsafe('UPDATE "AppUser" SET "organizationId"=$2,"customerId"=$3,"updatedAt"=NOW() WHERE "id"=$1', session.userId, replacement.organizationId, replacement.customerId)
    }

    return {
      removedOrganizationId: organizationId,
      removedCustomerId: target.customerId,
      removesCurrent,
      replacement: removesCurrent ? replacement : null,
      subject: user.loginId || user.email,
      remainingCount: links.length - 1,
      storeSelectionRequired: usable.length === 0,
    }
  }, { isolationLevel: 'ReadCommitted' })
}

async function promoteLinkedStore(tx, { appUserId, organizationId, customerId }) {
  const users = await tx.$queryRawUnsafe(`SELECT "organizationId","customerId","loginId","email"
    FROM "AppUser" WHERE "id"=$1 AND "role"='CUSTOMER' AND "active"=TRUE FOR UPDATE`, appUserId)
  const user = users[0]
  if (!user) throw new baseMembership.StoreMembershipError('ログイン情報を確認できませんでした。', 401, 'STORE_SESSION_INVALID')

  const currentExcluded = user.organizationId
    ? await tx.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreExclusion" WHERE "appUserId"=$1 AND "organizationId"=$2 LIMIT 1', appUserId, user.organizationId)
    : []
  const shouldPromote = !user.organizationId || !user.customerId || Boolean(currentExcluded[0])
  if (shouldPromote) {
    await tx.$executeRawUnsafe('UPDATE "AppUser" SET "organizationId"=$2,"customerId"=$3,"updatedAt"=NOW() WHERE "id"=$1', appUserId, organizationId, customerId)
  }
  return { promoted: shouldPromote, subject: user.loginId || user.email }
}

async function sessionStoreIsExcluded(prisma, session) {
  if (!session?.userId || !session?.organizationId) return false
  await baseMembership.ensureSchema(prisma)
  const rows = await prisma.$queryRawUnsafe(`SELECT 1
    FROM "CustomerStoreExclusion" x
    JOIN "AppUser" u ON u."id"=x."appUserId" AND u."role"='CUSTOMER' AND u."active"=TRUE
    WHERE x."appUserId"=$1 AND x."organizationId"=$2 LIMIT 1`, session.userId, session.organizationId)
  return Boolean(rows[0])
}

module.exports = {
  ...baseMembership,
  unlinkStore,
  promoteLinkedStore,
  sessionStoreIsExcluded,
}
