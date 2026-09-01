'use strict'

const assert = require('node:assert/strict')
const { Readable } = require('node:stream')
const sharp = require('sharp')
const { createCustomerHomeBrandingService, DEFAULT_PHRASE } = require('./customer-home-branding-v528')

const records = new Map()
const prisma = {
  async $executeRawUnsafe(sql, ...args) {
    if (/CREATE TABLE IF NOT EXISTS/.test(sql)) return 0
    if (/INSERT INTO "CustomerHomeBranding"/.test(sql)) {
      records.set(args[0], {
        organizationId: args[0],
        phrase: args[1],
        imageKey: args[2],
        updatedByStaffId: args[3],
        updatedAt: new Date('2026-09-02T03:00:00.000Z'),
      })
      return 1
    }
    if (/DELETE FROM "CustomerHomeBranding"/.test(sql)) return records.delete(args[0]) ? 1 : 0
    throw new Error(`Unexpected execute query: ${sql}`)
  },
  async $queryRawUnsafe(sql, organizationId) {
    if (/FROM "CustomerHomeBranding"/.test(sql)) {
      const record = records.get(organizationId)
      return record ? [{ phrase: record.phrase, imageKey: record.imageKey, updatedAt: record.updatedAt }] : []
    }
    throw new Error(`Unexpected select query: ${sql}`)
  },
}

const objects = new Map()
const s3Calls = []
const s3Client = {
  async send(command) {
    const type = command.constructor.name
    const input = command.input
    s3Calls.push({ type, input })
    if (type === 'PutObjectCommand') {
      objects.set(input.Key, { body: Buffer.from(input.Body), contentType: input.ContentType })
      return {}
    }
    if (type === 'DeleteObjectCommand') {
      objects.delete(input.Key)
      return {}
    }
    if (type === 'GetObjectCommand') {
      const object = objects.get(input.Key)
      if (!object) throw Object.assign(new Error('not found'), { name: 'NoSuchKey' })
      return { Body: object.body, ContentType: object.contentType, ContentLength: object.body.length, ETag: '"fixture"' }
    }
    throw new Error(`Unexpected S3 command: ${type}`)
  },
}

let staffActor = null
let customerActor = null
const service = createCustomerHomeBrandingService({
  prisma,
  s3Client,
  staffSession: async () => staffActor,
  customerSession: async () => customerActor,
  json(res, status, payload) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  },
})

function request(method, pathname, body = null, contentType = 'application/json') {
  const value = body == null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body))
  const req = Readable.from(value.length ? [value] : [])
  req.method = method
  req.url = pathname
  req.headers = { host: 'salon-de-lien.com', 'content-type': contentType, 'content-length': String(value.length), origin: 'https://salon-de-lien.com' }
  return req
}

function response() {
  return {
    statusCode: 200,
    headers: {},
    body: Buffer.alloc(0),
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = String(value) },
    end(value) { this.body = value == null ? Buffer.alloc(0) : Buffer.from(value) },
  }
}

async function invoke(method, pathname, body, contentType) {
  const req = request(method, pathname, body, contentType)
  const res = response()
  const handled = await service.handle(req, res, new URL(pathname, 'https://salon-de-lien.com'))
  let payload = null
  if ((res.headers['content-type'] || '').startsWith('application/json') && res.body.length) payload = JSON.parse(res.body.toString('utf8'))
  return { handled, req, res, payload }
}

async function run() {
  process.env.S3_PRIVATE_ASSETS_BUCKET = 'orimia-private-fixture'
  await service.ensureSchema()

  staffActor = { organizationId: 'org-a', userId: 'owner-a', role: 'ADMIN' }
  let result = await invoke('GET', '/api/lien-customer-home-branding?audience=staff')
  assert.equal(result.handled, true)
  assert.equal(result.res.statusCode, 200)
  assert.equal(result.payload.branding.phrase, DEFAULT_PHRASE)
  assert.equal(result.payload.branding.imageUrl, '/brand/salon-interior-illustrated.png')
  assert.equal(result.payload.branding.isDefault, true)

  result = await invoke('PUT', '/api/lien-customer-home-branding', { phrase: 'あなたらしい、\n美しさへ。', imageKey: null })
  assert.equal(result.res.statusCode, 200)
  assert.equal(result.payload.branding.phrase, 'あなたらしい、\n美しさへ。')
  assert.equal(records.get('org-a').updatedByStaffId, 'owner-a')

  staffActor = { organizationId: 'org-b', userId: 'staff-b', role: 'STAFF' }
  result = await invoke('PUT', '/api/lien-customer-home-branding', { phrase: '変更できない' })
  assert.equal(result.res.statusCode, 403)
  assert.equal(records.has('org-b'), false)

  staffActor = { organizationId: 'org-a', userId: 'owner-a', role: 'ADMIN' }
  const image = await sharp({ create: { width: 48, height: 64, channels: 3, background: '#cf7891' } }).png().toBuffer()
  result = await invoke('POST', '/api/lien-customer-home-branding/image', image, 'image/png')
  assert.equal(result.res.statusCode, 201)
  assert.match(result.payload.imageKey, /^private\/customer-home-branding\/org-a\/[a-f0-9-]+\.jpg$/)
  const uploadedKey = result.payload.imageKey
  const uploaded = objects.get(uploadedKey)
  const metadata = await sharp(uploaded.body).metadata()
  assert.equal(metadata.width, 1600)
  assert.equal(metadata.height, 900)
  assert.equal(metadata.format, 'jpeg')

  result = await invoke('PUT', '/api/lien-customer-home-branding', { phrase: '店舗Aの美しさ', imageKey: uploadedKey })
  assert.equal(result.res.statusCode, 200)
  assert.equal(result.payload.branding.imageKey, uploadedKey)
  assert.match(result.payload.branding.imageUrl, /audience=staff/)

  customerActor = { organizationId: 'org-a', customerId: 'customer-a' }
  result = await invoke('GET', '/api/lien-customer-home-branding?audience=customer')
  assert.equal(result.res.statusCode, 200)
  assert.equal(result.payload.branding.phrase, '店舗Aの美しさ')
  assert.equal(result.payload.branding.imageKey, null)
  assert.match(result.payload.branding.imageUrl, /audience=customer/)
  result = await invoke('GET', '/api/lien-customer-home-branding/image?audience=customer')
  assert.equal(result.res.statusCode, 200)
  assert.equal(result.res.headers['content-type'], 'image/jpeg')
  assert.equal(result.res.body.length, uploaded.body.length)

  customerActor = { organizationId: 'org-b', customerId: 'customer-b' }
  result = await invoke('GET', '/api/lien-customer-home-branding/image?audience=customer')
  assert.equal(result.res.statusCode, 404)

  staffActor = { organizationId: 'org-a', userId: 'owner-a', role: 'ADMIN' }
  result = await invoke('PUT', '/api/lien-customer-home-branding', { reset: true })
  assert.equal(result.res.statusCode, 200)
  assert.equal(result.payload.branding.isDefault, true)
  assert.equal(records.has('org-a'), false)
  assert.equal(objects.has(uploadedKey), false)
  assert.ok(s3Calls.some(call => call.type === 'DeleteObjectCommand' && call.input.Key === uploadedKey))

  staffActor = null
  result = await invoke('GET', '/api/lien-customer-home-branding?audience=staff')
  assert.equal(result.res.statusCode, 401)

  console.log(JSON.stringify({ release: 'customer-home-branding-v528', serviceVerified: true, s3Calls: s3Calls.length }))
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
