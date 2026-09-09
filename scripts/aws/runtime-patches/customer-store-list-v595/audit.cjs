const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
;(async () => {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    const links = await tx.$queryRawUnsafe(`SELECT
      CASE WHEN c."id" IS NULL THEN 'missing_customer'
        WHEN c."organizationId"<>l."organizationId" THEN 'wrong_store'
        WHEN c."deletedAt" IS NOT NULL THEN 'deleted'
        WHEN h."sourceCustomerId" IS NOT NULL THEN 'merged'
        WHEN c."storeHiddenAt" IS NOT NULL THEN 'store_hidden'
        ELSE 'visible' END AS state,COUNT(*)::int AS count
      FROM "CustomerStoreLink" l JOIN "AppUser" u ON u."id"=l."appUserId" AND u."active"=TRUE AND u."role"='CUSTOMER'
      LEFT JOIN "Customer" c ON c."id"=l."customerId"
      LEFT JOIN "CustomerMergeHistory" h ON h."sourceCustomerId"=c."id" AND h."organizationId"=l."organizationId"
      GROUP BY 1 ORDER BY 1`)
    const merged = await tx.$queryRawUnsafe(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE h."resultJson"->>'loginAccount'='none')::int AS without_canonical_account,
      COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "CustomerStoreLink" l WHERE l."customerId"=h."targetCustomerId"))::int AS target_without_link
      FROM "CustomerMergeHistory" h`)
    const hidden = await tx.$queryRawUnsafe(`SELECT u."customerPublicCode" AS code,o."publicCode" AS store,
      CASE WHEN h."sourceCustomerId" IS NOT NULL THEN 'merged' ELSE 'store_hidden' END AS reason
      FROM "CustomerStoreLink" l JOIN "AppUser" u ON u."id"=l."appUserId" AND u."active"=TRUE AND u."role"='CUSTOMER'
      JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NOT NULL
      JOIN "Organization" o ON o."id"=l."organizationId"
      LEFT JOIN "CustomerMergeHistory" h ON h."sourceCustomerId"=c."id" AND h."organizationId"=l."organizationId"
      ORDER BY u."customerPublicCode",o."publicCode" LIMIT 30`)
    return { links, merged, hidden }
  })
  console.log('STORE_AUDIT_V595 '+JSON.stringify(result))
})().catch(error => { console.error(error.message); process.exitCode=1 }).finally(() => db.$disconnect())
