import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

if (!process.env.TEST_DATABASE_URL) {
  console.log(JSON.stringify({ skipped: true, reason: 'TEST_DATABASE_URL is not set' }))
  process.exit(0)
}

process.env.DEALER_AUTH_SECRET = 'dealer-order-documents-v656-test-secret-000000000000000000000000'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const { createWholesaleOrderingService } = require('/app/wholesale-ordering-v543.js')

const schema = `dealer_documents_${crypto.randomBytes(6).toString('hex')}`
const bootstrapUrl = new URL(process.env.TEST_DATABASE_URL)
bootstrapUrl.searchParams.set('connection_limit', '6')
const bootstrap = new PrismaClient({ datasources: { db: { url: bootstrapUrl.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
const testUrl = new URL(bootstrapUrl)
testUrl.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources: { db: { url: testUrl.href } } })

function token(dealerId) {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({ version: 1, dealerId, loginId: dealerId, authVersion: 1, issuedAt, expiresAt: issuedAt + 3600, sessionId: crypto.randomUUID() })).toString('base64url')
  const signature = crypto.createHmac('sha256', process.env.DEALER_AUTH_SECRET).update(payload).digest('base64url')
  return payload + '.' + signature
}

function request(dealerId = '') {
  return {
    method: 'GET',
    headers: {
      host: 'salon-de-lien.com',
      ...(dealerId ? { cookie: `orimia_dealer_session=${encodeURIComponent(token(dealerId))}` } : {}),
    },
  }
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: Buffer.alloc(0),
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value = '') { this.body = Buffer.isBuffer(value) ? value : Buffer.from(String(value)) },
  }
}

async function get(service, pathname, dealerId = '') {
  const res = response()
  const handled = await service.handle(request(dealerId), res, new URL(`https://salon-de-lien.com${pathname}`))
  return { handled, res, text: res.body.toString('utf8') }
}

try {
  for (const sql of [
    `CREATE TABLE "WholesaleDealer" (
      "id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"storeName" TEXT,"representativeName" TEXT,
      "invoiceRegistrationNumber" TEXT,"loginId" TEXT NOT NULL,"email" TEXT,"phone" TEXT,
      "postalCode" TEXT,"prefecture" TEXT,"city" TEXT,"addressLine1" TEXT,"addressLine2" TEXT,
      "address" TEXT,"websiteUrl" TEXT,"businessHours" TEXT,"dealerCode" TEXT,"authVersion" INTEGER NOT NULL DEFAULT 1,
      "active" BOOLEAN NOT NULL DEFAULT TRUE
    )`,
    `CREATE TABLE "Organization" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL)`,
    `CREATE TABLE "Product" ("id" TEXT PRIMARY KEY)`,
    `CREATE TABLE "OrganizationStoreProfile" (
      "organizationId" TEXT PRIMARY KEY,"phone" TEXT,"postalCode" TEXT,"prefecture" TEXT,"city" TEXT,"addressLine1" TEXT,"addressLine2" TEXT
    )`,
    `CREATE TABLE "WholesaleOrder" (
      "id" TEXT PRIMARY KEY,"orderNo" TEXT NOT NULL,"dealerId" TEXT NOT NULL,"organizationId" TEXT NOT NULL,
      "status" TEXT NOT NULL,"requestedDeliveryDate" DATE,"salonNote" TEXT,"dealerNote" TEXT,
      "orderedByUserId" TEXT,"orderedByName" TEXT,"acceptedByName" TEXT,"deliveryNo" TEXT,
      "taxRate" INTEGER,"subtotalYen" INTEGER,"taxYen" INTEGER,"totalYen" INTEGER,
      "orderedAt" TIMESTAMPTZ,"acceptedAt" TIMESTAMPTZ,"shippedAt" TIMESTAMPTZ,"deliveredAt" TIMESTAMPTZ,
      "cancelledAt" TIMESTAMPTZ,"createdAt" TIMESTAMPTZ DEFAULT NOW(),"updatedAt" TIMESTAMPTZ DEFAULT NOW()
    )`,
    `CREATE TABLE "WholesaleOrderLine" (
      "id" TEXT PRIMARY KEY,"orderId" TEXT NOT NULL,"productId" TEXT,"dealerProductId" TEXT,
      "manufacturerName" TEXT,"productName" TEXT,"category" TEXT,"productCode" TEXT,"janCode" TEXT,
      "listPrice" INTEGER,"discountRate" NUMERIC(5,2),"unitPrice" INTEGER,"quantity" INTEGER,
      "deliveredQuantity" INTEGER,"lineTotal" INTEGER,"createdAt" TIMESTAMPTZ DEFAULT NOW(),"updatedAt" TIMESTAMPTZ DEFAULT NOW()
    )`,
    `INSERT INTO "WholesaleDealer" ("id","name","invoiceRegistrationNumber","loginId","email","phone","postalCode","prefecture","city","addressLine1","dealerCode") VALUES
      ('dealer-a','スーパーヤマモト','T1234567890123','dealer-a','dealer-a@example.test','086-111-1111','700-0001','岡山県','岡山市','表町1-1','DLR-A'),
      ('dealer-b','別ディーラー',NULL,'dealer-b','dealer-b@example.test','086-222-2222','700-0002','岡山県','岡山市','表町2-2','DLR-B')`,
    `INSERT INTO "Organization" ("id","name") VALUES ('salon-a','Salon de Lien')`,
    `INSERT INTO "OrganizationStoreProfile" ("organizationId","phone","postalCode","prefecture","city","addressLine1") VALUES ('salon-a','086-333-3333','700-0901','岡山県','岡山市','本町3-3')`,
    `INSERT INTO "WholesaleOrder" ("id","orderNo","dealerId","organizationId","status","requestedDeliveryDate","salonNote","dealerNote","orderedByName","deliveryNo","taxRate","subtotalYen","taxYen","totalYen","orderedAt","shippedAt") VALUES
      ('order-a','PO-20260917-A','dealer-a','salon-a','SHIPPED','2026-09-20','午前中希望','メーカー直送','店長','DN-20260917-A',10,10250,1025,11275,'2026-09-17T01:00:00+00:00','2026-09-17T03:00:00+00:00')`,
    `INSERT INTO "WholesaleOrderLine" ("id","orderId","manufacturerName","productName","category","productCode","janCode","listPrice","discountRate","unitPrice","quantity","deliveredQuantity","lineTotal","createdAt") VALUES
      ('line-m','order-a','ミルボン','オージュア','ヘアケア','MIL-001','4900000000001',5000,20,4000,2,2,8000,'2026-09-17T01:01:00+00:00'),
      ('line-s','order-a','サンコール','=CSV TEST','カラー','SUN-002','4900000000002',3000,25,2250,1,1,2250,'2026-09-17T01:02:00+00:00')`,
  ]) await db.$executeRawUnsafe(sql)

  const service = createWholesaleOrderingService({ prisma: db, crypto, adminSessionProvider: async () => null })

  const invoice = await get(service, '/dealer/orders/order-a/invoice', 'dealer-a')
  assert.equal(invoice.handled, true)
  assert.equal(invoice.res.statusCode, 200)
  assert.equal(invoice.res.headers['content-type'], 'text/html; charset=utf-8')
  assert.match(invoice.text, /請求書/)
  assert.match(invoice.text, /値引き合計[\s\S]*-2,750円/)
  assert.match(invoice.text, /税抜請求額[\s\S]*10,250円/)
  assert.match(invoice.text, /請求金額[\s\S]*11,275円/)
  assert.doesNotMatch(invoice.text, /割引率|20%|25%/)

  const delivery = await get(service, '/dealer/orders/order-a/delivery-note', 'dealer-a')
  assert.equal(delivery.res.statusCode, 200)
  assert.match(delivery.text, /定価小計（税抜）[\s\S]*13,000円/)
  assert.match(delivery.text, /定価合計[\s\S]*14,300円/)
  assert.doesNotMatch(delivery.text, /値引き合計|10,250円|11,275円|8,000円|2,250円/)

  const csv = await get(service, '/dealer/orders/order-a/export.csv', 'dealer-a')
  assert.equal(csv.res.statusCode, 200)
  assert.equal(csv.res.headers['content-type'], 'text/csv; charset=utf-8')
  assert.match(csv.res.headers['content-disposition'], /PO-20260917-A-order\.csv/)
  assert.equal(csv.text.charCodeAt(0), 0xFEFF)
  assert.match(csv.text, /^\uFEFF"発注番号","受注日","希望納品日","美容室","ディーラー名"/)
  assert.match(csv.text, /"商品コード","JANコード","受注数量","納品数量"/)
  assert.match(csv.text, /"MIL-001"/)
  assert.match(csv.text, /"'=CSV TEST"/)
  assert.doesNotMatch(csv.text, /割引率|20%|25%/)

  const foreignInvoice = await get(service, '/dealer/orders/order-a/invoice', 'dealer-b')
  assert.equal(foreignInvoice.res.statusCode, 404)
  assert.doesNotMatch(foreignInvoice.text, /Salon de Lien|オージュア/)

  const unauthenticated = await get(service, '/dealer/orders/order-a/export.csv')
  assert.equal(unauthenticated.res.statusCode, 302)
  assert.match(unauthenticated.res.headers.location, /^\/dealer\/login\?next=/)
  assert.match(decodeURIComponent(unauthenticated.res.headers.location), /\/dealer\/orders\/order-a\/export\.csv/)

  console.log(JSON.stringify({
    release: 'dealer-order-documents-v656',
    realPostgres: true,
    dealerScopedDocuments: true,
    deliveryListPrices: true,
    invoiceAggregateDiscount: true,
    csvBomAndEscaping: true,
  }))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
