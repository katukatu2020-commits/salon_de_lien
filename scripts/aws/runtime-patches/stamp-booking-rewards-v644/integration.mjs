import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const { createCustomerBookingCouponService } = require('/app/stamp-booking-rewards-v644')

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL required')
const schema = `stamp_booking_rewards_${crypto.randomBytes(6).toString('hex')}`
const bootstrapUrl = new URL(process.env.TEST_DATABASE_URL)
bootstrapUrl.searchParams.set('connection_limit', '6')
const bootstrap = new PrismaClient({ datasources: { db: { url: bootstrapUrl.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
const testUrl = new URL(bootstrapUrl)
testUrl.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources: { db: { url: testUrl.href } } })
let currentSession = { organizationId: 'org-a', customerId: 'customer-a' }

function request(method, body = null) {
  const raw = body === null ? '' : JSON.stringify(body)
  return {
    method,
    headers: { host: 'salon-de-lien.com', origin: 'https://salon-de-lien.com' },
    async *[Symbol.asyncIterator]() { if (raw) yield Buffer.from(raw) },
  }
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name] = value },
    end(value = '') { this.body = String(value) },
  }
}

async function api(service, method, path, body = null) {
  const res = response()
  await service.handle(request(method, body), res, new URL(`https://salon-de-lien.com${path}`))
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null }
}

async function addVisits(customerId, start, count) {
  for (let index = 0; index < count; index += 1) {
    await db.$executeRawUnsafe(
      'INSERT INTO "Visit" ("id","customerId","visitedAt") VALUES ($1,$2,CURRENT_TIMESTAMP-$3::int*INTERVAL \'1 day\')',
      `visit-${customerId}-${start + index}`,
      customerId,
      start + index,
    )
  }
}

try {
  for (const sql of [
    'CREATE TABLE "Organization" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL)',
    'CREATE TABLE "Customer" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),"name" TEXT NOT NULL,"deletedAt" TIMESTAMPTZ)',
    'CREATE TABLE "Visit" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,"visitedAt" TIMESTAMPTZ NOT NULL)',
    'CREATE TABLE "SalonMenu" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"category" TEXT NOT NULL,"durationMinutes" INTEGER NOT NULL,"priceYen" INTEGER NOT NULL,"active" BOOLEAN NOT NULL DEFAULT TRUE,"sortOrder" INTEGER NOT NULL DEFAULT 0)',
    'CREATE TABLE "CouponIssue" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,"couponCode" TEXT NOT NULL UNIQUE,"customerName" TEXT NOT NULL,"discountRate" INTEGER NOT NULL,"targetMenusJson" JSONB NOT NULL,"issuedAt" TIMESTAMPTZ NOT NULL,"expiresAt" TIMESTAMPTZ NOT NULL,"salonMessage" TEXT,"templateVersion" TEXT NOT NULL DEFAULT \'coupon-v2\',"status" TEXT NOT NULL DEFAULT \'issued\',"createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE "Appointment" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,"scheduledAt" TIMESTAMPTZ NOT NULL,"menu" TEXT,"staffName" TEXT,"status" TEXT NOT NULL,"note" TEXT,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE "ServiceSale" ("id" TEXT PRIMARY KEY,"appointmentId" TEXT,"paidAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE "StaffBookingSetting" ("organizationId" TEXT,"staffKey" TEXT,"staffName" TEXT)',
    'CREATE TABLE "Product" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"category" TEXT,"imageUrl" TEXT,"active" BOOLEAN NOT NULL DEFAULT TRUE)',
    `INSERT INTO "Organization" VALUES ('org-a','Salon A'),('org-b','Salon B')`,
    `INSERT INTO "Customer" VALUES ('customer-a','org-a','山田 花子',NULL),('customer-b','org-b','佐藤 太郎',NULL)`,
    `INSERT INTO "SalonMenu" VALUES ('menu-cut','org-a','似合わせカット','カット',60,12000,TRUE,1)`,
  ]) await db.$executeRawUnsafe(sql)

  const service = createCustomerBookingCouponService({ prisma: db, sessionProvider: async () => currentSession })
  await service.ensureSchema()
  await db.$executeRawUnsafe(
    `INSERT INTO "OrganizationStampProgram"
      ("organizationId","requiredVisits","rewardType","rewardMenuId","discountValue","rewardTitle","updatedAt")
     VALUES ('org-a',10,'MENU_FREE','menu-cut',NULL,'似合わせカット 無料',CURRENT_TIMESTAMP)
     ON CONFLICT ("organizationId") DO UPDATE SET
       "requiredVisits"=10,"rewardType"='MENU_FREE',"rewardMenuId"='menu-cut',
       "discountValue"=NULL,"rewardTitle"='似合わせカット 無料',"updatedAt"=CURRENT_TIMESTAMP`,
  )
  await addVisits('customer-a', 1, 10)

  const synchronized = await Promise.all([
    service.synchronizeStampRewards(currentSession),
    service.synchronizeStampRewards(currentSession),
    service.synchronizeStampRewards(currentSession),
  ])
  assert.equal(synchronized.some(result => result.createdCount === 1), true)
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "CustomerStampRewardGrantV644"'))[0].count), 1)
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "CouponIssue"'))[0].count), 1)

  const firstAvailability = await service.stampRewards(currentSession)
  assert.equal(firstAvailability.availableCount, 1)
  assert.match(firstAvailability.bookingHref, /^\/u\/appointments\?coupon=stamp_coupon_/)
  const firstCouponId = firstAvailability.couponIssueId

  const context = await api(service, 'GET', `/api/lien-customer-booking-context?coupon=${encodeURIComponent(firstCouponId)}`)
  assert.equal(context.status, 200)
  assert.equal(context.body.coupon.id, firstCouponId)
  assert.equal(context.body.coupon.discountRate, 100)
  assert.equal(context.body.coupon.benefitKind, 'STAMP_MENU_FREE')
  assert.equal(context.body.coupon.displayName, '似合わせカット 無料')
  assert.equal(context.body.coupon.noExpiry, true)
  assert.deepEqual(context.body.coupon.targetMenus, ['似合わせカット'])
  assert.equal(12000 - Math.floor(12000 * context.body.coupon.discountRate / 100), 0)

  await addVisits('customer-a', 11, 1)
  await service.synchronizeStampRewards(currentSession)
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "CustomerStampRewardGrantV644"'))[0].count), 1)

  await db.$executeRawUnsafe(
    `INSERT INTO "Appointment" ("id","customerId","scheduledAt","menu","staffName","status","note")
     VALUES ('appointment-first','customer-a',CURRENT_TIMESTAMP+INTERVAL '2 days','似合わせカット','担当 A','予約確定','')`,
  )
  const firstLink = await api(service, 'POST', '/api/lien-customer-booking-coupon', {
    appointmentId: 'appointment-first', couponIssueId: firstCouponId,
  })
  assert.equal(firstLink.status, 200)
  const linkedFirst = await db.$queryRawUnsafe('SELECT "couponIssueId","note" FROM "Appointment" WHERE "id"=\'appointment-first\'')
  assert.equal(linkedFirst[0].couponIssueId, firstCouponId)
  assert.match(linkedFirst[0].note, /100%OFF/)

  await db.$executeRawUnsafe('UPDATE "Appointment" SET "status"=\'キャンセル\' WHERE "id"=\'appointment-first\'')
  assert.equal((await db.$queryRawUnsafe('SELECT "couponIssueId" FROM "Appointment" WHERE "id"=\'appointment-first\''))[0].couponIssueId, null)
  assert.equal((await service.stampRewards(currentSession)).availableCount, 1)

  await db.$executeRawUnsafe(
    `INSERT INTO "Appointment" ("id","customerId","scheduledAt","menu","staffName","status","note")
     VALUES ('appointment-rebook','customer-a',CURRENT_TIMESTAMP+INTERVAL '3 days','似合わせカット','担当 A','予約確定','')`,
  )
  assert.equal((await api(service, 'POST', '/api/lien-customer-booking-coupon', {
    appointmentId: 'appointment-rebook', couponIssueId: firstCouponId,
  })).status, 200)
  await db.$executeRawUnsafe('UPDATE "CouponIssue" SET "status"=\'used\',"updatedAt"=CURRENT_TIMESTAMP WHERE "id"=$1', firstCouponId)
  assert.equal((await service.stampRewards(currentSession)).availableCount, 0)

  await addVisits('customer-a', 12, 9)
  const secondAvailability = await service.stampRewards(currentSession)
  assert.equal(secondAvailability.availableCount, 1)
  assert.notEqual(secondAvailability.couponIssueId, firstCouponId)
  const secondCouponId = secondAvailability.couponIssueId

  await db.$executeRawUnsafe(
    `INSERT INTO "Appointment" ("id","customerId","scheduledAt","menu","staffName","status","note") VALUES
      ('appointment-combo','customer-a',CURRENT_TIMESTAMP+INTERVAL '4 days','似合わせカット + カラー','担当 A','予約確定',''),
      ('appointment-second','customer-a',CURRENT_TIMESTAMP+INTERVAL '5 days','似合わせカット','担当 A','予約確定','')`,
  )
  const mismatch = await api(service, 'POST', '/api/lien-customer-booking-coupon', {
    appointmentId: 'appointment-combo', couponIssueId: secondCouponId,
  })
  assert.equal(mismatch.status, 409)
  assert.match(mismatch.body.error, /選択したメニューでは利用できません/)
  assert.equal((await api(service, 'POST', '/api/lien-customer-booking-coupon', {
    appointmentId: 'appointment-second', couponIssueId: secondCouponId,
  })).status, 200)

  currentSession = { organizationId: 'org-b', customerId: 'customer-b' }
  const foreignContext = await api(service, 'GET', '/api/lien-customer-booking-context')
  assert.equal(foreignContext.status, 200)
  assert.equal(foreignContext.body.coupons.length, 0)

  console.log(JSON.stringify({
    passed: true,
    concurrentIssuanceIsIdempotent: true,
    freeMenuDiscountRate: 100,
    displayedAndCalculatedTotal: 0,
    exactMenuScope: true,
    cancellationReturnsReward: true,
    usedRewardIsConsumed: true,
    nextCompletedCardIssuesNextReward: true,
    tenantScope: true,
  }))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
