import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const {
  couponMatchesMenu,
  createCustomerBookingCouponService,
} = require('/app/customer-booking-coupon-v616')
const {
  canCustomerCancel,
  customerCancellationDeadline,
  createCustomerAppointmentCancellationService,
} = require('/app/customer-appointment-cancellation-v616')

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL required')
const schema = `customer_booking_confirmation_${crypto.randomBytes(6).toString('hex')}`
const bootstrapUrl = new URL(process.env.TEST_DATABASE_URL)
bootstrapUrl.searchParams.set('connection_limit', '2')
const bootstrap = new PrismaClient({ datasources: { db: { url: bootstrapUrl.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
const testUrl = new URL(bootstrapUrl)
testUrl.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources: { db: { url: testUrl.href } } })
const session = { organizationId: 'org-a', customerId: 'customer-a' }

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

function addTokyoDays(days, hour = 10) {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = type => Number(parts.find(item => item.type === type)?.value || 0)
  const base = new Date(Date.UTC(part('year'), part('month') - 1, part('day') + days, hour - 9, 0, 0))
  return base
}

try {
  for (const sql of [
    'CREATE TABLE "Customer" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"deletedAt" TIMESTAMP)',
    'CREATE TABLE "CouponIssue" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"couponCode" TEXT NOT NULL,"discountRate" INTEGER NOT NULL,"targetMenusJson" JSONB NOT NULL,"issuedAt" TIMESTAMP NOT NULL,"expiresAt" TIMESTAMP NOT NULL,"status" TEXT NOT NULL,"createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE "Appointment" ("id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"scheduledAt" TIMESTAMP NOT NULL,"menu" TEXT,"staffName" TEXT,"status" TEXT NOT NULL,"note" TEXT,"updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE "ServiceSale" ("id" TEXT PRIMARY KEY,"appointmentId" TEXT,"paidAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    'CREATE TABLE "StaffBookingSetting" ("organizationId" TEXT,"staffKey" TEXT,"staffName" TEXT)',
    'CREATE TABLE "Product" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"category" TEXT,"imageUrl" TEXT,"active" BOOLEAN NOT NULL DEFAULT TRUE)',
    'CREATE TABLE "ContactLog" ("id" TEXT PRIMARY KEY,"customerId" TEXT,"channel" TEXT,"purpose" TEXT,"message" TEXT,"outcome" TEXT,"createdAt" TIMESTAMP)',
    'CREATE TABLE "StaffSystemNotification" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"type" TEXT,"title" TEXT,"body" TEXT,"href" TEXT,"entityType" TEXT,"entityId" TEXT,"source" TEXT,"createdAt" TIMESTAMP)',
    'CREATE UNIQUE INDEX "StaffSystemNotification_scope_key" ON "StaffSystemNotification"("organizationId","type","entityId")',
    `INSERT INTO "Customer" VALUES ('customer-a','org-a','Alice',NULL),('customer-b','org-b','Bob',NULL)`,
    `INSERT INTO "CouponIssue" VALUES
      ('coupon-cut','customer-a','CUT10',10,'["カット"]',CURRENT_TIMESTAMP-INTERVAL '1 day',CURRENT_TIMESTAMP+INTERVAL '10 days','issued',CURRENT_TIMESTAMP),
      ('coupon-color','customer-a','COLOR20',20,'["カラー"]',CURRENT_TIMESTAMP-INTERVAL '1 day',CURRENT_TIMESTAMP+INTERVAL '10 days','issued',CURRENT_TIMESTAMP),
      ('coupon-reserved','customer-a','ALL15',15,'["全メニュー"]',CURRENT_TIMESTAMP-INTERVAL '1 day',CURRENT_TIMESTAMP+INTERVAL '10 days','issued',CURRENT_TIMESTAMP),
      ('coupon-cancel','customer-a','SPA5',5,'["ヘッドスパ"]',CURRENT_TIMESTAMP-INTERVAL '1 day',CURRENT_TIMESTAMP+INTERVAL '10 days','issued',CURRENT_TIMESTAMP),
      ('coupon-expired','customer-a','OLD30',30,'[]',CURRENT_TIMESTAMP-INTERVAL '20 days',CURRENT_TIMESTAMP-INTERVAL '1 day','issued',CURRENT_TIMESTAMP),
      ('coupon-foreign','customer-b','PRIVATE50',50,'[]',CURRENT_TIMESTAMP-INTERVAL '1 day',CURRENT_TIMESTAMP+INTERVAL '10 days','issued',CURRENT_TIMESTAMP)`,
  ]) await db.$executeRawUnsafe(sql)

  const couponService = createCustomerBookingCouponService({ prisma: db, sessionProvider: async () => session })
  await couponService.ensureSchema()
  await db.$executeRawUnsafe(
    `INSERT INTO "Appointment" ("id","customerId","scheduledAt","menu","staffName","status","note","couponIssueId") VALUES
      ('reserved','customer-a',$1,'カット','Staff A','予約確定','', 'coupon-reserved'),
      ('book-cut','customer-a',$2,'カット + カラー','Staff A','予約確定','', NULL),
      ('book-spa','customer-a',$3,'ヘッドスパ','Staff B','予約確定','', NULL),
      ('cancel-future','customer-a',$4,'ヘッドスパ','Staff B','予約確定','', 'coupon-cancel'),
      ('cancel-today','customer-a',$5,'カット','Staff A','予約確定','', NULL)`,
    addTokyoDays(4),
    addTokyoDays(5),
    addTokyoDays(6),
    addTokyoDays(2),
    addTokyoDays(0, 23),
  )

  assert.equal(couponMatchesMenu(['全メニュー'], 'ヘッドスパ'), true)
  assert.equal(couponMatchesMenu(['カラー'], 'カット + カラー'), true)
  assert.equal(couponMatchesMenu(['カラー'], 'ヘッドスパ'), false)

  const contextRes = response()
  await couponService.handle(request('GET'), contextRes, new URL('https://salon-de-lien.com/api/lien-customer-booking-context?coupon=coupon-cut'))
  assert.equal(contextRes.statusCode, 200)
  const context = JSON.parse(contextRes.body)
  assert.equal(context.coupon.id, 'coupon-cut')
  assert.deepEqual(context.coupons.map(coupon => coupon.id).sort(), ['coupon-cancel', 'coupon-color', 'coupon-cut', 'coupon-reserved'])
  assert.equal(context.coupons.find(coupon => coupon.id === 'coupon-reserved').appointmentId, 'reserved')
  assert.equal(context.coupons.some(coupon => coupon.id === 'coupon-foreign'), false)
  assert.equal(context.coupons.some(coupon => coupon.id === 'coupon-expired'), false)

  const linkRes = response()
  await couponService.handle(
    request('POST', { appointmentId: 'book-cut', couponIssueId: 'coupon-cut' }),
    linkRes,
    new URL('https://salon-de-lien.com/api/lien-customer-booking-coupon'),
  )
  assert.equal(linkRes.statusCode, 200)
  const linked = await db.$queryRawUnsafe('SELECT "couponIssueId","note" FROM "Appointment" WHERE "id"=\'book-cut\'')
  assert.equal(linked[0].couponIssueId, 'coupon-cut')
  assert.match(linked[0].note, /CUT10/)

  const mismatchRes = response()
  await couponService.handle(
    request('POST', { appointmentId: 'book-spa', couponIssueId: 'coupon-color' }),
    mismatchRes,
    new URL('https://salon-de-lien.com/api/lien-customer-booking-coupon'),
  )
  assert.equal(mismatchRes.statusCode, 409)

  const cancellationService = createCustomerAppointmentCancellationService({
    prisma: db,
    crypto,
    sessionProvider: async () => session,
  })
  const todayRes = response()
  await cancellationService.handle(
    request('POST', { appointmentId: 'cancel-today' }),
    todayRes,
    new URL('https://salon-de-lien.com/api/lien-customer-appointment-cancel'),
  )
  assert.equal(todayRes.statusCode, 409)
  assert.match(JSON.parse(todayRes.body).error, /予約日の前日まで/)

  const futureRes = response()
  await cancellationService.handle(
    request('POST', { appointmentId: 'cancel-future' }),
    futureRes,
    new URL('https://salon-de-lien.com/api/lien-customer-appointment-cancel'),
  )
  assert.equal(futureRes.statusCode, 200)
  const cancelled = await db.$queryRawUnsafe('SELECT "status","couponIssueId" FROM "Appointment" WHERE "id"=\'cancel-future\'')
  assert.equal(cancelled[0].status, 'キャンセル')
  assert.equal(cancelled[0].couponIssueId, null)
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "ContactLog"'))[0].count), 1)
  assert.equal(Number((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "StaffSystemNotification"'))[0].count), 1)

  const appointment = addTokyoDays(1, 8)
  const deadline = customerCancellationDeadline(appointment)
  assert.equal(canCustomerCancel(appointment, new Date(deadline.getTime() - 1)), true)
  assert.equal(canCustomerCancel(appointment, deadline), false)

  console.log(JSON.stringify({
    passed: true,
    tenantCouponScope: true,
    menuEligibility: true,
    couponPersistence: true,
    sameDayCancellationRejected: true,
    futureCancellationAndCouponRelease: true,
  }))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
