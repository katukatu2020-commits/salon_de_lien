import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { Readable } from 'node:stream'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(import.meta.url)
const { createCustomerCampaignService } = require(`${root}/customer-campaigns-v427.js`)

const calls = []
const campaignRow = {
  id: 'campaign-before-new-customer',
  organizationId: 'org-a',
  title: '全顧客向けキャンペーン',
  summary: '新規登録後にも表示',
  body: '店舗を登録した方全員が対象です。',
  imageKey: null,
  targetMenu: null,
  discountRate: null,
  startsAt: new Date('2026-08-01T00:00:00.000Z'),
  endsAt: new Date('2026-12-01T00:00:00.000Z'),
  status: 'published',
}

const prisma = {
  async $executeRawUnsafe(sql, ...params) {
    calls.push({ type: 'execute', sql, params })
    return 1
  },
  async $queryRawUnsafe(sql, ...params) {
    calls.push({ type: 'query', sql, params })
    if (sql.includes('SELECT c.*') && sql.includes('FROM "CustomerCampaign" c')) return [campaignRow]
    if (sql.includes('SELECT "id" FROM "Customer"')) return []
    if (sql.includes('COUNT(*)::int AS count')) return [{ count: 0 }]
    if (sql.includes('SELECT "id" FROM "CustomerCampaign"')) return [{ id: campaignRow.id }]
    return []
  },
  async $transaction(callback) {
    return callback(this)
  },
}

let rendered = ''
const service = createCustomerCampaignService({
  prisma,
  customerSession: async () => ({ role: 'CUSTOMER', customerId: 'new-customer', organizationId: 'org-a' }),
  staffSession: async () => ({ role: 'ADMIN', userId: 'owner-a', organizationId: 'org-a' }),
  json(res, status, value) {
    res.statusCode = status
    res.payload = value
  },
  sendCustomerHtml(res, html) {
    res.statusCode = 200
    rendered = html
  },
  customerShell: ({ body }) => body,
  customerIcon: () => '<svg></svg>',
  htmlEscape: value => String(value),
  jpDate: value => new Date(value).toISOString().slice(0, 10),
})

const active = await service.activeCampaignsForCustomer({ customerId: 'new-customer', organizationId: 'org-a' })
assert.equal(active.length, 1)
const activeCall = calls.find(call => call.type === 'query' && call.sql.includes('SELECT c.*'))
assert.deepEqual(activeCall.params, ['org-a'])
assert.ok(!activeCall.sql.includes('CustomerCampaignRecipient'))

const pageResponse = {}
await service.handle({ method: 'GET', headers: {} }, pageResponse, new URL('https://example.test/u/campaigns'))
assert.equal(pageResponse.statusCode, 200)
assert.match(rendered, /全顧客向けキャンペーン/)
assert.ok(calls.some(call => call.type === 'execute' && call.sql.includes('ON CONFLICT ("campaignId","customerId") DO UPDATE')))

const requestPayload = {
  title: '全員向けお知らせ',
  summary: '店舗登録者全員に公開',
  body: '性別や年齢に関係なく表示します。',
  startsAt: '2026-09-01T00:00:00.000Z',
  endsAt: '2026-10-01T00:00:00.000Z',
  audienceGender: 'female',
  audienceMinAge: '40',
  audienceMaxAge: '49',
}
const createRequest = Readable.from([Buffer.from(JSON.stringify(requestPayload), 'utf8')])
createRequest.method = 'POST'
createRequest.headers = { host: 'example.test', origin: 'https://example.test' }
const createResponse = {}
await service.handle(createRequest, createResponse, new URL('https://example.test/api/lien-campaigns'))
assert.equal(createResponse.statusCode, 201)
assert.equal(createResponse.payload.recipientCount, 0)
const insert = calls.find(call => call.type === 'execute' && call.sql.includes('INSERT INTO "CustomerCampaign"'))
assert.ok(insert)
assert.deepEqual(insert.params.slice(11, 14), [null, null, null])

console.log('storewide-campaigns-v498 behavior tests passed')
