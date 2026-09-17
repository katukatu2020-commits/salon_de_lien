import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import path from 'node:path'
import { Readable } from 'node:stream'
import { createRequire } from 'node:module'

const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const runtimeRequire = createRequire(path.join(runtimeRoot, 'server.js'))
const {
  parsePublicInquiry,
  renderBusinessContactForm,
  renderPlatformInbox,
  createBusinessInquiryService,
} = runtimeRequire('./business-inquiries-v637.js')

function body(overrides = {}) {
  return new URLSearchParams({
    audience: 'salon',
    sourcePath: '/business/salon',
    organizationName: 'Salon Integration',
    contactName: '山田 花子',
    email: 'owner@example.jp',
    phone: '090-1234-5678',
    preferredContact: 'either',
    message: '新規利用について詳しい案内を希望しています。',
    privacyAccepted: '1',
    ...overrides,
  })
}

assert.equal(parsePublicInquiry(body()).valid, true)
assert.equal(parsePublicInquiry(body({ audience: 'dealer' })).valid, true)
assert.equal(parsePublicInquiry(body({ phone: '' })).valid, false)
assert.equal(parsePublicInquiry(body({ phone: '123' })).valid, false)
assert.equal(parsePublicInquiry(body({ audience: 'other' })).valid, false)
assert.equal(parsePublicInquiry(body({ audience: 'dealer', sourcePath: '/business/salon' })).sourcePath, '/business/dealer')

for (const [audience, expected] of [['salon', 'salon'], ['dealer', 'dealer'], ['other', '']]) {
  const html = renderBusinessContactForm({ audience })
  assert.match(html, /<select name="audience" required>/)
  assert.doesNotMatch(html, /type="hidden" name="audience"/)
  assert.match(html, /<option value="salon"/)
  assert.match(html, /<option value="dealer"/)
  assert.doesNotMatch(html, /<option value="other"/)
  assert.match(html, /name="phone"[^>]* required>/)
  const selected = html.match(/<option value="(salon|dealer)" selected>/)?.[1] || ''
  assert.equal(selected, expected)
}

const writes = []
const prisma = {
  async $executeRawUnsafe(sql, ...params) {
    writes.push({ sql: String(sql), params })
    return String(sql).startsWith('INSERT INTO') ? 1 : 0
  },
  async $queryRawUnsafe() { return [] },
}
const service = createBusinessInquiryService({ prisma, crypto })

function request(payload) {
  const req = Readable.from([payload])
  req.method = 'POST'
  req.headers = { host: 'localhost:3000', origin: 'https://localhost:3000', 'x-forwarded-proto': 'https' }
  req.socket = { remoteAddress: '127.0.0.1' }
  return req
}
function response() {
  return { statusCode: 0, headers: {}, setHeader(name, value) { this.headers[String(name).toLowerCase()] = value }, end() { this.ended = true } }
}

const validResponse = response()
await service.handlePublic(request(body({ audience: 'dealer', sourcePath: '/business/salon' }).toString()), validResponse, new URL('https://localhost:3000/api/public/business-inquiries'))
assert.equal(validResponse.statusCode, 303)
assert.equal(validResponse.headers.location, '/business/dealer?inquiry=sent#contact')
assert.equal(writes.filter(write => write.sql.startsWith('INSERT INTO')).length, 1)
assert.equal(writes.find(write => write.sql.startsWith('INSERT INTO')).params[6], '090-1234-5678')

const missingPhoneResponse = response()
await service.handlePublic(request(body({ phone: '' }).toString()), missingPhoneResponse, new URL('https://localhost:3000/api/public/business-inquiries'))
assert.equal(missingPhoneResponse.headers.location, '/business/salon?inquiry=invalid#contact')
assert.equal(writes.filter(write => write.sql.startsWith('INSERT INTO')).length, 1)

const historicalHtml = renderPlatformInbox({
  rows: [{ id: 'historical', audience: 'other', organizationName: 'Historical Company', contactName: '担当者', email: 'old@example.jp', phone: null, preferredContact: 'email', message: '既存の問い合わせデータです。', status: 'closed', createdAt: new Date('2026-01-01T00:00:00Z') }],
  total: 1, stats: { total: 1 }, status: 'all', audience: 'all', query: '', page: 1, pageSize: 30,
}, (title, content) => `<title>${title}</title>${content}`)
assert.match(historicalHtml, /Historical Company/)

console.log(JSON.stringify({ release: 'business-application-phone-type-v651', parser: true, persistence: true, phoneRequired: true, applicationTypes: ['salon', 'dealer'], historicalInquiryCompatibility: true }))
