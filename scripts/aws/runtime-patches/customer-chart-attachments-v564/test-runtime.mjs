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
} = requireFromApp('./customer-chart-attachments-v564.js')

const landscape = await sharp({
  create:{ width:640, height:360, channels:3, background:{ r:244, g:238, b:232 } },
}).png().toBuffer()
const inspectedImage = await __test.inspectAttachment(landscape, 'image/png')
assert.equal(inspectedImage.kind, 'image')
assert.equal(inspectedImage.contentType, 'image/png')
assert.equal(inspectedImage.width, 640)
assert.equal(inspectedImage.height, 360)
assert.deepEqual(inspectedImage.body, landscape)

const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n')
const inspectedPdf = await __test.inspectAttachment(pdf, 'application/pdf')
assert.equal(inspectedPdf.kind, 'pdf')
assert.equal(inspectedPdf.contentType, 'application/pdf')
assert.deepEqual(inspectedPdf.body, pdf)

await assert.rejects(() => __test.inspectAttachment(pdf, 'image/png'), /種類と内容/)
await assert.rejects(() => __test.inspectAttachment(Buffer.from('<html>not a file</html>'), 'application/octet-stream'), /読み込めません/)
assert.equal(__test.chartAttachmentRoute('/api/admin/customers/customer-1/chart-photos'), 'customer-1')
assert.equal(__test.chartAttachmentRoute('/api/admin/customers/customer-1/other'), null)
assert.equal(__test.inferContentType('s3-private://private/customer-chart-photos/a/b/file.pdf', 'record'), 'application/pdf')
assert.equal(__test.inferContentType('s3-private://private/customer-chart-photos/a/b/legacy.jpg', 'legacy.png'), 'image/jpeg')
assert.equal(__test.normalizedFileName('legacy.png', 'image/jpeg'), 'legacy.jpg')
assert.match(__test.contentDisposition('attachment', '手書きカルテ 1.pdf'), /^attachment; filename=/)
assert.match(__test.contentDisposition('attachment', '手書きカルテ 1.pdf'), /filename\*=UTF-8''/)

const records = []
const uploads = []
let uuid = 0
const prisma = {
  async $executeRawUnsafe() { return 0 },
  async $queryRawUnsafe(query, ...params) {
    if (query.startsWith('SELECT "id","name" FROM "Customer"')) {
      return params[0] === 'customer-1' && params[1] === 'organization-1' ? [{ id:'customer-1', name:'顧客 一郎' }] : []
    }
    if (query.startsWith('SELECT COUNT(*)::int')) {
      return [{ count:records.filter(row => row.organizationId === params[0] && row.customerId === params[1]).length }]
    }
    if (query.startsWith('SELECT "id","storageReference"')) {
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
        createdAt:new Date(`2026-09-06T10:0${records.length}:00.000Z`),
      }
      records.push(row)
      return [row]
    }
    throw new Error(`Unexpected query: ${query.slice(0, 100)}`)
  },
}
const storage = {
  async upload(key, body, options) {
    uploads.push({ key, body, options })
    return `s3-private://${key}`
  },
  async getReadUrl(reference, options) {
    return `https://private.example/${encodeURIComponent(reference)}?mode=${options.download ? 'download' : 'inline'}&type=${encodeURIComponent(options.contentType)}`
  },
  async delete() {},
}
const service = createCustomerChartAttachmentsService({
  prisma,
  crypto:{ randomUUID:() => `uuid-${++uuid}` },
  sessionProvider:async () => ({
    role:'ADMIN',
    organizationId:'organization-1',
    userId:'owner-1',
    displayName:'店舗オーナー',
  }),
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

async function handle(method, body, headers = {}, query = '') {
  const res = response()
  const handled = await service.handle(
    request(method, body, headers),
    res,
    new URL(`http://localhost/api/admin/customers/customer-1/chart-photos${query}`),
  )
  assert.equal(handled, true)
  return { res, data:res.body ? JSON.parse(res.body) : null }
}

let result = await handle('GET', null, {}, '?limit=10')
assert.equal(result.res.statusCode, 200)
assert.equal(result.data.count, 0)

result = await handle('POST', landscape, {
  'content-type':'image/png',
  'content-length':String(landscape.length),
  'x-file-name':encodeURIComponent('横長カルテ.png'),
})
assert.equal(result.res.statusCode, 201)
assert.equal(result.data.item.contentType, 'image/png')
assert.equal(result.data.item.kind, 'image')
assert.match(result.data.item.downloadUrl, /mode=download/)
assert.match(uploads[0].key, /\.png$/)
assert.equal(uploads[0].options.contentType, 'image/png')
assert.deepEqual(uploads[0].body, landscape)

result = await handle('POST', pdf, {
  'content-type':'application/pdf',
  'content-length':String(pdf.length),
  'x-file-name':encodeURIComponent('紙カルテ.pdf'),
})
assert.equal(result.res.statusCode, 201)
assert.equal(result.data.item.contentType, 'application/pdf')
assert.equal(result.data.item.kind, 'pdf')
assert.match(uploads[1].key, /\.pdf$/)
assert.equal(uploads[1].options.contentType, 'application/pdf')

result = await handle('GET', null, {}, '?limit=10')
assert.equal(result.res.statusCode, 200)
assert.equal(result.data.count, 2)
assert.equal(result.data.items[0].originalFileName, '紙カルテ.pdf')
assert.equal(result.data.items[1].originalFileName, '横長カルテ.png')
assert.ok(result.data.items.every(item => item.url.includes('mode=inline')))
assert.ok(result.data.items.every(item => item.downloadUrl.includes('mode=download')))

result = await handle('POST', landscape, {
  origin:'https://attacker.example',
  'content-type':'image/png',
  'content-length':String(landscape.length),
})
assert.equal(result.res.statusCode, 403)

console.log(JSON.stringify({
  release:'customer-chart-attachments-v564',
  landscapeImage:true,
  pdf:true,
  privateLinks:true,
  originGuard:true,
}))
