const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
;(async () => {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    const rows = await tx.$queryRawUnsafe(`SELECT u."customerPublicCode" AS member_code,o."publicCode" AS store_code,
      c."storeHiddenAt" IS NOT NULL AS hidden,c."deletedAt" IS NOT NULL AS deleted,
      h."sourceCustomerId" IS NOT NULL AS merged,
      t."id" IS NOT NULL AS target_exists,t."organizationId"=l."organizationId" AS target_same_store,
      t."storeHiddenAt" IS NOT NULL AS target_hidden,t."deletedAt" IS NOT NULL AS target_deleted,
      EXISTS(SELECT 1 FROM "CustomerStoreLink" z WHERE z."customerId"=t."id" AND z."appUserId"<>u."id") AS target_other_link,
      EXISTS(SELECT 1 FROM "AppUser" z WHERE z."customerId"=t."id" AND z."id"<>u."id" AND z."role"='CUSTOMER') AS target_other_account,
      EXISTS(SELECT 1 FROM "CustomerMergeHistory" z WHERE z."sourceCustomerId"=t."id") AS target_merged_again,
      EXISTS(SELECT 1 FROM "CustomerWithdrawalRequest" w WHERE w."customerId"=c."id" AND w."usedAt" IS NOT NULL) AS withdrawn,
      h."resultJson"->>'loginAccount' AS merge_account_action,
      c."storeHiddenAt" AS hidden_at,h."createdAt" AS merged_at,l."createdAt" AS linked_at
    FROM "CustomerStoreLink" l
    JOIN "AppUser" u ON u."id"=l."appUserId" AND u."role"='CUSTOMER' AND u."active"=TRUE
    JOIN "Organization" o ON o."id"=l."organizationId"
    JOIN "Customer" c ON c."id"=l."customerId" AND c."organizationId"=l."organizationId"
    LEFT JOIN "CustomerMergeHistory" h ON h."sourceCustomerId"=c."id" AND h."organizationId"=l."organizationId"
    LEFT JOIN "Customer" t ON t."id"=h."targetCustomerId"
    WHERE o."name" LIKE '%ハレルヤ%'
    ORDER BY u."customerPublicCode" LIMIT 100`)
    return { rows }
  })
  console.log('STORE_AUDIT_V598 ' + JSON.stringify(result))
})().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(() => db.$disconnect())
