import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const membership = require('/app/customer-store-frequency-v668.js')

const adminUrl = new URL(process.env.TEST_DATABASE_URL)
const schema = `store_frequency_v668_${randomUUID().replaceAll('-', '')}`
const scopedUrl = new URL(adminUrl)
scopedUrl.searchParams.set('schema', schema)
const admin = new PrismaClient({ datasources: { db: { url: adminUrl.href } } })
const db = new PrismaClient({ datasources: { db: { url: scopedUrl.href } } })
const userId = 'customer-v668'
const organizations = Array.from({ length: 9 }, (_, index) => `org-${index + 1}`)
const customerFor = organizationId => `customer-${organizationId}`
const session = { role: 'CUSTOMER', userId, customerId: customerFor('org-1'), organizationId: 'org-1', subject: 'member-v668' }

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

async function addVisits(organizationId, count) {
  for (let index = 0; index < count; index += 1) {
    await db.$executeRawUnsafe('INSERT INTO "Visit" ("id","customerId","visitedAt") VALUES ($1,$2,NOW()-($3::text||\' days\')::interval)', randomUUID(), customerFor(organizationId), String(index))
  }
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
    'CREATE TABLE "Visit" ("id" text PRIMARY KEY,"customerId" text NOT NULL,"visitedAt" timestamp NOT NULL)',
  ]) await db.$executeRawUnsafe(sql)
  await membership.ensureSchema(db)

  for (const [index, organizationId] of organizations.entries()) {
    await db.$executeRawUnsafe('INSERT INTO "Organization" ("id","name","publicCode") VALUES ($1,$2,$3)', organizationId, `Salon ${index + 1}`, `STORE-${index + 1}`)
    await db.$executeRawUnsafe('INSERT INTO "Customer" ("id","organizationId","name") VALUES ($1,$2,$3)', customerFor(organizationId), organizationId, `Customer ${index + 1}`)
  }
  await db.$executeRawUnsafe('INSERT INTO "AppUser" ("id","organizationId","customerId","loginId","email","role","active") VALUES ($1,$2,$3,$4,$5,\'CUSTOMER\',TRUE)', userId, 'org-1', customerFor('org-1'), 'member-v668', 'member-v668@example.invalid')
  for (const organizationId of organizations.slice(0, 5)) {
    await db.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId","createdAt") VALUES ($1,$2,$3,$4,NOW())', randomUUID(), userId, organizationId, customerFor(organizationId))
  }
  for (const organizationId of ['org-6', 'org-7', 'org-8']) {
    await db.$executeRawUnsafe('INSERT INTO "CustomerRegistrationInvite" ("organizationId","customerId","email","usedAt") VALUES ($1,$2,$3,NOW())', organizationId, customerFor(organizationId), 'member-v668@example.invalid')
  }
  await db.$executeRawUnsafe('INSERT INTO "CustomerStoreExclusion" ("id","appUserId","organizationId","customerId") VALUES ($1,$2,$3,$4)', randomUUID(), userId, 'org-8', customerFor('org-8'))

  await addVisits('org-1', 2)
  await addVisits('org-2', 4)
  await addVisits('org-3', 4)
  await addVisits('org-6', 7)

  let stores = await membership.availableStores(db, session, resolveSession)
  assert.equal(stores.length, 7, 'all eligible stores must be restored beyond the old five-store cap')
  assert.deepEqual(stores.map(store => store.organizationId), ['org-6', 'org-2', 'org-3', 'org-1', 'org-4', 'org-5', 'org-7'])
  assert.deepEqual(stores.map(store => store.visitCount), [7, 4, 4, 2, 0, 0, 0])
  assert.equal(stores[0].current, false, 'current store must not override visit-frequency ordering')
  assert.equal(stores.some(store => store.organizationId === 'org-8'), false, 'explicitly removed stores must remain excluded')

  const additions = await Promise.all([addStore('org-8'), addStore('org-9')])
  assert.equal(additions.every(result => result.alreadyLinked === false), true)
  assert.equal(await membership.countRegisteredStores(db, userId), 9, 'manual registration must remain unlimited')
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "CustomerStoreExclusion" WHERE "appUserId"=$1', userId))[0].count), 0, 'manual re-registration must clear the exclusion')

  stores = await membership.availableStores(db, session, resolveSession)
  assert.equal(stores.length, 9)
  assert.equal(stores[0].organizationId, 'org-6')
  assert.equal(stores[0].visitCount, 7)

  await membership.unlinkStore(db, session, 'org-3')
  stores = await membership.availableStores(db, session, resolveSession)
  assert.equal(stores.some(store => store.organizationId === 'org-3'), false)
  assert.equal(stores.length, 8)

  console.log(JSON.stringify({
    release: 'customer-store-frequency-v668',
    realPostgres: true,
    allEligibleStoresRestored: true,
    unlimitedConcurrentRegistration: true,
    visitFrequencyOrdering: true,
    currentStoreNotPromotedInOrdering: true,
    explicitUnlinkPreserved: true,
  }))
} finally {
  await db.$disconnect()
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`)
  await admin.$disconnect()
}
