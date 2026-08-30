import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const modulePath = process.env.LIEN_LINE_RESERVATIONS_MODULE || '/app/line-reservations-v436.js'
const { resolveLineBookingCustomer } = require(modulePath)

const calls = []
const staleRecoveryService = {
  async resolveOrCreate(_tx, options) {
    calls.push({ ...options })
    if (calls.length === 1) throw Object.assign(new Error('お客様情報が見つかりません。'), { statusCode: 404 })
    return { id: 'customer-active', name: options.name, phone: options.phone }
  },
}

const recovered = await resolveLineBookingCustomer(staleRecoveryService, {}, {
  organizationId: 'org-yohaku',
  existingCustomerId: 'customer-hidden',
  name: '予約 太郎',
  phone: '09012345678',
})
assert.equal(recovered.id, 'customer-active')
assert.equal(calls.length, 2)
assert.equal(calls[0].existingCustomerId, 'customer-hidden')
assert.equal(calls[1].existingCustomerId, null)

let createCalls = 0
const createService = {
  async resolveOrCreate(_tx, options) {
    createCalls += 1
    return { id: 'customer-new', name: options.name, phone: options.phone }
  },
}
const created = await resolveLineBookingCustomer(createService, {}, {
  organizationId: 'org-yohaku',
  existingCustomerId: null,
  name: '新規 花子',
  phone: '08012345678',
})
assert.equal(created.id, 'customer-new')
assert.equal(createCalls, 1)

const conflict = Object.assign(new Error('本人確認が必要です。'), { statusCode: 409 })
await assert.rejects(
  resolveLineBookingCustomer({ resolveOrCreate: async () => { throw conflict } }, {}, { existingCustomerId: 'customer-active' }),
  error => error === conflict,
)

console.log('line-booking-customer-recovery-v493 behavior tested')
