import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createCustomerAppointmentCancellationService } = require('/app/customer-appointment-cancellation-v362.js')

const executed = []
const tx = {
  async $queryRawUnsafe() {
    return [{
      id: 'appointment-v380',
      customerId: 'customer-v380',
      scheduledAt: new Date(Date.now() + 86_400_000),
      menu: 'カット',
      staffName: '担当者',
      status: '予約確定',
      note: '',
      customerName: 'テスト顧客',
      hasSale: false,
    }]
  },
  async $executeRawUnsafe(sql) {
    executed.push(sql)
    if (sql.startsWith('UPDATE "Appointment"')) return 1
    return 1
  },
}

const prisma = {
  async $transaction(callback) {
    return callback(tx)
  },
  async $executeRawUnsafe(sql) {
    executed.push(sql)
    throw new Error('simulated notification storage failure')
  },
}

const req = {
  method: 'POST',
  headers: { host: 'salon-de-lien.com', origin: 'https://salon-de-lien.com' },
  async *[Symbol.asyncIterator]() {
    yield Buffer.from(JSON.stringify({ appointmentId: 'appointment-v380' }))
  },
}

const response = { statusCode: 0, headers: {}, body: '' }
const res = {
  setHeader(name, value) { response.headers[name] = value },
  get statusCode() { return response.statusCode },
  set statusCode(value) { response.statusCode = value },
  end(value = '') { response.body = String(value) },
}

const service = createCustomerAppointmentCancellationService({
  prisma,
  crypto,
  sessionProvider: async () => ({ customerId: 'customer-v380', organizationId: 'organization-v380' }),
})

const originalWarn = console.warn
console.warn = () => {}
try {
  const handled = await service.handle(req, res, new URL('https://salon-de-lien.com/api/lien-customer-appointment-cancel'))
  assert.equal(handled, true)
  assert.equal(response.statusCode, 200)
  assert.equal(JSON.parse(response.body).success, true)
  assert.ok(executed.some(sql => sql.startsWith('UPDATE "Appointment"') && sql.includes('"couponIssueId"=NULL')))
  assert.ok(executed.some(sql => sql.includes('INSERT INTO "StaffSystemNotification"')))
} finally {
  console.warn = originalWarn
}

console.log('customer cancellation resilience v380 service test passed')
