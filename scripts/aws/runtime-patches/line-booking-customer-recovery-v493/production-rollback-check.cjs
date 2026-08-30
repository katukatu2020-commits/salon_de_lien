'use strict'

const crypto = require('crypto')

if (!process.env.DATABASE_URL) {
  const host = process.env.DB_HOST
  const port = process.env.DB_PORT || '5432'
  const database = process.env.DB_NAME || process.env.POSTGRES_DB
  const user = process.env.DB_USER || process.env.POSTGRES_USER
  const password = process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD
  if (![host, database, user, password].every(Boolean)) throw new Error('Database environment is incomplete')
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}?schema=public&sslmode=require`
}

const { PrismaClient } = require('@prisma/client')
const { createCustomerNameAutoMergeService } = require('/app/customer-name-auto-merge-v489.js')
const { resolveLineBookingCustomer } = require('/app/line-reservations-v436.js')

if (typeof resolveLineBookingCustomer !== 'function') throw new Error('Deployed recovery helper is missing')

const prisma = new PrismaClient()
const service = createCustomerNameAutoMergeService({ prisma, crypto })
const rollbackSentinel = new Error('ROLLBACK_VERIFICATION')

async function main() {
  const staleRows = await prisma.$queryRawUnsafe(`SELECT i."lineUserId",i."customerId",i."organizationId",c."name",c."phone"
    FROM "CustomerLineIdentity" i
    JOIN "Organization" o ON o."id"=i."organizationId"
    JOIN "Customer" c ON c."id"=i."customerId" AND c."organizationId"=i."organizationId"
    LEFT JOIN "CustomerMergeHistory" h ON h."sourceCustomerId"=c."id" AND h."organizationId"=c."organizationId"
    WHERE o."publicCode"=$1
      AND (c."storeHiddenAt" IS NOT NULL OR c."deletedAt" IS NOT NULL)
      AND h."sourceCustomerId" IS NULL
    ORDER BY i."updatedAt" DESC LIMIT 1`, 'LIEN-YOHAKU')
  const stale = staleRows[0]
  if (!stale) throw new Error('Stale LINE identity fixture was not found')

  let recovered = false
  let changedCustomer = false
  let rolledBack = false
  try {
    await prisma.$transaction(async tx => {
      const customer = await resolveLineBookingCustomer(service, tx, {
        organizationId: stale.organizationId,
        existingCustomerId: stale.customerId,
        name: stale.name,
        phone: stale.phone,
        overwriteName: true,
        overwritePhone: true,
        actorLabel: 'LINE booking recovery production verification',
        createData: { staffAssignmentType: 'free', memo: 'rollback-only verification' },
      })
      const activeRows = await tx.$queryRawUnsafe(
        'SELECT "id" FROM "Customer" WHERE "id"=$1 AND "deletedAt" IS NULL AND "storeHiddenAt" IS NULL',
        customer.id,
      )
      recovered = Boolean(activeRows[0])
      changedCustomer = customer.id !== stale.customerId
      if (!recovered || !changedCustomer) throw new Error('Recovery did not select an active replacement customer')
      throw rollbackSentinel
    }, { isolationLevel: 'Serializable', timeout: 30000 })
  } catch (error) {
    if (error !== rollbackSentinel) throw error
    rolledBack = true
  }

  const currentRows = await prisma.$queryRawUnsafe(
    'SELECT "customerId" FROM "CustomerLineIdentity" WHERE "organizationId"=$1 AND "lineUserId"=$2 LIMIT 1',
    stale.organizationId,
    stale.lineUserId,
  )
  console.log(JSON.stringify({
    identity: crypto.createHash('sha256').update(stale.lineUserId).digest('hex').slice(0, 10),
    recovered,
    changedCustomer,
    rolledBack,
    identityUnchanged: currentRows[0]?.customerId === stale.customerId,
  }))
}

main()
  .finally(() => prisma.$disconnect())
  .catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
