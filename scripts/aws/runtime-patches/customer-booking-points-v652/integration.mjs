import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

if (!process.env.TEST_DATABASE_URL) {
  console.log(JSON.stringify({ skipped: true, reason: 'TEST_DATABASE_URL is not set' }))
  process.exit(0)
}

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const { createCustomerBookingCouponService } = require('/app/customer-booking-points-v652')
const schema = `customer_booking_points_${crypto.randomBytes(6).toString('hex')}`
const bootstrapUrl = new URL(process.env.TEST_DATABASE_URL)
bootstrapUrl.searchParams.set('connection_limit', '6')
const bootstrap = new PrismaClient({ datasources: { db: { url: bootstrapUrl.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
const testUrl = new URL(bootstrapUrl)
testUrl.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources: { db: { url: testUrl.href } } })
const customerSession = { organizationId: 'org-a', customerId: 'customer-a' }

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

async function api(service, method, pathname, body = null, adminProvider = async () => ({ organizationId: 'org-a' })) {
  const res = response()
  await service.handle(request(method, body), res, new URL(`https://salon-de-lien.com${pathname}`), adminProvider)
  return { status: res.statusCode, body: res.body ? JSON.parse(res.body) : null }
}

try {
  for (const sql of [
    `CREATE TABLE "Organization" (
      "id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,
      "pointMinimumRedeem" INTEGER NOT NULL DEFAULT 1,
      "pointMaxRedemptionPercent" INTEGER NOT NULL DEFAULT 50
    )`,
    `CREATE TABLE "Customer" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL REFERENCES "Organization"("id"),
      "name" TEXT NOT NULL,"deletedAt" TIMESTAMPTZ
    )`,
    `CREATE TABLE "CouponIssue" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
      "couponCode" TEXT NOT NULL UNIQUE,"customerName" TEXT NOT NULL,"discountRate" INTEGER NOT NULL,
      "targetMenusJson" JSONB NOT NULL,"issuedAt" TIMESTAMPTZ NOT NULL,"expiresAt" TIMESTAMPTZ NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'issued',"createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE "Appointment" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
      "scheduledAt" TIMESTAMPTZ NOT NULL,"menu" TEXT,"staffName" TEXT,"estimatedPrice" INTEGER,
      "status" TEXT NOT NULL,"source" TEXT,"bookingProvider" TEXT,"note" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE "ServiceSale" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT,"appointmentId" TEXT REFERENCES "Appointment"("id") ON DELETE SET NULL,
      "title" TEXT,"amount" INTEGER,"paidAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE "StaffBookingSetting" ("organizationId" TEXT,"staffKey" TEXT,"staffName" TEXT)`,
    `CREATE TABLE "Product" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT,"category" TEXT,"imageUrl" TEXT,"active" BOOLEAN NOT NULL DEFAULT TRUE
    )`,
    `CREATE TABLE "CustomerPointAccount" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL UNIQUE REFERENCES "Customer"("id") ON DELETE CASCADE,
      "availablePoints" INTEGER NOT NULL DEFAULT 0,"pendingPoints" INTEGER NOT NULL DEFAULT 0,
      "lifetimeEarned" INTEGER NOT NULL DEFAULT 0,"lifetimeRedeemed" INTEGER NOT NULL DEFAULT 0,
      "lifetimeExpired" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE "PointTransaction" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
      "accountId" TEXT NOT NULL REFERENCES "CustomerPointAccount"("id") ON DELETE CASCADE,
      "type" TEXT NOT NULL,"amount" INTEGER NOT NULL,"balanceAfter" INTEGER NOT NULL,
      "sourceType" TEXT NOT NULL,"sourceId" TEXT,"reason" TEXT NOT NULL,"note" TEXT,
      "expiresAt" TIMESTAMPTZ,"createdByStaffId" TEXT,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE ("sourceType","sourceId","type")
    )`,
    `CREATE TABLE "PointLot" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL REFERENCES "Customer"("id") ON DELETE CASCADE,
      "earnTransactionId" TEXT NOT NULL REFERENCES "PointTransaction"("id") ON DELETE CASCADE,
      "originalAmount" INTEGER NOT NULL,"remainingAmount" INTEGER NOT NULL,"expiresAt" TIMESTAMPTZ NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE "PointRedemptionAllocation" (
      "id" TEXT PRIMARY KEY,"redeemTransactionId" TEXT NOT NULL REFERENCES "PointTransaction"("id") ON DELETE CASCADE,
      "pointLotId" TEXT NOT NULL REFERENCES "PointLot"("id") ON DELETE CASCADE,"amount" INTEGER NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE "CustomerStampRewardGrantV644" (
      "id" TEXT PRIMARY KEY,"couponIssueId" TEXT UNIQUE,"rewardType" TEXT,"displayName" TEXT
    )`,
    `INSERT INTO "Organization" VALUES ('org-a','Salon A',1,50),('org-b','Salon B',1,50)`,
    `INSERT INTO "Customer" VALUES ('customer-a','org-a','山田 花子',NULL),('customer-b','org-b','佐藤 太郎',NULL)`,
    `INSERT INTO "CustomerPointAccount" ("id","customerId","availablePoints","lifetimeEarned") VALUES ('account-a','customer-a',3000,3000)`,
    `INSERT INTO "PointTransaction"
      ("id","customerId","accountId","type","amount","balanceAfter","sourceType","sourceId","reason","expiresAt")
     VALUES ('earn-a','customer-a','account-a','earn',3000,3000,'manual','seed-a','seed',CURRENT_TIMESTAMP+INTERVAL '30 days')`,
    `INSERT INTO "PointLot" ("id","customerId","earnTransactionId","originalAmount","remainingAmount","expiresAt")
     VALUES ('lot-a','customer-a','earn-a',3000,3000,CURRENT_TIMESTAMP+INTERVAL '30 days')`,
    `INSERT INTO "CouponIssue"
      ("id","customerId","couponCode","customerName","discountRate","targetMenusJson","issuedAt","expiresAt")
     VALUES ('coupon-a','customer-a','DEMO20','山田 花子',20,'[]',CURRENT_TIMESTAMP-INTERVAL '1 day',CURRENT_TIMESTAMP+INTERVAL '10 days')`,
    `INSERT INTO "Appointment"
      ("id","customerId","scheduledAt","menu","staffName","estimatedPrice","status","source","bookingProvider","note")
     VALUES ('appointment-a','customer-a',CURRENT_TIMESTAMP+INTERVAL '2 days','カット + カラー','担当 A',10000,'予約確定','お客様アプリ予約','customer_app','お客様アプリから予約')`,
  ]) await db.$executeRawUnsafe(sql)

  const service = createCustomerBookingCouponService({ prisma: db, sessionProvider: async () => customerSession })
  await service.ensureSchema()
  await db.$executeRawUnsafe('UPDATE "Appointment" SET "couponIssueId"=\'coupon-a\' WHERE "id"=\'appointment-a\'')

  const context = await api(service, 'GET', '/api/lien-customer-booking-context')
  assert.equal(context.status, 200)
  assert.deepEqual(context.body.points, {
    availablePoints: 3000,
    minimumRedeem: 1,
    maxRedemptionPercent: 50,
    yenPerPoint: 1,
  })

  const applied = await api(service, 'POST', '/api/lien-customer-booking-coupon', {
    appointmentId: 'appointment-a',
    couponIssueId: 'coupon-a',
    pointsToUse: 3000,
  })
  assert.equal(applied.status, 200)
  assert.equal(applied.body.menuPrice, 10000)
  assert.equal(applied.body.couponDiscount, 2000)
  assert.equal(applied.body.pointsUsed, 3000)
  assert.equal(applied.body.finalPrice, 5000)

  const appointment = (await db.$queryRawUnsafe('SELECT "estimatedPrice","couponIssueId","note" FROM "Appointment" WHERE "id"=\'appointment-a\''))[0]
  assert.equal(appointment.estimatedPrice, 5000)
  assert.equal(appointment.couponIssueId, null)
  assert.match(appointment.note, /予約時メニュー料金: 10,000円/)
  assert.match(appointment.note, /予約クーポン: 20%OFF（DEMO20）/)
  assert.match(appointment.note, /利用ポイント: 3,000pt/)
  assert.match(appointment.note, /支払予定額: 5,000円/)
  assert.equal((await db.$queryRawUnsafe('SELECT "availablePoints" FROM "CustomerPointAccount" WHERE "id"=\'account-a\''))[0].availablePoints, 0)
  assert.equal((await db.$queryRawUnsafe('SELECT "remainingAmount" FROM "PointLot" WHERE "id"=\'lot-a\''))[0].remainingAmount, 0)
  assert.equal((await db.$queryRawUnsafe('SELECT "status" FROM "CouponIssue" WHERE "id"=\'coupon-a\''))[0].status, 'used')

  const duplicate = await api(service, 'POST', '/api/lien-customer-booking-coupon', {
    appointmentId: 'appointment-a', couponIssueId: 'coupon-a', pointsToUse: 3000,
  })
  assert.equal(duplicate.status, 200)
  assert.equal(duplicate.body.finalPrice, 5000)
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "PointTransaction" WHERE "sourceType"=\'appointment_booking\' AND "type"=\'redeem\''))[0].count), 1)

  const admin = await api(service, 'GET', '/api/lien-admin-appointment-coupon?appointmentId=appointment-a')
  assert.equal(admin.status, 200)
  assert.equal(admin.body.bookingApplied, true)
  assert.equal(admin.body.finalPrice, 5000)

  await db.$executeRawUnsafe('UPDATE "Appointment" SET "status"=\'キャンセル\' WHERE "id"=\'appointment-a\'')
  assert.equal((await db.$queryRawUnsafe('SELECT "availablePoints" FROM "CustomerPointAccount" WHERE "id"=\'account-a\''))[0].availablePoints, 3000)
  assert.equal((await db.$queryRawUnsafe('SELECT "remainingAmount" FROM "PointLot" WHERE "id"=\'lot-a\''))[0].remainingAmount, 3000)
  assert.equal((await db.$queryRawUnsafe('SELECT "status" FROM "CouponIssue" WHERE "id"=\'coupon-a\''))[0].status, 'issued')
  assert.equal((await db.$queryRawUnsafe('SELECT "status" FROM "CustomerBookingAdjustmentV652" WHERE "appointmentId"=\'appointment-a\''))[0].status, 'released')

  await db.$executeRawUnsafe(`INSERT INTO "Appointment"
    ("id","customerId","scheduledAt","menu","staffName","estimatedPrice","status","source","bookingProvider","note")
    VALUES ('appointment-b','customer-a',CURRENT_TIMESTAMP+INTERVAL '3 days','カット','担当 A',6000,'予約確定','お客様アプリ予約','customer_app','')`)
  const pointsOnly = await api(service, 'POST', '/api/lien-customer-booking-coupon', {
    appointmentId: 'appointment-b', pointsToUse: 1000,
  })
  assert.equal(pointsOnly.status, 200)
  assert.equal(pointsOnly.body.finalPrice, 5000)
  await db.$executeRawUnsafe(`INSERT INTO "ServiceSale" ("id","customerId","appointmentId","title","amount")
    VALUES ('sale-b','customer-a','appointment-b','カット',5000)`)
  assert.equal((await db.$queryRawUnsafe('SELECT "status" FROM "CustomerBookingAdjustmentV652" WHERE "appointmentId"=\'appointment-b\''))[0].status, 'settled')
  await db.$executeRawUnsafe('UPDATE "Appointment" SET "status"=\'キャンセル\' WHERE "id"=\'appointment-b\'')
  assert.equal((await db.$queryRawUnsafe('SELECT "availablePoints" FROM "CustomerPointAccount" WHERE "id"=\'account-a\''))[0].availablePoints, 2000)

  await db.$executeRawUnsafe(`INSERT INTO "Appointment"
    ("id","customerId","scheduledAt","menu","staffName","estimatedPrice","status","source","bookingProvider","note")
    VALUES ('appointment-invalid','customer-a',CURRENT_TIMESTAMP+INTERVAL '4 days','カット','担当 A',6000,'予約確定','お客様アプリ予約','customer_app','')`)
  const invalid = await api(service, 'POST', '/api/lien-customer-booking-coupon', {
    appointmentId: 'appointment-invalid', pointsToUse: 4000,
  })
  assert.equal(invalid.status, 409)
  assert.equal((await db.$queryRawUnsafe('SELECT "status" FROM "Appointment" WHERE "id"=\'appointment-invalid\''))[0].status, 'キャンセル')

  console.log(JSON.stringify({
    passed: true,
    serverAuthoritativeQuote: true,
    pointsAndCouponPersisted: true,
    idempotent: true,
    cancellationRefunds: true,
    settledBookingsAreNotRefunded: true,
    failedAdjustmentRollsBackBooking: true,
    salonBreakdownAvailable: true,
  }))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
