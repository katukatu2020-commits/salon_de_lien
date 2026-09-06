import assert from 'node:assert/strict'
import path from 'node:path'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const runtimeRequire = createRequire(path.join(root, 'package.json'))
const sharp = runtimeRequire('sharp')
const { createSalonOperationsService, __test } = runtimeRequire(path.join(root, 'salon-operations-v561.js'))

let sequence = 0
const chartRows = [{
  id: 'chart-existing',
  storageReference: 's3-private://private/customer-chart-photos/org-1/customer-1/existing.jpg',
  originalFileName: 'existing.jpg',
  uploadedByName: 'Owner',
  byteSize: 1200,
  createdAt: new Date('2026-09-01T01:00:00.000Z'),
}]
const effects = { schema: [], uploads: [], deletedObjects: [], audits: [], stockUpdates: 0, deletedSales: [] }

const prisma = {
  async $executeRawUnsafe(sql) {
    effects.schema.push(sql)
    return 0
  },
  async $queryRawUnsafe(sql, ...args) {
    if (sql.includes('FROM "Customer" WHERE')) {
      return args[0] === 'customer-1' && args[1] === 'org-1' ? [{ id:'customer-1', name:'Fixture Customer' }] : []
    }
    if (sql.startsWith('SELECT "id","storageReference"')) {
      const limit = Number(args[2])
      const offset = Number(args[3])
      return chartRows.slice(offset, offset + limit)
    }
    if (sql.startsWith('SELECT COUNT(*)::int')) return [{ count:chartRows.length }]
    if (sql.startsWith('INSERT INTO "CustomerChartPhoto"')) {
      const row = {
        id: args[0],
        storageReference: args[3],
        originalFileName: args[4],
        uploadedByName: args[6],
        byteSize: args[7],
        createdAt: new Date('2026-09-06T03:00:00.000Z'),
      }
      chartRows.unshift(row)
      return [row]
    }
    throw new Error(`Unexpected query: ${sql.slice(0, 100)}`)
  },
  async $transaction(callback) {
    const tx = {
      async $queryRawUnsafe(sql, ...args) {
        if (sql.includes('FROM "ServiceSale" s')) {
          if (args[0] !== 'sale-1' || args[1] !== 'org-1') return []
          return [{
            id:'sale-1', customerId:'customer-1', appointmentId:'appointment-1', title:'Cut', amount:5500,
            paymentMethod:'cash', paidAt:new Date('2026-09-05T03:00:00.000Z'), source:'checkout', note:null,
            createdAt:new Date('2026-09-05T03:00:00.000Z'), customerName:'Fixture Customer', staffName:'Owner',
            scheduledAt:new Date('2026-09-05T02:00:00.000Z'), menu:'Cut',
          }]
        }
        if (sql.includes('FROM "ProductSaleLine"')) {
          return [{
            id:'line-1', productId:'product-1', productNameSnapshot:'Wax', manufacturerNameSnapshot:'ORIMIA',
            unitPrice:1000, quantity:2, lineTotal:2000, createdAt:new Date('2026-09-05T03:00:00.000Z'),
          }]
        }
        if (sql.startsWith('DELETE FROM "ServiceSale"')) {
          effects.deletedSales.push(args[0])
          return [{ id:args[0] }]
        }
        throw new Error(`Unexpected transaction query: ${sql.slice(0, 100)}`)
      },
      async $executeRawUnsafe(sql, ...args) {
        if (sql.startsWith('INSERT INTO "SalesVoidAudit"')) {
          effects.audits.push({ saleId:args[2], reason:args[6], snapshot:JSON.parse(args[7]), restored:args[8] })
          return 1
        }
        if (sql.startsWith('UPDATE "Product" p')) {
          effects.stockUpdates += 1
          return 1
        }
        throw new Error(`Unexpected transaction command: ${sql.slice(0, 100)}`)
      },
    }
    return callback(tx)
  },
}

const storage = {
  async upload(key, body, metadata) {
    effects.uploads.push({ key, body, metadata })
    return `s3-private://${key}`
  },
  async getReadUrl(reference) {
    return `https://signed.example.test/${encodeURIComponent(reference)}`
  },
  async delete(reference) {
    effects.deletedObjects.push(reference)
  },
}

const service = createSalonOperationsService({
  prisma,
  crypto: { randomUUID:() => `uuid-${++sequence}` },
  storageProvider: storage,
  sessionProvider: async req => {
    const role = req.headers['x-test-role'] || 'ADMIN'
    if (role === 'NONE') return null
    return { role, organizationId:'org-1', userId:`user-${role.toLowerCase()}`, displayName:role === 'ADMIN' ? 'Owner' : 'Shared Staff' }
  },
})

async function invoke(pathname, { method='GET', role='ADMIN', body=null, headers={} } = {}) {
  const bytes = body == null ? null : Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body))
  const req = Readable.from(bytes ? [bytes] : [])
  req.method = method
  req.headers = {
    host:'salon.example.test',
    origin:'https://salon.example.test',
    'x-forwarded-proto':'https',
    'x-test-role':role,
    ...(bytes ? { 'content-length':String(bytes.length) } : {}),
    ...headers,
  }
  req.socket = { encrypted:false }
  const responseHeaders = new Map()
  let responseBody = Buffer.alloc(0)
  const res = {
    statusCode:200,
    setHeader(name, value) { responseHeaders.set(String(name).toLowerCase(), String(value)) },
    end(value) { responseBody = value == null ? Buffer.alloc(0) : Buffer.from(String(value)) },
  }
  const handled = await service.handle(req, res, new URL(pathname, 'https://salon.example.test'))
  const text = responseBody.toString('utf8')
  return { handled, status:res.statusCode, headers:responseHeaders, text, json:text ? JSON.parse(text) : null }
}

assert.equal(__test.chartPhotoRoute('/api/admin/customers/customer-1/chart-photos'), 'customer-1')
assert.equal(__test.chartPhotoRoute('/api/admin/customers/customer-1/nope'), null)
assert.equal(__test.safeSegment('../org 1', 'fallback'), 'org1')
assert.equal(__test.storageKey('s3-private://private/customer-chart-photos/org-1/customer-1/a.jpg'), 'private/customer-chart-photos/org-1/customer-1/a.jpg')
assert.throws(() => __test.storageKey('s3-private://private/customer-photos/a.jpg'))
assert.equal(__test.sameOrigin({ headers:{ host:'salon.example.test', origin:'https://salon.example.test', 'x-forwarded-proto':'https' }, socket:{} }), true)
assert.equal(__test.sameOrigin({ headers:{ host:'salon.example.test', origin:'https://attacker.example', 'x-forwarded-proto':'https' }, socket:{} }), false)

const sourceImage = await sharp({ create:{ width:1800, height:1200, channels:3, background:'#efe7e1' } }).png().toBuffer()
const normalized = await __test.normalizeChartImage(sourceImage)
const normalizedMetadata = await sharp(normalized).metadata()
assert.equal(normalizedMetadata.format, 'jpeg')
assert.equal(normalizedMetadata.width, 1800)
assert.equal(normalizedMetadata.height, 1200)

assert.equal(await service.handle({}, {}, new URL('https://salon.example.test/api/other')), false)

const list = await invoke('/api/admin/customers/customer-1/chart-photos?limit=1&offset=0', { role:'STAFF' })
assert.equal(list.status, 200)
assert.equal(list.json.count, 1)
assert.equal(list.json.items[0].id, 'chart-existing')
assert.match(list.json.items[0].url, /^https:\/\/signed\.example\.test\//)

const upload = await invoke('/api/admin/customers/customer-1/chart-photos', {
  method:'POST',
  role:'STAFF',
  body:sourceImage,
  headers:{ 'content-type':'image/png', 'x-file-name':encodeURIComponent('紙カルテ.png') },
})
assert.equal(upload.status, 201)
assert.equal(effects.uploads.length, 1)
assert.match(effects.uploads[0].key, /^private\/customer-chart-photos\/org-1\/customer-1\/chart_uuid-1\.jpg$/)
assert.equal((await sharp(effects.uploads[0].body).metadata()).format, 'jpeg')
assert.equal(upload.json.item.originalFileName, '紙カルテ.png')

const secondPage = await invoke('/api/admin/customers/customer-1/chart-photos?limit=1&offset=1')
assert.equal(secondPage.status, 200)
assert.equal(secondPage.json.count, 2)
assert.equal(secondPage.json.offset, 1)
assert.equal(secondPage.json.items[0].id, 'chart-existing')

const unauthorized = await invoke('/api/admin/customers/customer-1/chart-photos', { role:'NONE' })
assert.equal(unauthorized.status, 401)

const deniedVoid = await invoke('/api/admin/sales-ledger/void', {
  method:'POST', role:'STAFF', body:{ saleId:'sale-1', confirmed:true }, headers:{ 'content-type':'application/json' },
})
assert.equal(deniedVoid.status, 403)
assert.equal(effects.audits.length, 0)

const cancelled = await invoke('/api/admin/sales-ledger/void', {
  method:'POST', body:{ saleId:'sale-1', reason:'会計データ管理から取消', confirmed:true }, headers:{ 'content-type':'application/json' },
})
assert.equal(cancelled.status, 200)
assert.equal(cancelled.json.restoredStockQuantity, 2)
assert.deepEqual(effects.deletedSales, ['sale-1'])
assert.equal(effects.stockUpdates, 1)
assert.equal(effects.audits.length, 1)
assert.equal(effects.audits[0].saleId, 'sale-1')
assert.equal(effects.audits[0].restored, 2)
assert.equal(effects.audits[0].snapshot.productLines[0].productId, 'product-1')

console.log(JSON.stringify({
  release:'salon-records-controls-v561',
  chartNormalization:true,
  privateChartAuthorization:true,
  chartPagination:true,
  ownerOnlyCancellation:true,
  auditAndStockRestore:true,
}))
