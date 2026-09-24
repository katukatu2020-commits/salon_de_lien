import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import path from 'node:path'
import { Readable } from 'node:stream'
import { createRequire } from 'node:module'

const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(import.meta.url)
const { createWholesaleOrderingService } = require(path.join(runtimeRoot, 'wholesale-ordering-v543.js'))

process.env.DEALER_AUTH_SECRET = 'v658-service-regression-secret-0123456789-abcdef'

const executed = []
const queried = []
let plan = { salesTargetYen: 900000n, newAcquisitionCount: 7, updatedAt: new Date('2026-09-01T00:00:00.000Z') }

const prisma = {
  async $executeRawUnsafe(sql, ...values) {
    executed.push({ sql, values })
    if (sql.includes('INSERT INTO "WholesaleDealerMonthlyPlan"')) {
      plan = {
        salesTargetYen: BigInt(values[2]),
        newAcquisitionCount: Number(values[3]),
        updatedAt: new Date('2026-09-25T00:00:00.000Z'),
      }
    }
    return 1
  },
  async $queryRawUnsafe(sql, ...values) {
    queried.push({ sql, values })
    if (sql.includes('FROM "WholesaleDealer" WHERE "id"=$1')) {
      return [{
        id: 'dealer-v658',
        name: 'スーパーヤマモト',
        loginId: 'yamamoto',
        authVersion: 1,
        dealerCode: 'DLR-YAMAMOTO',
      }]
    }
    if (sql.includes("TO_CHAR(o.\"orderedAt\" AT TIME ZONE 'Asia/Tokyo'")) {
      return [
        { dayKey: '2026-09-03', invoiceCount: 2, forecastYen: 165000n },
        { dayKey: '2026-09-18', invoiceCount: 1, forecastYen: 44000n },
      ]
    }
    if (sql.includes('FROM "WholesaleDealerMonthlyPlan"')) return [plan]
    throw new Error(`Unexpected query: ${sql}`)
  },
}

const service = createWholesaleOrderingService({
  prisma,
  crypto,
  adminSessionProvider: async () => null,
})

function sessionToken() {
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    dealerId: 'dealer-v658',
    loginId: 'yamamoto',
    authVersion: 1,
    issuedAt,
    expiresAt: issuedAt + 3600,
    sessionId: 'service-regression',
  })).toString('base64url')
  const signature = crypto.createHmac('sha256', process.env.DEALER_AUTH_SECRET).update(payload).digest('base64url')
  return payload + '.' + signature
}

function request(method, body) {
  const stream = Readable.from(body == null ? [] : [Buffer.from(JSON.stringify(body))])
  stream.method = method
  stream.headers = {
    host: 'salon-de-lien.com',
    cookie: `orimia_dealer_session=${encodeURIComponent(sessionToken())}`,
    origin: 'https://salon-de-lien.com',
    'content-type': 'application/json',
  }
  return stream
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value = '') { this.body += Buffer.isBuffer(value) ? value.toString('utf8') : String(value) },
  }
}

const getResponse = response()
const getUrl = new URL('https://salon-de-lien.com/api/dealer/calendar?month=2026-09')
assert.equal(await service.handle(request('GET'), getResponse, getUrl), true)
assert.equal(getResponse.statusCode, 200)
const initial = JSON.parse(getResponse.body)
assert.equal(initial.calendar.monthKey, '2026-09')
assert.equal(initial.calendar.invoiceCount, 3)
assert.equal(initial.calendar.monthlyForecastYen, 209000)
assert.equal(initial.calendar.salesTargetYen, 900000)
assert.equal(initial.calendar.newAcquisitionCount, 7)

const aggregationQuery = queried.find(entry => entry.sql.includes('TO_CHAR'))
assert.ok(aggregationQuery)
assert.match(aggregationQuery.sql, /o\."status"<>'CANCELLED'/)
assert.match(aggregationQuery.sql, /AT TIME ZONE 'Asia\/Tokyo'/)
assert.equal(aggregationQuery.values[1], '2026-08-31T15:00:00.000Z')
assert.equal(aggregationQuery.values[2], '2026-09-30T15:00:00.000Z')
assert.ok(executed.some(entry => entry.sql.includes('CREATE TABLE IF NOT EXISTS "WholesaleDealerMonthlyPlan"')))

const postResponse = response()
const postUrl = new URL('https://salon-de-lien.com/api/dealer/calendar/targets')
assert.equal(await service.handle(request('POST', {
  monthKey: '2026-09',
  salesTargetYen: 1500000,
  newAcquisitionCount: 12,
}), postResponse, postUrl), true)
assert.equal(postResponse.statusCode, 200)
const saved = JSON.parse(postResponse.body)
assert.equal(saved.calendar.salesTargetYen, 1500000)
assert.equal(saved.calendar.newAcquisitionCount, 12)
assert.ok(executed.some(entry => entry.sql.includes('ON CONFLICT ("dealerId","monthKey") DO UPDATE')))

const invalidResponse = response()
const invalidUrl = new URL('https://salon-de-lien.com/api/dealer/calendar?month=2026-13')
assert.equal(await service.handle(request('GET'), invalidResponse, invalidUrl), true)
assert.equal(invalidResponse.statusCode, 400)
assert.match(JSON.parse(invalidResponse.body).error, /対象月/)

console.log(JSON.stringify({
  release: 'dealer-monthly-calendar-v658',
  serviceVerified: true,
  monthlyForecastYen: initial.calendar.monthlyForecastYen,
  planSaved: true,
  invalidMonthRejected: true,
}))
