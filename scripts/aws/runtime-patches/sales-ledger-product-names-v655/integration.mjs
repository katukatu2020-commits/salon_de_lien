import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

if (!process.env.TEST_DATABASE_URL) {
  console.log(JSON.stringify({ skipped: true, reason: 'TEST_DATABASE_URL is not set' }))
  process.exit(0)
}

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const { createSalesLedgerAccountsService } = require('/app/sales-ledger-accounts-v318.js')

const schema = `sales_ledger_products_${crypto.randomBytes(6).toString('hex')}`
const bootstrapUrl = new URL(process.env.TEST_DATABASE_URL)
bootstrapUrl.searchParams.set('connection_limit', '6')
const bootstrap = new PrismaClient({ datasources: { db: { url: bootstrapUrl.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
const testUrl = new URL(bootstrapUrl)
testUrl.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources: { db: { url: testUrl.href } } })

function request() {
  return { method: 'GET', headers: { host: 'salon-de-lien.com' } }
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

async function report(service, search = '') {
  const query = new URLSearchParams({ from: '2026-09-01', to: '2026-09-30' })
  if (search) query.set('keyword', search)
  const res = response()
  await service.handle(request(), res, new URL(`https://salon-de-lien.com/api/admin/sales-ledger?${query}`))
  return { status: res.statusCode, body: JSON.parse(res.body || '{}') }
}

try {
  for (const sql of [
    `CREATE TABLE "Organization" (
      "id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"slug" TEXT NOT NULL,"taxRate" INTEGER NOT NULL DEFAULT 10
    )`,
    `CREATE TABLE "AppUser" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT,"email" TEXT,"loginId" TEXT,"displayName" TEXT,
      "passwordHash" TEXT,"role" TEXT NOT NULL,"active" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE "Customer" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"deletedAt" TIMESTAMPTZ
    )`,
    `CREATE TABLE "CustomerRealName" (
      "customerId" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"realName" TEXT NOT NULL,
      PRIMARY KEY ("customerId","organizationId")
    )`,
    `CREATE TABLE "Appointment" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"scheduledAt" TIMESTAMPTZ NOT NULL,
      "menu" TEXT,"staffName" TEXT,"bookingProvider" TEXT
    )`,
    `CREATE TABLE "ServiceSale" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"appointmentId" TEXT,"paidAt" TIMESTAMPTZ NOT NULL,
      "title" TEXT NOT NULL,"amount" INTEGER NOT NULL,"paymentMethod" TEXT,"source" TEXT,"note" TEXT
    )`,
    `CREATE TABLE "ProductSaleLine" (
      "id" TEXT PRIMARY KEY,"serviceSaleId" TEXT NOT NULL,"productId" TEXT NOT NULL,
      "productNameSnapshot" TEXT NOT NULL,"manufacturerNameSnapshot" TEXT NOT NULL,
      "unitPrice" INTEGER NOT NULL,"quantity" INTEGER NOT NULL,"lineTotal" INTEGER NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX "ProductSaleLine_serviceSaleId_idx" ON "ProductSaleLine"("serviceSaleId")`,
    `CREATE TABLE "PointTransaction" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"type" TEXT NOT NULL,"amount" INTEGER NOT NULL,
      "sourceId" TEXT,"sourceType" TEXT NOT NULL
    )`,
    `INSERT INTO "Organization" ("id","name","slug","taxRate") VALUES
      ('org-a','Salon de Lien','salon-de-lien',10),('org-b','Other Salon','other-salon',10)`,
    `INSERT INTO "Customer" ("id","organizationId","name") VALUES
      ('customer-a','org-a','山田 花子'),('customer-b','org-b','他店 顧客')`,
    `INSERT INTO "CustomerRealName" ("customerId","organizationId","realName") VALUES
      ('customer-a','org-a','山田 花子')`,
    `INSERT INTO "Appointment" ("id","customerId","scheduledAt","menu","staffName","bookingProvider") VALUES
      ('appointment-products','customer-a','2026-09-15T09:00:00+09:00','カット','谷崎 太二','customer_app'),
      ('appointment-service','customer-a','2026-09-16T09:00:00+09:00','カラー','谷崎 太二','admin'),
      ('appointment-other','customer-b','2026-09-15T09:00:00+09:00','カット','他店担当','admin')`,
    `INSERT INTO "ServiceSale" ("id","customerId","appointmentId","paidAt","title","amount","paymentMethod","source","note") VALUES
      ('sale-products','customer-a','appointment-products','2026-09-15T10:00:00+09:00','カット・店販',12100,'現金','checkout',''),
      ('sale-service','customer-a','appointment-service','2026-09-16T10:00:00+09:00','カラー',6600,'クレジットカード','checkout',''),
      ('sale-other','customer-b','appointment-other','2026-09-15T10:00:00+09:00','他店会計',9999,'現金','checkout','')`,
    `INSERT INTO "ProductSaleLine"
      ("id","serviceSaleId","productId","productNameSnapshot","manufacturerNameSnapshot","unitPrice","quantity","lineTotal","createdAt") VALUES
      ('line-a','sale-products','product-a','オージュア クエンチ シャンプー','ミルボン',2200,2,4400,'2026-09-15T10:01:00+09:00'),
      ('line-b','sale-products','product-b','エルジューダ エマルジョン+','ミルボン',3300,1,3300,'2026-09-15T10:02:00+09:00'),
      ('line-other','sale-other','product-other','他店だけの商品','他店メーカー',9999,1,9999,'2026-09-15T10:01:00+09:00')`,
  ]) await db.$executeRawUnsafe(sql)

  const service = createSalesLedgerAccountsService({
    prisma: db,
    crypto,
    sessionProvider: async () => ({ role: 'ADMIN', organizationId: 'org-a', userId: 'owner-a', displayName: 'Owner A' }),
  })

  const all = await report(service)
  assert.equal(all.status, 200)
  assert.equal(all.body.rows.length, 2)
  const productSale = all.body.rows.find(row => row.id === 'sale-products')
  assert.ok(productSale)
  assert.equal(productSale.productCount, 3)
  assert.equal(productSale.productLineCount, 2)
  assert.equal(productSale.productTotal, 7700)
  assert.deepEqual(productSale.productLines, [
    { name: 'オージュア クエンチ シャンプー', manufacturer: 'ミルボン', quantity: 2, unitPrice: 2200, lineTotal: 4400 },
    { name: 'エルジューダ エマルジョン+', manufacturer: 'ミルボン', quantity: 1, unitPrice: 3300, lineTotal: 3300 },
  ])
  assert.deepEqual(all.body.rows.find(row => row.id === 'sale-service').productLines, [])
  assert.equal(all.body.rows.some(row => row.id === 'sale-other'), false, 'another salon sale leaked into the ledger')

  const byProduct = await report(service, 'クエンチ')
  assert.equal(byProduct.status, 200)
  assert.deepEqual(byProduct.body.rows.map(row => row.id), ['sale-products'])

  const byManufacturer = await report(service, 'ミルボン')
  assert.equal(byManufacturer.status, 200)
  assert.deepEqual(byManufacturer.body.rows.map(row => row.id), ['sale-products'])

  const absent = await report(service, '存在しない商品')
  assert.equal(absent.status, 200)
  assert.deepEqual(absent.body.rows, [])

  console.log(JSON.stringify({
    release: 'sales-ledger-product-names-v655',
    realPostgres: true,
    historicalProductNamesReturned: true,
    productTotalsReconciled: true,
    productSearchVerified: true,
    organizationIsolationVerified: true,
  }))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
