import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const { createStampProgramService } = require('/app/stamp-program-v603')

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL required')
const schema = `stamp_program_${randomBytes(6).toString('hex')}`
const bootstrapUrl = new URL(process.env.TEST_DATABASE_URL)
bootstrapUrl.searchParams.set('connection_limit', '2')
const bootstrap = new PrismaClient({ datasources:{ db:{ url:bootstrapUrl.href } } })
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
const testUrl = new URL(bootstrapUrl)
testUrl.searchParams.set('schema', schema)
const db = new PrismaClient({ datasources:{ db:{ url:testUrl.href } } })

let staffSession = { organizationId:'org-a', userId:'owner-a', role:'ADMIN' }
const service = createStampProgramService({ prisma:db, staffSessionProvider:async () => staffSession })

async function api({ method = 'GET', body, headers = {} } = {}) {
  const chunks = body === undefined ? [] : [Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))]
  const req = Object.assign(Readable.from(chunks), {
    method,
    headers:{ host:'stamp.test', origin:'https://stamp.test', ...headers },
    socket:{ encrypted:true },
  })
  const res = {
    statusCode:200,
    headers:{},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value) { this.raw = String(value || ''); this.body = this.raw ? JSON.parse(this.raw) : null },
  }
  assert.equal(await service.handle(req, res, new URL('https://stamp.test/api/lien-stamp-program')), true)
  return res
}

try {
  for (const sql of [
    `CREATE TABLE "Organization" (
      "id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE "Product" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"manufacturerName" TEXT NOT NULL,"name" TEXT NOT NULL,
      "category" TEXT,"retailPrice" INTEGER,"active" BOOLEAN NOT NULL DEFAULT TRUE,"salesSuspended" BOOLEAN NOT NULL DEFAULT FALSE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE "SalonMenu" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"name" TEXT NOT NULL,"category" TEXT NOT NULL,
      "durationMinutes" INTEGER NOT NULL,"priceYen" INTEGER NOT NULL,"active" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE "Customer" (
      "id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"deletedAt" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
    `CREATE TABLE "Visit" (
      "id" TEXT PRIMARY KEY,"customerId" TEXT NOT NULL,"performedStyle" TEXT,"requestedStyle" TEXT,
      "visitedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),"updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  ]) await db.$executeRawUnsafe(sql)

  await db.$executeRawUnsafe(`INSERT INTO "Organization" ("id","name") VALUES ('org-a','ORIMIA 岡山店'),('org-b','別店舗')`)
  await db.$executeRawUnsafe(`INSERT INTO "Product" ("id","organizationId","manufacturerName","name","category","retailPrice","active","salesSuspended") VALUES
    ('product-a','org-a','ORIMIA','ヘアオイル','ケア',3200,TRUE,FALSE),
    ('product-paused','org-a','ORIMIA','販売停止品','ケア',3000,TRUE,TRUE),
    ('product-b','org-b','SECRET','別店舗商品','ケア',9999,TRUE,FALSE)`)
  await db.$executeRawUnsafe(`INSERT INTO "SalonMenu" ("id","organizationId","name","category","durationMinutes","priceYen","active","sortOrder") VALUES
    ('menu-a','org-a','トリートメント','ケア',30,4400,TRUE,1),
    ('menu-old','org-a','停止中メニュー','ケア',20,2200,FALSE,2),
    ('menu-b','org-b','別店舗メニュー','ケア',30,9999,TRUE,1)`)
  await db.$executeRawUnsafe(`INSERT INTO "Customer" ("id","organizationId") VALUES ('customer-a','org-a'),('customer-b','org-b')`)
  for (let index = 0; index < 7; index += 1) {
    await db.$executeRawUnsafe(
      `INSERT INTO "Visit" ("id","customerId","performedStyle") VALUES ($1,'customer-a',$2)`,
      `visit-${index}`,
      index % 2 ? 'フェイシャル' : 'カット',
    )
  }
  await db.$executeRawUnsafe(`INSERT INTO "Visit" ("id","customerId","performedStyle") VALUES ('visit-b','customer-b','別店舗来店')`)

  await service.ensureSchema()
  await service.ensureSchema()

  const initial = await api()
  assert.equal(initial.statusCode, 200)
  assert.equal(initial.body.organization.name, 'ORIMIA 岡山店')
  assert.equal(initial.body.program.requiredVisits, 10)
  assert.deepEqual(initial.body.options.products.map(item => item.id), ['product-a'])
  assert.deepEqual(initial.body.options.menus.map(item => item.id), ['menu-a'])
  assert.equal(JSON.stringify(initial.body).includes('product-b'), false)
  assert.equal(JSON.stringify(initial.body).includes('menu-b'), false)

  const defaultCard = await service.customerCard({ organizationId:'org-a', customerId:'customer-a' })
  assert.equal(defaultCard.organization.name, 'ORIMIA 岡山店')
  assert.equal(defaultCard.totalVisits, 7)
  assert.equal(defaultCard.currentStamps, 7)
  assert.equal(defaultCard.remainingVisits, 3)

  await api({
    method:'PATCH',
    body:{ requiredVisits:7, rewardType:'DISCOUNT_PERCENT', discountValue:10, rewardTitle:'', rewardDescription:'' },
  })
  const completedCard = await service.customerCard({ organizationId:'org-a', customerId:'customer-a' })
  assert.equal(completedCard.currentStamps, 7)
  assert.equal(completedCard.remainingVisits, 0)
  assert.equal(completedCard.completedCards, 1)

  const freeProduct = await api({
    method:'PATCH',
    body:{ requiredVisits:6, rewardType:'PRODUCT_FREE', rewardProductId:'product-a', rewardTitle:'', rewardDescription:'' },
  })
  assert.equal(freeProduct.statusCode, 200)
  assert.equal(freeProduct.body.program.rewardProductId, 'product-a')
  assert.equal(freeProduct.body.program.rewardTitle, '')
  let card = await service.customerCard({ organizationId:'org-a', customerId:'customer-a' })
  assert.equal(card.requiredVisits, 6)
  assert.equal(card.totalVisits, 7)
  assert.equal(card.currentStamps, 1)
  assert.equal(card.remainingVisits, 5)
  assert.equal(card.completedCards, 1)
  assert.equal(card.reward.type, 'PRODUCT_FREE')
  assert.equal(card.reward.title, 'ヘアオイル 1点無料')
  assert.equal(card.reward.target.name, 'ヘアオイル')

  const freeMenu = await api({
    method:'PATCH',
    body:{ requiredVisits:8, rewardType:'MENU_FREE', rewardMenuId:'menu-a', rewardTitle:'', rewardDescription:'' },
  })
  assert.equal(freeMenu.statusCode, 200)
  assert.equal(freeMenu.body.program.rewardTitle, '')
  card = await service.customerCard({ organizationId:'org-a', customerId:'customer-a' })
  assert.equal(card.reward.title, 'トリートメント 無料')

  const percent = await api({
    method:'PATCH',
    body:{ requiredVisits:9, rewardType:'DISCOUNT_PERCENT', discountValue:15, rewardTitle:'', rewardDescription:'' },
  })
  assert.equal(percent.statusCode, 200)
  assert.equal(percent.body.program.rewardTitle, '')
  card = await service.customerCard({ organizationId:'org-a', customerId:'customer-a' })
  assert.equal(card.reward.title, '15%OFFクーポン')

  const fixed = await api({
    method:'PATCH',
    body:{ requiredVisits:12, rewardType:'DISCOUNT_FIXED', discountValue:1500, rewardTitle:'', rewardDescription:'' },
  })
  assert.equal(fixed.statusCode, 200)
  assert.equal(fixed.body.program.rewardTitle, '')
  card = await service.customerCard({ organizationId:'org-a', customerId:'customer-a' })
  assert.equal(card.reward.title, '1,500円OFFクーポン')

  const custom = await api({
    method:'PATCH',
    body:{ requiredVisits:5, rewardType:'CUSTOM', rewardTitle:'お好きなケア特典', rewardDescription:'店頭でスタッフにご提示ください。' },
  })
  assert.equal(custom.statusCode, 200)
  card = await service.customerCard({ organizationId:'org-a', customerId:'customer-a' })
  assert.equal(card.reward.title, 'お好きなケア特典')
  assert.equal(card.currentStamps, 2)
  assert.equal(card.completedCards, 1)

  assert.equal((await api({ method:'PATCH', body:{ requiredVisits:0, rewardType:'CUSTOM', rewardTitle:'x' } })).statusCode, 400)
  assert.equal((await api({ method:'PATCH', body:{ requiredVisits:5, rewardType:'CUSTOM', rewardTitle:'' } })).statusCode, 400)
  assert.equal((await api({ method:'PATCH', body:{ requiredVisits:5, rewardType:'PRODUCT_FREE', rewardProductId:'product-b' } })).statusCode, 409)
  assert.equal((await api({ method:'PATCH', body:{ requiredVisits:5, rewardType:'MENU_FREE', rewardMenuId:'menu-old' } })).statusCode, 409)
  assert.equal((await api({ method:'PATCH', body:{ requiredVisits:5, rewardType:'DISCOUNT_PERCENT', discountValue:100 } })).statusCode, 400)
  assert.equal((await api({ method:'PATCH', body:{ requiredVisits:5, rewardType:'CUSTOM', rewardTitle:'x' }, headers:{ origin:'https://evil.test' } })).statusCode, 403)
  assert.equal((await api({ method:'PATCH', body:{ requiredVisits:5, rewardType:'CUSTOM', rewardTitle:'x' }, headers:{ origin:'' } })).statusCode, 403)
  assert.equal((await api({ method:'PATCH', body:'{invalid' })).statusCode, 400)
  assert.equal((await api({ method:'PATCH', body:'x'.repeat(25 * 1024) })).statusCode, 413)
  assert.equal((await api({ method:'POST', body:{} })).statusCode, 405)

  staffSession = { organizationId:'org-a', userId:'staff-a', role:'STAFF' }
  assert.equal((await api()).statusCode, 403)
  staffSession = null
  assert.equal((await api()).statusCode, 401)

  await assert.rejects(
    service.customerCard({ organizationId:'org-b', customerId:'customer-a' }),
    error => error.status === 404 || error.status === 401,
  )

  console.log(JSON.stringify({
    passed:true,
    schema:true,
    unifiedVisitCounting:true,
    productMenuAndDiscountRewards:true,
    storeName:true,
    tenantIsolation:true,
    validationAndCsrf:true,
  }))
} finally {
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
