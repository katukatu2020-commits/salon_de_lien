import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const membership = require('/app/customer-store-unlink-v654.js')

const adminUrl = new URL(process.env.TEST_DATABASE_URL)
const schema = `store_unlink_v654_${randomUUID().replaceAll('-', '')}`
const scopedUrl = new URL(adminUrl)
scopedUrl.searchParams.set('schema', schema)
const admin = new PrismaClient({ datasources: { db: { url: adminUrl.href } } })
const db = new PrismaClient({ datasources: { db: { url: scopedUrl.href } } })
const userId = 'customer-v654'
const organizations = Array.from({ length: 7 }, (_, index) => `org-${index + 1}`)
const customerFor = organizationId => `customer-${organizationId}`

async function account() {
  return (await db.$queryRawUnsafe('SELECT "organizationId","customerId" FROM "AppUser" WHERE "id"=$1', userId))[0]
}

async function addStore(organizationId) {
  return db.$transaction(async tx => {
    const canonical = await account()
    const state = await membership.prepareLink(tx, {
      appUserId: userId,
      targetOrganizationId: organizationId,
      canonicalOrganizationId: canonical.organizationId,
      canonicalCustomerId: canonical.customerId,
    })
    if (state.alreadyLinked) return state
    await tx.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW())', randomUUID(), userId, organizationId, customerFor(organizationId))
    const primary = await membership.promoteLinkedStore(tx, {
      appUserId: userId,
      organizationId,
      customerId: customerFor(organizationId),
    })
    return { ...state, ...primary, customerId: customerFor(organizationId) }
  }, { isolationLevel: 'ReadCommitted' })
}

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

  for (const [index, organizationId] of organizations.entries()) {
    await db.$executeRawUnsafe('INSERT INTO "Organization" ("id","name","publicCode") VALUES ($1,$2,$3)', organizationId, `Salon ${index + 1}`, `STORE-${index + 1}`)
    await db.$executeRawUnsafe('INSERT INTO "Customer" ("id","organizationId","name") VALUES ($1,$2,$3)', customerFor(organizationId), organizationId, `Customer ${index + 1}`)
  }
  await db.$executeRawUnsafe('INSERT INTO "AppUser" ("id","organizationId","customerId","loginId","email","role","active") VALUES ($1,$2,$3,$4,$5,\'CUSTOMER\',TRUE)', userId, 'org-1', customerFor('org-1'), 'member-v654', 'member-v654@example.invalid')
  await db.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW())', randomUUID(), userId, 'org-1', customerFor('org-1'))

  const firstSession = { role: 'CUSTOMER', userId, customerId: customerFor('org-1'), organizationId: 'org-1', subject: 'member-v654' }
  const customerCount = Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Customer"'))[0].count)
  const lastRemoved = await membership.unlinkStore(db, firstSession, 'org-1')
  assert.equal(lastRemoved.remainingCount, 0)
  assert.equal(lastRemoved.storeSelectionRequired, true)
  assert.equal(lastRemoved.replacement, null)
  assert.equal(await membership.countRegisteredStores(db, userId), 0)
  assert.equal(await membership.sessionStoreIsExcluded(db, firstSession), true)
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "Customer"'))[0].count), customerCount, 'unlink must preserve salon customer data')

  let stores = await membership.availableStores(db, firstSession, resolveSession)
  assert.deepEqual(stores, [], 'an explicitly removed canonical store must not be restored automatically')

  const linkedSecond = await addStore('org-2')
  assert.equal(linkedSecond.promoted, true)
  assert.deepEqual(await account(), { organizationId: 'org-2', customerId: customerFor('org-2') })
  const secondSession = { ...firstSession, organizationId: 'org-2', customerId: customerFor('org-2') }
  assert.equal(await membership.sessionStoreIsExcluded(db, secondSession), false)
  stores = await membership.availableStores(db, secondSession, resolveSession)
  assert.deepEqual(stores.map(store => store.organizationId), ['org-2'])

  const secondRemoved = await membership.unlinkStore(db, secondSession, 'org-2')
  assert.equal(secondRemoved.storeSelectionRequired, true)
  const sameStoreRelink = await addStore('org-2')
  assert.equal(sameStoreRelink.promoted, false, 'relinking the canonical store can reuse the existing signed store identity')
  assert.equal(await membership.sessionStoreIsExcluded(db, secondSession), false, 'explicit relink clears the exclusion')

  for (const organizationId of ['org-3', 'org-4', 'org-5', 'org-6']) await addStore(organizationId)
  assert.equal(await membership.countRegisteredStores(db, userId), membership.MAX_STORES)
  await assert.rejects(addStore('org-7'), error => error.code === 'STORE_LIMIT_REACHED')

  const currentRemoved = await membership.unlinkStore(db, secondSession, 'org-2')
  assert.equal(currentRemoved.removesCurrent, true)
  assert.ok(currentRemoved.replacement)
  assert.equal(currentRemoved.storeSelectionRequired, false)
  const canonicalAfterSwitch = await account()
  assert.equal(canonicalAfterSwitch.organizationId, currentRemoved.replacement.organizationId)
  assert.equal(canonicalAfterSwitch.customerId, currentRemoved.replacement.customerId)

  console.log(JSON.stringify({
    realPostgres: true,
    lastStoreUnlink: true,
    customerHistoryPreserved: true,
    removedStoreNotRestored: true,
    firstRelinkPromoted: true,
    sameStoreRelinkSupported: true,
    maxFiveStillEnforced: true,
    currentStoreReplacement: true,
  }))
} finally {
  await db.$disconnect()
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  await admin.$disconnect()
}
