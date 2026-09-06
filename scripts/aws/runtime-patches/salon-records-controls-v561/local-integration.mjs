import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3124').replace(/\/$/, '')
const databaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://salon:salon_password@127.0.0.1:5432/salon_de_lien?schema=public'
const prisma = new PrismaClient({ datasources:{ db:{ url:databaseUrl } } })
const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
const ids = {
  customer:`v561-customer-${suffix}`,
  sourceCustomer:`v561-source-customer-${suffix}`,
  chart:`v561-chart-${suffix}`,
  product:`v561-product-${suffix}`,
  sale:`v561-sale-${suffix}`,
  line:`v561-line-${suffix}`,
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics?salesLedger=1' }),
  })
  assert.ok([302, 303].includes(response.status), `owner login failed: ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^lien_admin_session=/)
  return cookie
}

async function cleanup() {
  await prisma.$executeRawUnsafe('DELETE FROM "CustomerMergeHistory" WHERE "sourceCustomerId"=$1', ids.sourceCustomer).catch(() => undefined)
  await prisma.$executeRawUnsafe('DELETE FROM "CustomerChartPhoto" WHERE "id"=$1', ids.chart).catch(() => undefined)
  await prisma.$executeRawUnsafe('DELETE FROM "SalesVoidAudit" WHERE "serviceSaleId"=$1', ids.sale).catch(() => undefined)
  await prisma.$executeRawUnsafe('DELETE FROM "ServiceSale" WHERE "id"=$1', ids.sale).catch(() => undefined)
  await prisma.$executeRawUnsafe('DELETE FROM "Product" WHERE "id"=$1', ids.product).catch(() => undefined)
  await prisma.$executeRawUnsafe('DELETE FROM "Customer" WHERE "id"=$1', ids.sourceCustomer).catch(() => undefined)
  await prisma.$executeRawUnsafe('DELETE FROM "Customer" WHERE "id"=$1', ids.customer).catch(() => undefined)
}

try {
  const ready = await fetch(`${baseUrl}/api/health/ready?verify=v561`, { cache:'no-store' })
  assert.equal(ready.status, 200)
  assert.equal(ready.headers.get('x-lien-salon-records-controls'), 'v561')

  const ownerCookie = await login()
  const ownerHeaders = { Cookie:ownerCookie, Accept:'application/json', 'Cache-Control':'no-cache' }
  const owner = await prisma.appUser.findFirst({
    where:{ loginId:'demo.owner', role:'ADMIN', active:true },
    select:{ organizationId:true },
  })
  assert.ok(owner?.organizationId)
  const organizationId = owner.organizationId

  await prisma.$executeRawUnsafe(
    'INSERT INTO "Customer" ("id","name","organizationId","updatedAt") VALUES ($1,$2,$3,NOW())',
    ids.customer, 'V561 Fixture Customer', organizationId,
  )
  await prisma.$executeRawUnsafe(
    'INSERT INTO "Product" ("id","manufacturerName","name","organizationId","retailPrice","stockQuantity","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW())',
    ids.product, 'ORIMIA Test', 'V561 Fixture Product', organizationId, 1100, 7,
  )
  await prisma.$executeRawUnsafe(
    'INSERT INTO "ServiceSale" ("id","customerId","title","amount","paymentMethod","paidAt","source") VALUES ($1,$2,$3,$4,$5,NOW(),$6)',
    ids.sale, ids.customer, 'V561 cancellation fixture', 3300, 'cash', 'integration-test',
  )
  await prisma.$executeRawUnsafe(
    'INSERT INTO "ProductSaleLine" ("id","serviceSaleId","productId","productNameSnapshot","manufacturerNameSnapshot","unitPrice","quantity","lineTotal") VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    ids.line, ids.sale, ids.product, 'V561 Fixture Product', 'ORIMIA Test', 1100, 3, 3300,
  )

  const charts = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(ids.customer)}/chart-photos?limit=1`, { headers:ownerHeaders })
  assert.equal(charts.status, 200)
  const chartPayload = await charts.json()
  assert.equal(chartPayload.count, 0)
  assert.deepEqual(chartPayload.items, [])

  const invalidUpload = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(ids.customer)}/chart-photos`, {
    method:'POST',
    headers:{ ...ownerHeaders, Origin:baseUrl, 'Content-Type':'text/plain' },
    body:'not-an-image',
  })
  assert.equal(invalidUpload.status, 415)

  const beforeLedger = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2026-01-01&to=2027-01-01`, { headers:ownerHeaders })
  assert.equal(beforeLedger.status, 200)
  assert.ok((await beforeLedger.json()).rows.some(row => row.id === ids.sale))

  const cancel = await fetch(`${baseUrl}/api/admin/sales-ledger/void`, {
    method:'POST',
    headers:{ ...ownerHeaders, Origin:baseUrl, 'Content-Type':'application/json' },
    body:JSON.stringify({ saleId:ids.sale, reason:'V561 integration test', confirmed:true }),
  })
  assert.equal(cancel.status, 200, await cancel.text())

  const [saleRows, productRows, auditRows] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT "id" FROM "ServiceSale" WHERE "id"=$1', ids.sale),
    prisma.$queryRawUnsafe('SELECT "stockQuantity" FROM "Product" WHERE "id"=$1', ids.product),
    prisma.$queryRawUnsafe('SELECT "serviceSaleId","restoredStockQuantity","snapshotJson" FROM "SalesVoidAudit" WHERE "serviceSaleId"=$1', ids.sale),
  ])
  assert.equal(saleRows.length, 0)
  assert.equal(Number(productRows[0]?.stockQuantity), 10)
  assert.equal(auditRows.length, 1)
  assert.equal(Number(auditRows[0].restoredStockQuantity), 3)
  assert.equal(auditRows[0].snapshotJson.sale.id, ids.sale)

  await prisma.$executeRawUnsafe(
    'INSERT INTO "Customer" ("id","name","organizationId","updatedAt") VALUES ($1,$2,$3,NOW())',
    ids.sourceCustomer, 'V561 Source Customer', organizationId,
  )
  await prisma.$executeRawUnsafe(
    'INSERT INTO "CustomerChartPhoto" ("id","organizationId","customerId","storageReference","uploadedByName","byteSize") VALUES ($1,$2,$3,$4,$5,$6)',
    ids.chart, organizationId, ids.sourceCustomer, `s3-private://private/customer-chart-photos/${organizationId}/${ids.sourceCustomer}/${ids.chart}.jpg`, 'Integration Owner', 100,
  )
  const merge = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(ids.customer)}/merge`, {
    method:'POST',
    headers:{ ...ownerHeaders, Origin:baseUrl, 'X-Forwarded-Proto':'http', 'Content-Type':'application/json' },
    body:JSON.stringify({ sourceCustomerId:ids.sourceCustomer, confirmationName:'V561 Source Customer', confirmed:true }),
  })
  assert.equal(merge.status, 200, await merge.text())
  const movedCharts = await prisma.$queryRawUnsafe('SELECT "customerId" FROM "CustomerChartPhoto" WHERE "id"=$1', ids.chart)
  assert.equal(movedCharts[0]?.customerId, ids.customer)

  const ownerAttendance = await fetch(`${baseUrl}/api/admin/attendance?month=2026-09`, { headers:ownerHeaders })
  assert.equal(ownerAttendance.status, 200)
  assert.equal((await ownerAttendance.json()).canEditRecords, true)

  const switchResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
    method:'POST',
    headers:{ ...ownerHeaders, Origin:baseUrl },
  })
  assert.equal(switchResponse.status, 200)
  const sharedCookie = (switchResponse.headers.get('set-cookie') || '').split(';')[0]
  assert.match(sharedCookie, /^lien_admin_session=/)
  const sharedHeaders = { Cookie:sharedCookie, Accept:'application/json' }

  const sharedAttendance = await fetch(`${baseUrl}/api/admin/attendance?month=2026-09`, { headers:sharedHeaders })
  assert.equal(sharedAttendance.status, 200)
  const sharedAttendancePayload = await sharedAttendance.json()
  assert.equal(sharedAttendancePayload.canEditRecords, false)
  assert.equal(sharedAttendancePayload.sharedStoreAccount, true)

  const forgedEdit = await fetch(`${baseUrl}/api/admin/attendance`, {
    method:'POST',
    headers:{ ...sharedHeaders, Origin:baseUrl, 'X-Forwarded-Proto':'http', 'Content-Type':'application/json' },
    body:JSON.stringify({ action:'save_record', staffKey:'forged', workDate:'2026-09-01', clockInAt:'2026-09-01T09:00', clockOutAt:'2026-09-01T18:00' }),
  })
  assert.equal(forgedEdit.status, 403)
  assert.match(await forgedEdit.text(), /店舗共通アカウント/)

  console.log(JSON.stringify({
    release:'salon-records-controls-v561',
    chartApi:true,
    invalidImageRejected:true,
    cancelledSaleRemoved:true,
    stockRestored:true,
    auditRetained:true,
    chartMovedOnCustomerMerge:true,
    ownerAttendanceEditable:true,
    sharedAttendanceReadOnly:true,
  }))
} finally {
  await cleanup()
  await prisma.$disconnect()
}
