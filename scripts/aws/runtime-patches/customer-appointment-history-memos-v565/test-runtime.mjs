import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { createRequire } from 'node:module'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const require = createRequire(import.meta.url)
const serviceModule = require(path.join(root, 'customer-appointment-history-v565.js'))
const { createCustomerAppointmentHistoryService, __test } = serviceModule

assert.deepEqual(__test.historyRoute('/api/admin/customers/customer-1/visit-history'), { customerId:'customer-1', memo:false })
assert.deepEqual(__test.historyRoute('/api/admin/customers/customer-1/visit-history/memo'), { customerId:'customer-1', memo:true })
assert.equal(__test.historyRoute('/api/admin/customers/customer-1/visit-history/other'), null)
assert.equal(__test.historyDateKey(new Date('2026-09-06T15:30:00.000Z')), '2026-09-07')
assert.equal(__test.displayDate(new Date('2026-09-06T15:30:00.000Z')), '2026/09/07')
assert.equal(__test.isActiveAppointment({ status:'予約確定', hasSale:false }), true)
assert.equal(__test.isActiveAppointment({ status:'来店済み', hasSale:false }), false)
assert.equal(__test.isActiveAppointment({ status:'キャンセル済み', hasSale:false }), false)
assert.equal(__test.isActiveAppointment({ status:'来店完了', hasSale:false }), false)
assert.equal(__test.isActiveAppointment({ status:'会計完了', hasSale:false }), false)
assert.equal(__test.isActiveAppointment({ status:'予約確定', hasSale:true }), false)

const completedFixture = __test.buildCompletedHistory(
  [{ id:'visit-1', visitedAt:new Date('2026-09-05T01:00:00.000Z') }],
  [
    { id:'sale-1', appointmentId:'appointment-linked', paidAt:new Date('2026-09-05T02:00:00.000Z'), scheduledAt:new Date('2026-09-05T01:00:00.000Z') },
    { id:'sale-2', appointmentId:null, paidAt:new Date('2026-08-01T01:00:00.000Z'), scheduledAt:null },
  ],
)
assert.equal(completedFixture.length, 2)
assert.equal(completedFixture[0].subjectKeys[0], 'APPOINTMENT:appointment-linked')
assert.equal(completedFixture[1].subjectKeys[0], 'SALE:sale-2')

const customer = { id:'customer-1', name:'テスト顧客' }
const appointmentRows = [
  {
    id:'appointment-current', scheduledAt:new Date('2026-09-10T01:00:00.000Z'), durationMinutes:90,
    menu:'カット + カラー', staffName:'雨宮 透', estimatedPrice:12000, status:'予約確定', source:'phone', note:'前髪を相談',
    hasSale:false, createdAt:new Date(), updatedAt:new Date(),
  },
  {
    id:'appointment-cancelled', scheduledAt:new Date('2026-09-11T01:00:00.000Z'), status:'キャンセル', hasSale:false,
    durationMinutes:null, menu:null, staffName:null, estimatedPrice:null, source:null, note:null,
  },
  {
    id:'appointment-linked', scheduledAt:new Date('2026-09-05T01:00:00.000Z'), status:'来店済み', hasSale:true,
    durationMinutes:60, menu:'カット', staffName:'雨宮 透', estimatedPrice:5500, source:'salon-register', note:null,
  },
]
const visitRows = [{ id:'visit-1', visitedAt:new Date('2026-09-05T01:00:00.000Z') }]
const saleRows = [{ id:'sale-1', appointmentId:'appointment-linked', paidAt:new Date('2026-09-05T02:00:00.000Z'), amount:5500, scheduledAt:new Date('2026-09-05T01:00:00.000Z') }]
const memoRows = [
  { subjectKey:'APPOINTMENT:appointment-current', body:'予約前メモ', updatedByName:'店舗オーナー', updatedAt:new Date('2026-09-06T01:00:00.000Z') },
  { subjectKey:'APPOINTMENT:appointment-linked', body:'施術済みメモ', updatedByName:'雨宮 透', updatedAt:new Date('2026-09-05T04:00:00.000Z') },
]

function createPrisma() {
  const calls = { execute:[], query:[] }
  const prisma = {
    async $executeRawUnsafe(sql, ...params) {
      calls.execute.push({ sql, params })
      return 1
    },
    async $queryRawUnsafe(sql, ...params) {
      calls.query.push({ sql, params })
      if (sql.includes('FROM "Customer" WHERE')) return params[0] === customer.id && params[1] === 'org-1' ? [customer] : []
      if (sql.includes('EXISTS(SELECT 1 FROM "ServiceSale" linked')) return appointmentRows
      if (sql.includes('FROM "Visit" v')) return visitRows
      if (sql.includes('FROM "ServiceSale" s') && sql.includes('LEFT JOIN "Appointment"')) return saleRows
      if (sql.includes('FROM "CustomerHistoryMemo"')) return memoRows.filter(row => params[1].includes(row.subjectKey))
      if (sql.includes('SELECT entity."id"')) return params[1] === customer.id && params[2] === 'org-1' ? [{ id:params[0] }] : []
      if (sql.includes('INSERT INTO "CustomerHistoryMemo"')) {
        return [{ body:params[2], updatedByName:params[4], updatedAt:new Date('2026-09-06T05:00:00.000Z') }]
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
  }
  return { prisma, calls }
}

function response() {
  return {
    statusCode:0,
    headers:{},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(value = '') { this.body = value },
  }
}

function request(method, pathname, body, origin = 'https://salon-de-lien.com') {
  const payload = body == null ? [] : [Buffer.from(JSON.stringify(body))]
  const req = Readable.from(payload)
  req.method = method
  req.headers = { host:'salon-de-lien.com', origin, 'x-forwarded-proto':'https' }
  req.socket = {}
  return { req, url:new URL(`https://salon-de-lien.com${pathname}`) }
}

const session = { userId:'user-1', organizationId:'org-1', role:'ADMIN', displayName:'店舗オーナー' }
const fixture = createPrisma()
const service = createCustomerAppointmentHistoryService({ prisma:fixture.prisma, sessionProvider:async () => session })

{
  const { req, url } = request('GET', '/api/admin/customers/customer-1/visit-history')
  const res = response()
  assert.equal(await service.handle(req, res, url), true)
  assert.equal(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.equal(body.ok, true)
  assert.equal(body.totalCount, 2)
  assert.equal(body.appointments.length, 1)
  assert.equal(body.appointments[0].id, 'appointment-current')
  assert.equal(body.appointments[0].bookingNote, '前髪を相談')
  assert.equal(body.appointments[0].memo.body, '予約前メモ')
  assert.equal(body.completed.length, 1)
  assert.equal(body.completed[0].subjectKey, 'APPOINTMENT:appointment-linked')
  assert.equal(body.completed[0].memo.body, '施術済みメモ')
}

{
  const { req, url } = request('PUT', '/api/admin/customers/customer-1/visit-history/memo', {
    subjectKey:'APPOINTMENT:appointment-current', body:'  薬剤配合を次回確認  ',
  })
  const res = response()
  await service.handle(req, res, url)
  assert.equal(res.statusCode, 200)
  const body = JSON.parse(res.body)
  assert.equal(body.memo.body, '薬剤配合を次回確認')
  assert.equal(body.memo.updatedByName, '店舗オーナー')
  assert.ok(fixture.calls.query.some(call => call.sql.includes('ON CONFLICT ("organizationId","subjectKey")')))
}

{
  const beforeQueries = fixture.calls.query.length
  const { req, url } = request('PUT', '/api/admin/customers/customer-1/visit-history/memo', {
    subjectKey:'APPOINTMENT:appointment-current', body:'拒否される内容',
  }, 'https://evil.example')
  const res = response()
  await service.handle(req, res, url)
  assert.equal(res.statusCode, 403)
  assert.equal(fixture.calls.query.length, beforeQueries + 1, 'only the customer ownership query should run')
}

{
  const { req, url } = request('PUT', '/api/admin/customers/customer-1/visit-history/memo', {
    subjectKey:'APPOINTMENT:appointment-current', body:'   ',
  })
  const res = response()
  await service.handle(req, res, url)
  assert.equal(res.statusCode, 200)
  assert.equal(JSON.parse(res.body).memo, null)
  assert.ok(fixture.calls.execute.some(call => call.sql.includes('DELETE FROM "CustomerHistoryMemo"')))
}

{
  const { req, url } = request('PUT', '/api/admin/customers/customer-1/visit-history/memo', {
    subjectKey:'OTHER:record-1', body:'保存不可',
  })
  const res = response()
  await service.handle(req, res, url)
  assert.equal(res.statusCode, 404)
}

{
  const unauthorized = createCustomerAppointmentHistoryService({ prisma:createPrisma().prisma, sessionProvider:async () => null })
  const { req, url } = request('GET', '/api/admin/customers/customer-1/visit-history')
  const res = response()
  await unauthorized.handle(req, res, url)
  assert.equal(res.statusCode, 401)
}

console.log(JSON.stringify({
  release:'customer-appointment-history-memos-v565',
  currentAppointments:true,
  completedHistory:true,
  persistentMemos:true,
  originProtection:true,
  authorization:true,
}))
