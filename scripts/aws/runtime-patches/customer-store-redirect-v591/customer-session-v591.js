'use strict'

async function resolveCustomerSession(prisma, session) {
  if (!session || session.role !== 'CUSTOMER') return null
  if (['userId', 'customerId', 'organizationId', 'subject'].some(key => typeof session[key] !== 'string' || !session[key].trim())) return null

  // Resolve only within the signed store, then authorize the final customer again.
  // A merge record alone never grants access to another member's customer record.
  const [customer] = await prisma.$queryRawUnsafe(`WITH RECURSIVE "MergedCustomer"("customerId","path") AS (
    SELECT $3::text, ARRAY[$3::text]
    UNION ALL
    SELECT h."targetCustomerId", m."path" || h."targetCustomerId"
    FROM "MergedCustomer" m
    JOIN "CustomerMergeHistory" h ON h."sourceCustomerId"=m."customerId" AND h."organizationId"=$4
    WHERE cardinality(m."path") <= 16 AND NOT h."targetCustomerId"=ANY(m."path")
  )
  SELECT c."id", c."name"
  FROM "AppUser" u
  JOIN "MergedCustomer" m ON TRUE
  JOIN "Customer" c ON c."id"=m."customerId" AND c."organizationId"=$4
    AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL
  LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id"
    AND l."organizationId"=c."organizationId" AND l."customerId"=c."id"
  WHERE u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
    AND LOWER(BTRIM(COALESCE(NULLIF(BTRIM(u."loginId"),''),u."email")))=$2
    AND ((u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM "CustomerMergeHistory" h WHERE h."sourceCustomerId"=m."customerId" AND h."organizationId"=$4)
  LIMIT 1`, session.userId, session.subject.trim().toLowerCase(), session.customerId, session.organizationId)
  return customer ? { ...session, customerId: customer.id, customer } : null
}

module.exports = { resolveCustomerSession }
