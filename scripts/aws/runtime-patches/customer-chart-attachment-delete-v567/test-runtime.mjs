import assert from 'node:assert/strict'
import path from 'node:path'
import { Readable } from 'node:stream'
import { createRequire } from 'node:module'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const requireFromApp = createRequire(path.join(root, 'server.js'))
const sharp = requireFromApp('sharp')
const {
  createCustomerChartAttachmentsService,
  __test,
} = requireFromApp('./customer-chart-attachments-v567.js')

assert.deepEqual(
  __test.chartAttachmentRoute('/api/admin/customers/customer-1/chart-photos'),
  { customerId:'customer-1', attachmentId:null },
)
assert.deepEqual(
  __test.chartAttachmentRoute('/api/admin/customers/customer-1/chart-photos/chart-2'),
  { customerId:'customer-1', attachmentId:'chart-2' },
)
assert.equal(__test.chartAttachmentRoute('/api/admin/customers/customer-1/chart-photos/chart-2/extra'), null)

const image = await sharp({
  create:{ width:640, height:360, channels:3, background:{ r:244, g:238, b:232 } },
}).png().toBuffer()
const inspected = await __test.inspectAttachment(image, 'image/png')
assert.equal(inspected.kind, 'image')
assert.equal(inspected.width, 640)
assert.equal(inspected.height, 360)

const records = []
const uploads = []
const events = []
let failStorageDelete = false
let uuid = 0
const prisma = {
  async $executeRawUnsafe(query, ...params) {
    if (query.startsWith('DELETE FROM "CustomerChartPhoto"')) {
      events.push(`database:delete:${params[0]}`)
      const index = records.findIndex(row => row.id === params[0] && row.organizationId === params[1] && row.customerId === params[2])
      if (index < 0) return 0
      records.splice(index, 1)
      return 1
    }
    return 0
  },
  async $queryRawUnsafe(query, ...params) {
    if (query.startsWith('SELECT "id","name" FROM "Customer"')) {
      return params[0] === 'customer-1' && params[1] === 'organization-1' ? [{ id:'customer-1', name:'顧客 一郎' }] : []
    }
    if (query.startsWith('SELECT COUNT(*)::int')) {
      return [{ count:records.filter(row => row.organizationId === params[0] && row.customerId === params[1]).length }]
    }
    if (query.startsWith('SELECT "id","storageReference" FROM "CustomerChartPhoto" WHERE "id"')) {
      return records.filter(row => row.id === params[0] && row.organizationId === params[1] && row.customerId === params[2])
    }
    if (query.startsWith('SELECT "id","storageReference","originalFileName"')) {
      const [organizationId, customerId, limit, offset] = params
      return records
        .filter(row => row.organizationId === organizationId && row.customerId === customerId)
        .slice()
        .reverse()
        .slice(offset, offset + limit)
    }
    if (query.startsWith('INSERT INTO "CustomerChartPhoto"')) {
      const [id, organizationId, customerId, storageReference, originalFileName, uploadedByUserId, uploadedByName, byteSize] = params
      const row = {
        id,
        organizationId,
        customerId,
        storageReference,
        originalFileName,
        uploadedByUserId,
        uploadedByName,
        byteSize,
        createdAt:new Date(`2026-09-07T10:0${records.length}:00.000Z`),
      }
      records.push(row)
      return [row]
    }
    throw new Error(`Unexpected query: ${query.slice(0, 120)}`)
  },
}
const storage = {
  async upload(key, body, options) {
    uploads.push({ key, body, options })
    return `s3-private://${key}`
  },
  async getReadUrl(reference, options) {
    return `https://private.example/${encodeURIComponent(reference)}?mode=${options.download ? 'download' : 'inline'}`
  },
  async delete(reference) {
    events.push(`storage:delete:${reference}`)
    if (failStorageDelete) throw new Error('simulated private storage failure')
  },
}
const session = {
  role:'ADMIN',
  organizationId:'organization-1',
  userId:'owner-1',
  displayName:'店舗オーナー',
}
const service = createCustomerChartAttachmentsService({
  prisma,
  crypto:{ randomUUID:() => `uuid-${++uuid}` },
  sessionProvider:async () => session,
  storageProvider:storage,
})

function request(method, body, headers = {}) {
  const req = Readable.from(body ? [body] : [])
  req.method = method
  req.headers = { host:'localhost', origin:'http://localhost', ...headers }
  req.socket = {}
  return req
}

function response() {
  return {
    statusCode:200,
    headers:{},
    body:'',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value = '') { this.body += String(value) },
  }
}

async function handle(method, route, body = null, headers = {}) {
  const res = response()
  const handled = await service.handle(request(method, body, headers), res, new URL(`http://localhost${route}`))
  assert.equal(handled, true)
  return { res, data:res.body ? JSON.parse(res.body) : null }
}

let result = await handle('POST', '/api/admin/customers/customer-1/chart-photos', image, {
  'content-type':'image/png',
  'content-length':String(image.length),
  'x-file-name':encodeURIComponent('手書きカルテ.png'),
})
assert.equal(result.res.statusCode, 201)
assert.equal(result.data.item.kind, 'image')
assert.equal(uploads.length, 1)
const uploaded = records[0]

records.push({
  id:'foreign-chart',
  organizationId:'organization-2',
  customerId:'customer-1',
  storageReference:'s3-private://private/customer-chart-photos/organization-2/customer-1/foreign.png',
  originalFileName:'他店舗カルテ.png',
  uploadedByName:'別店舗',
  byteSize:100,
  createdAt:new Date('2026-09-07T10:30:00.000Z'),
})

result = await handle('DELETE', `/api/admin/customers/customer-1/chart-photos/${uploaded.id}`, null, { origin:'https://attacker.example' })
assert.equal(result.res.statusCode, 403)
assert.equal(records.some(row => row.id === uploaded.id), true)
assert.equal(events.length, 0)

result = await handle('DELETE', '/api/admin/customers/customer-1/chart-photos/foreign-chart')
assert.equal(result.res.statusCode, 404)
assert.equal(records.some(row => row.id === 'foreign-chart'), true)
assert.equal(events.length, 0)

failStorageDelete = true
result = await handle('DELETE', `/api/admin/customers/customer-1/chart-photos/${uploaded.id}`)
assert.equal(result.res.statusCode, 500)
assert.equal(records.some(row => row.id === uploaded.id), true)
assert.equal(events.some(event => event.startsWith('database:delete:')), false)

events.length = 0
failStorageDelete = false
result = await handle('DELETE', `/api/admin/customers/customer-1/chart-photos/${uploaded.id}`)
assert.equal(result.res.statusCode, 200)
assert.equal(result.data.deletedId, uploaded.id)
assert.equal(records.some(row => row.id === uploaded.id), false)
assert.match(events[0], /^storage:delete:/)
assert.equal(events[1], `database:delete:${uploaded.id}`)

result = await handle('GET', '/api/admin/customers/customer-1/chart-photos?limit=10')
assert.equal(result.res.statusCode, 200)
assert.equal(result.data.count, 0)
assert.equal(result.data.items.length, 0)

result = await handle('DELETE', '/api/admin/customers/customer-1/chart-photos')
assert.equal(result.res.statusCode, 405)
assert.equal(result.res.headers.allow, 'GET, POST')

const anonymous = createCustomerChartAttachmentsService({
  prisma,
  crypto:{ randomUUID:() => 'anonymous' },
  sessionProvider:async () => null,
  storageProvider:storage,
})
const anonymousResponse = response()
await anonymous.handle(
  request('DELETE'),
  anonymousResponse,
  new URL('http://localhost/api/admin/customers/customer-1/chart-photos/missing'),
)
assert.equal(anonymousResponse.statusCode, 401)

console.log(JSON.stringify({
  release:'customer-chart-attachment-delete-v567',
  scopedDelete:true,
  storageFirst:true,
  retrySafety:true,
  originGuard:true,
  authorization:true,
  uploadRegression:true,
}))
