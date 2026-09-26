import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const databaseUrl = process.env.TEST_DATABASE_URL
if (!databaseUrl) throw new Error('TEST_DATABASE_URL is required')
process.env.DATABASE_URL = databaseUrl

const require = createRequire(import.meta.url)
const { PrismaClient } = require(path.join(root, 'node_modules', '@prisma', 'client'))
const { createStoreProfileService } = require(path.join(root, 'store-profile.js'))
const { createCustomerLinkService } = require(path.join(root, 'customer-links-v293.js'))
const directory = require(path.join(root, 'orimia-store-directory-v670.js'))
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })

try {
  await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE')
  await prisma.$executeRawUnsafe('CREATE SCHEMA public')
  await prisma.$executeRawUnsafe(`CREATE TABLE "Organization" (
    "id" TEXT PRIMARY KEY,"slug" TEXT UNIQUE,"name" TEXT NOT NULL,"publicCode" TEXT,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  await prisma.$executeRawUnsafe(`CREATE TABLE "AppUser" (
    "id" TEXT PRIMARY KEY,"organizationId" TEXT,"customerId" TEXT,"email" TEXT,"loginId" TEXT,"displayName" TEXT,
    "role" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT TRUE,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`)
  await prisma.$executeRawUnsafe(`CREATE TABLE "CustomerStoreLink" (
    "id" TEXT PRIMARY KEY,"appUserId" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"customerId" TEXT NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE("appUserId","organizationId")
  )`)
  await prisma.$executeRawUnsafe(`CREATE TABLE "Customer" (
    "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"deletedAt" TIMESTAMPTZ,"storeHiddenAt" TIMESTAMPTZ
  )`)
  await prisma.$executeRawUnsafe(`CREATE TABLE "CustomerMergeHistory" (
    "sourceCustomerId" TEXT PRIMARY KEY,"targetCustomerId" TEXT,"organizationId" TEXT
  )`)

  for (const [id, slug, name] of [
    ['org-a', 'okayama-a', '岡山サロンA'],
    ['org-b', 'hokkaido-b', '北海道サロンB'],
    ['org-c', 'tokyo-c', '東京サロンC'],
    ['org-offline', 'offline', '停止中サロン'],
  ]) {
    await prisma.$executeRawUnsafe('INSERT INTO "Organization" ("id","slug","name","publicCode") VALUES ($1,$2,$3,$4)', id, slug, name, id.toUpperCase())
  }
  for (const [id, organizationId, role, active] of [
    ['staff-a', 'org-a', 'ADMIN', true],
    ['staff-b', 'org-b', 'ADMIN', true],
    ['staff-c', 'org-c', 'STAFF', true],
    ['staff-offline', 'org-offline', 'ADMIN', false],
    ['customer-1', 'org-a', 'CUSTOMER', true],
  ]) {
    await prisma.$executeRawUnsafe('INSERT INTO "AppUser" ("id","organizationId","email","loginId","role","active") VALUES ($1,$2,$3,$3,$4,$5)', id, organizationId, `${id}@example.test`, role, active)
  }
  await prisma.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ($1,$2,$3,$4)', 'link-a', 'customer-1', 'org-a', 'customer-record-a')
  await prisma.$executeRawUnsafe('INSERT INTO "Customer" ("id","organizationId","name") VALUES ($1,$2,$3),($4,$5,$6)', 'customer-record-a', 'org-a', '検証 花子', 'customer-record-c', 'org-c', '検証 花子')
  await prisma.$executeRawUnsafe('UPDATE "AppUser" SET "customerId"=$2 WHERE "id"=$1', 'customer-1', 'customer-record-a')
  await prisma.$executeRawUnsafe('INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ($1,$2,$3,$4)', 'link-c', 'customer-1', 'org-c', 'customer-record-c')

  const storeProfile = createStoreProfileService({ prisma, crypto: await import('node:crypto') })
  await storeProfile.ensureSchema()
  await prisma.$executeRawUnsafe('INSERT INTO "OrganizationStoreProfile" ("organizationId","prefecture","city","orimiaPublished") VALUES ($1,$2,$3,$4)', 'org-a', '岡山県', '岡山市', true)
  await prisma.$executeRawUnsafe('INSERT INTO "OrganizationStoreProfile" ("organizationId","prefecture","city","orimiaPublished") VALUES ($1,$2,$3,$4)', 'org-c', '東京都', '渋谷区', true)
  await storeProfile.updatePublication({ role: 'ADMIN', organizationId: 'org-b' }, { published: false })
  await prisma.$executeRawUnsafe('UPDATE "OrganizationStoreProfile" SET "prefecture"=$2,"city"=$3 WHERE "organizationId"=$1', 'org-b', '北海道', '札幌市')

  const session = { userId: 'customer-1', organizationId: 'org-a' }
  let stores = await directory.availableStores(prisma, session)
  assert.deepEqual(stores.map(store => store.organizationId), ['org-c', 'org-a'])
  assert.equal(stores.find(store => store.organizationId === 'org-a').current, true)
  assert.equal(stores.find(store => store.organizationId === 'org-a').linked, true)
  assert.deepEqual(directory.groupStores(stores).map(group => group.prefecture), ['東京都', '岡山県'])
  assert.equal(await directory.storeIsPublished(prisma, 'org-b'), false)
  assert.equal(await directory.storeIsPublished(prisma, 'org-offline'), false)

  await storeProfile.updatePublication({ role: 'ADMIN', organizationId: 'org-b' }, { published: true })
  stores = await directory.availableStores(prisma, session)
  assert.deepEqual(stores.map(store => store.organizationId), ['org-b', 'org-c', 'org-a'])
  assert.deepEqual(directory.groupStores(stores).map(group => group.prefecture), ['北海道', '東京都', '岡山県'])
  assert.equal(await directory.storeIsPublished(prisma, 'org-b'), true)

  const body = directory.renderDirectory(stores)
  assert.match(body, /サロンを探す/)
  assert.match(body, /北海道/)
  assert.match(body, /この店舗を見る/)
  assert.doesNotMatch(body, /登録を解除|新しい店舗を登録|QRを読み取る/)

  const publication = await prisma.$queryRawUnsafe('SELECT "orimiaPublished" FROM "OrganizationStoreProfile" WHERE "organizationId"=$1', 'org-b')
  assert.equal(publication[0].orimiaPublished, true)

  process.env.CUSTOMER_AUTH_SECRET = 'orimia-store-directory-v670-integration-secret'
  const customerSession = {
    role: 'CUSTOMER',
    userId: 'customer-1',
    customerId: 'customer-record-a',
    organizationId: 'org-a',
    subject: 'customer-1@example.test',
  }
  const links = createCustomerLinkService({
    prisma,
    staffSessionProvider: async () => null,
    customerSessionProvider: async () => customerSession,
    renderCustomerShell: ({ body: pageBody }) => `<!doctype html><body>${pageBody}</body>`,
  })

  function response() {
    return {
      statusCode: 200,
      headers: new Map(),
      body: '',
      headersSent: false,
      setHeader(name, value) { this.headers.set(String(name).toLowerCase(), value) },
      getHeader(name) { return this.headers.get(String(name).toLowerCase()) },
      end(value = '') { this.body += String(value); this.headersSent = true },
    }
  }

  const getRequest = Readable.from([])
  getRequest.method = 'GET'
  getRequest.headers = { host: '127.0.0.1' }
  const getResponse = response()
  assert.equal(await links.handle(getRequest, getResponse, new URL('http://127.0.0.1/api/lien-customer-stores')), true)
  assert.equal(getResponse.statusCode, 200)
  const directoryPayload = JSON.parse(getResponse.body)
  assert.equal(directoryPayload.registrationRequired, false)
  assert.equal(directoryPayload.storeCount, 3)

  const postRequest = Readable.from([JSON.stringify({ action: 'switch', organizationId: 'org-c' })])
  postRequest.method = 'POST'
  postRequest.headers = { host: '127.0.0.1', origin: 'http://127.0.0.1' }
  const postResponse = response()
  assert.equal(await links.handle(postRequest, postResponse, new URL('http://127.0.0.1/api/lien-customer-stores')), true)
  assert.equal(postResponse.statusCode, 200)
  assert.equal(JSON.parse(postResponse.body).redirect, '/u/home')
  assert.match(String(postResponse.getHeader('set-cookie') || ''), /lien_customer_session=/)

  await storeProfile.updatePublication({ role: 'ADMIN', organizationId: 'org-b' }, { published: false })
  const hiddenRequest = Readable.from([JSON.stringify({ action: 'switch', organizationId: 'org-b' })])
  hiddenRequest.method = 'POST'
  hiddenRequest.headers = { host: '127.0.0.1', origin: 'http://127.0.0.1' }
  const hiddenResponse = response()
  await links.handle(hiddenRequest, hiddenResponse, new URL('http://127.0.0.1/api/lien-customer-stores'))
  assert.equal(hiddenResponse.statusCode, 404)

  console.log(JSON.stringify({ release: 'orimia-store-directory-v670', integrationVerified: true, publicStores: stores.length, prefectureGroups: 3, switchApiVerified: true, hiddenStoreRejected: true }))
} finally {
  await prisma.$disconnect()
}
