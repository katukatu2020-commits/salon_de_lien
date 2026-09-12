import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  parsePublicInquiry,
  renderBusinessContactForm,
  renderPlatformInbox,
  createBusinessInquiryService,
} = require('./business-inquiries-v637.js')

const validBody = new URLSearchParams({
  audience: 'salon',
  sourcePath: '/business/salon',
  organizationName: 'Salon Demo',
  contactName: '山田 花子',
  email: 'Owner@Example.com',
  phone: '090-1234-5678',
  preferredContact: 'email',
  message: '店舗への導入方法と契約内容について相談したいです。',
  privacyAccepted: '1',
})

const parsed = parsePublicInquiry(validBody)
assert.equal(parsed.valid, true)
assert.equal(parsed.email, 'owner@example.com')
assert.equal(parsed.sourcePath, '/business/salon')
assert.equal(parsePublicInquiry(new URLSearchParams({ ...Object.fromEntries(validBody), email: 'invalid' })).valid, false)
assert.equal(parsePublicInquiry(new URLSearchParams({ ...Object.fromEntries(validBody), sourcePath: 'https://evil.example/' })).sourcePath, '/business/salon')

const salonForm = renderBusinessContactForm({ audience: 'salon', status: 'sent' })
assert.match(salonForm, /id="contact"/)
assert.match(salonForm, /action="\/api\/public\/business-inquiries"/)
assert.match(salonForm, /name="audience" value="salon"/)
assert.match(salonForm, /お問い合わせを受け付けました/)
assert.match(salonForm, />相談内容を送信</)
assert.doesNotMatch(salonForm, /ないよう/)
const rootForm = renderBusinessContactForm({ audience: 'other' })
assert.match(rootForm, /name="audience"/)
assert.match(rootForm, /美容室として相談/)

const writes = []
const requestKeys = new Set()
const prisma = {
  async $executeRawUnsafe(sql, ...params) {
    writes.push({ sql, params })
    if (sql.startsWith('INSERT INTO')) {
      if (requestKeys.has(params[1])) return 0
      requestKeys.add(params[1])
      return 1
    }
    return sql.startsWith('UPDATE ') ? 1 : 0
  },
  async $queryRawUnsafe(sql) {
    if (sql.startsWith('SELECT COUNT(*)::int AS "count"')) return [{ count: 1 }]
    if (sql.startsWith('SELECT *')) return [{
      id: 'binq_demo', audience: 'salon', organizationName: 'Salon Demo', contactName: '山田 花子',
      email: 'owner@example.com', phone: '090-1234-5678', preferredContact: 'email', message: '導入について相談したいです。',
      sourcePath: '/business/salon', status: 'new', operatorNote: null, createdAt: new Date('2026-09-12T00:00:00Z'),
    }]
    return [{ total: 1, newCount: 1, inProgressCount: 0, closedCount: 0 }]
  },
}
const service = createBusinessInquiryService({ prisma, crypto })

function request(body, headers = {}) {
  const req = Readable.from([body])
  req.method = 'POST'
  req.headers = { host: 'localhost:3000', origin: 'https://localhost:3000', 'x-forwarded-proto': 'https', ...headers }
  req.socket = { remoteAddress: '127.0.0.1' }
  return req
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end() { this.ended = true },
  }
}

const publicResponse = response()
assert.equal(await service.handlePublic(request(validBody.toString()), publicResponse, new URL('https://localhost:3000/api/public/business-inquiries')), true)
assert.equal(publicResponse.statusCode, 303)
assert.equal(publicResponse.headers.location, '/business/salon?inquiry=sent#contact')
assert.equal(writes.filter(item => item.sql.startsWith('INSERT INTO')).length, 1)
const duplicate = await service.createInquiry(parsed)
assert.equal(duplicate.inserted, false)

const invalidResponse = response()
await service.handlePublic(request('audience=salon&sourcePath=%2Fbusiness%2Fsalon'), invalidResponse, new URL('https://localhost:3000/api/public/business-inquiries'))
assert.equal(invalidResponse.headers.location, '/business/salon?inquiry=invalid#contact')
assert.equal(writes.filter(item => item.sql.startsWith('INSERT INTO')).length, 2)

const inbox = await service.listInquiries({ status: 'new', audience: 'salon', query: 'Demo' })
const inboxHtml = renderPlatformInbox({ ...inbox, rows: [{ ...inbox.rows[0], organizationName: '<script>alert(1)</script>' }] }, (title, body) => `<title>${title}</title>${body}`)
assert.match(inboxHtml, /導入相談/)
assert.match(inboxHtml, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
assert.doesNotMatch(inboxHtml, /<script>alert/)
assert.match(inboxHtml, /対応状況/)

assert.equal(await service.updateInquiry({ id: 'binq_demo', status: 'closed', operatorNote: '対応済み' }), true)
assert.equal(await service.updateInquiry({ id: 'binq_demo', status: 'invalid', operatorNote: '' }), false)

console.log(JSON.stringify({ release: 'business-inquiries-v637', validation: true, publicSubmission: true, duplicateProtection: true, platformInbox: true, escaping: true }))
