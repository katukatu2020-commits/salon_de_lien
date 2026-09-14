import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const membership = require('/app/customer-store-membership-v642.js')

const adminUrl = new URL(process.env.TEST_DATABASE_URL)
const schema = `store_v642_${randomUUID().replaceAll('-', '')}`
const scopedUrl = new URL(adminUrl)
scopedUrl.searchParams.set('schema', schema)
const admin = new PrismaClient({ datasources: { db: { url: adminUrl.href } } })
const db = new PrismaClient({ datasources: { db: { url: scopedUrl.href } } })
const userId = 'customer-v642'
const organizations = Array.from({ length: 7 }, (_, index) => `org-${index + 1}`)
const customerFor = organizationId => `customer-${organizationId}`
const session = { role: 'CUSTOMER', userId, customerId: customerFor('org-1'), organizationId: 'org-1', subject: 'member@example.invalid' }

async function resolveSession(prisma, candidate) {
  const rows = await prisma.$queryRawUnsafe(`SELECT c."id"
    FROM "Customer" c
    JOIN "AppUser" u ON u."id"=$1 AND u."role"='CUSTOMER' AND u."active"=TRUE
    LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id" AND l."organizationId"=c."organizationId" AND l."customerId"=c."id"
    WHERE c."id"=$2 AND c."organizationId"=$3 AND c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL
      AND ((u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL)
    LIMIT 1`, candidate.userId, candidate.customerId, candidate.organizationId)
  return rows[0] ? { ...candidate, customer: rows[0] } : null
}

async function addStore(organizationId) {
  return db.$transaction(async tx => {
    const state = await membership.prepareLink(tx, {
      appUserId: userId,
      targetOrganizationId: organizationId,
      canonicalOrganizationId: 'org-1',
      canonicalCustomerId: customerFor('org-1'),
    })
    if (state.alreadyLinked) return state
    await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW())', randomUUID(), userId, organizationId, customerFor(organizationId))
    return { ...state, customerId: customerFor(organizationId) }
  }, { isolationLevel: 'ReadCommitted' })
}

try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  for (const sql of [
    'CREATE TABLE "Organization" ("id" text PRIMARY KEY,"name" text NOT NULL,"publicCode" text)',
    'CREATE TABLE "Customer" ("id" text PRIMARY KEY,"organizationId" text NOT NULL,"name" text NOT NULL,"deletedAt" timestamp,"storeHiddenAt" timestamp,"createdAt" timestamp DEFAULT NOW())',
    'CREATE TABLE "AppUser" ("id" text PRIMARY KEY,"organizationId" text,"customerId" text,"loginId" text,"email" text,"role" text,"active" boolean,"updatedAt" timestamp DEFAULT NOW())',
    'CREATE TABLE "CustomerStoreLink" ("id" text PRIMARY KEY,"appUserId" text NOT NULL,"organizationId" text NOT NULL,"customerId" text UNIQUE,"createdAt" timestamp DEFAULT NOW(),UNIQUE("appUserId","organizationId"))',
    'CREATE TABLE "CustomerRegistrationInvite" ("organizationId" text,"customerId" text,"email" text,"usedAt" timestamp)',
    'CREATE TABLE "CustomerMergeHistory" ("sourceCustomerId" text PRIMARY KEY,"targetCustomerId" text,"organizationId" text)',
  ]) await db.$executeRawUnsafe(sql)
  await membership.ensureSchema(db)
  await membership.ensureSchema(db)

  for (const [index, organizationId] of organizations.entries()) {
    await db.$executeRawUnsafe('INSERT INTO "Organization" ("id","name","publicCode") VALUES ($1,$2,$3)', organizationId, `Salon ${index + 1}`, `STORE-${index + 1}`)
    await db.$executeRawUnsafe('INSERT INTO "Customer" ("id","organizationId","name") VALUES ($1,$2,$3)', customerFor(organizationId), organizationId, `Customer ${index + 1}`)
  }
  await db.$executeRawUnsafe('INSERT INTO "AppUser" ("id","organizationId","customerId","loginId","email","role","active") VALUES ($1,$2,$3,$4,$5,\'CUSTOMER\',TRUE)', userId, 'org-1', customerFor('org-1'), 'member', session.subject)
  for (const organizationId of organizations.slice(0, 5)) {
    await db.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW())', randomUUID(), userId, organizationId, customerFor(organizationId))
  }
  await db.$executeRawUnsafe('INSERT INTO "CustomerRegistrationInvite" ("organizationId","customerId","email","usedAt") VALUES (\'org-3\',$1,$2,NOW()),(\'org-6\',$3,$2,NOW())', customerFor('org-3'), session.subject, customerFor('org-6'))

  let stores = await membership.availableStores(db, session, resolveSession)
  assert.equal(stores.length, membership.MAX_STORES)
  assert.equal(stores[0].organizationId, 'org-1')
  await assert.rejects(addStore('org-6'), error => error.status === 409 && error.code === 'STORE_LIMIT_REACHED')
  assert.equal(await membership.countRegisteredStores(db, userId), 5)

  const customerCount = Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Customer"'))[0].count)
  const removed = await membership.unlinkStore(db, session, 'org-3')
  assert.equal(removed.removesCurrent, false)
  assert.equal(removed.remainingCount, 4)
  assert.equal(await membership.countRegisteredStores(db, userId), 4)
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Customer"'))[0].count), customerCount, 'unlink must preserve salon customer data')
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "CustomerStoreExclusion" WHERE "appUserId"=$1 AND "organizationId"=\'org-3\'', userId))[0].count), 1)

  stores = await membership.availableStores(db, session, resolveSession)
  assert.equal(stores.some(store => store.organizationId === 'org-3'), false, 'used invitations must not restore an explicit unlink')
  assert.equal(stores.some(store => store.organizationId === 'org-6'), true, 'an eligible invitation may fill a free slot')
  assert.equal(stores.length, 5)
  await assert.rejects(addStore('org-7'), error => error.code === 'STORE_LIMIT_REACHED')

  await membership.unlinkStore(db, session, 'org-5')
  const concurrent = await Promise.allSettled([addStore('org-3'), addStore('org-7')])
  assert.equal(concurrent.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(concurrent.filter(result => result.status === 'rejected' && result.reason.code === 'STORE_LIMIT_REACHED').length, 1)
  assert.equal(await membership.countRegisteredStores(db, userId), 5, 'concurrent requests must not exceed the limit')

  if (!(await db.$queryRawUnsafe('SELECT 1 FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=\'org-3\'', userId))[0]) {
    await membership.unlinkStore(db, session, 'org-4')
    await addStore('org-3')
  }
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "CustomerStoreExclusion" WHERE "appUserId"=$1 AND "organizationId"=\'org-3\'', userId))[0].count), 0, 'explicit re-registration clears the exclusion')

  const currentRemoval = await membership.unlinkStore(db, session, 'org-1')
  assert.equal(currentRemoval.removesCurrent, true)
  assert.ok(currentRemoval.replacement)
  const canonical = (await db.$queryRawUnsafe('SELECT "organizationId","customerId" FROM "AppUser" WHERE "id"=$1', userId))[0]
  assert.equal(canonical.organizationId, currentRemoval.replacement.organizationId)
  assert.equal(canonical.customerId, currentRemoval.replacement.customerId)
  stores = await membership.availableStores(db, { ...session, organizationId: canonical.organizationId, customerId: canonical.customerId }, resolveSession)
  assert.equal(stores.some(store => store.organizationId === 'org-1'), false)

  const remaining = await db.$queryRawUnsafe('SELECT "organizationId" FROM "CustomerStoreLink" WHERE "appUserId"=$1 ORDER BY "organizationId"', userId)
  for (const row of remaining.slice(1)) await db.$executeRawUnsafe('DELETE FROM "CustomerStoreLink" WHERE "appUserId"=$1 AND "organizationId"=$2', userId, row.organizationId)
  const lastOrganization = remaining[0].organizationId
  await assert.rejects(
    membership.unlinkStore(db, { ...session, organizationId: lastOrganization, customerId: customerFor(lastOrganization) }, lastOrganization),
    error => error.status === 409 && error.code === 'LAST_STORE_REQUIRED',
  )
  assert.equal(await membership.countRegisteredStores(db, userId), 1)

  console.log(JSON.stringify({
    realPostgres: true,
    maxStores: membership.MAX_STORES,
    limitEnforced: true,
    concurrentLimitEnforced: true,
    unlinkPreservesCustomerData: true,
    removedInviteSuppressed: true,
    explicitRelinkSupported: true,
    currentStoreReplacement: true,
    lastStoreProtected: true,
  }))
} finally {
  await db.$disconnect()
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  await admin.$disconnect()
}
