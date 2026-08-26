'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const test = require('node:test')

process.env.INTEGRATION_SECRET_ENCRYPTION_KEY = 'line-reservation-test-key-that-is-at-least-thirty-two-characters'

const {
  decryptSecret,
  encryptSecret,
  normalizeJapanesePhone,
  slotAvailable,
  validateDateKey,
  verifyWebhookSignature,
} = require('./line-reservations-v436')

test('LINE webhook signature is verified against the unmodified request body', () => {
  const body = Buffer.from('{"destination":"U123","events":[]}')
  const secret = '0123456789abcdef0123456789abcdef'
  const signature = crypto.createHmac('sha256', secret).update(body).digest('base64')
  assert.equal(verifyWebhookSignature(body, signature, secret), true)
  assert.equal(verifyWebhookSignature(Buffer.from(body.toString() + ' '), signature, secret), false)
})

test('LINE secrets are encrypted with a random IV and decrypt without exposing plaintext', () => {
  const first = encryptSecret('channel-secret-value')
  const second = encryptSecret('channel-secret-value')
  assert.notEqual(first, second)
  assert.equal(first.includes('channel-secret-value'), false)
  assert.equal(decryptSecret(first), 'channel-secret-value')
})

test('Japanese mobile phone values are normalized', () => {
  assert.equal(normalizeJapanesePhone('090-1234-5678'), '09012345678')
  assert.equal(normalizeJapanesePhone('+81 90 1234 5678'), '09012345678')
})

test('booking dates are limited to today through 90 days ahead in Japan time', () => {
  const now = new Date('2026-08-26T12:00:00+09:00')
  assert.equal(validateDateKey('2026-08-26', now), '2026-08-26')
  assert.equal(validateDateKey('2026-11-24', now), '2026-11-24')
  assert.throws(() => validateDateKey('2026-08-25', now), /過去の日付/)
  assert.throws(() => validateDateKey('2026-11-25', now), /90日以内/)
  assert.throws(() => validateDateKey('2026-02-31', now), /予約日/)
})

test('a staff slot is rejected for overlap, capacity, and the 30-minute start gap', () => {
  const staff = { staffName: '渡邊 浩明', workStartMinutes: 540, workEndMinutes: 1140, maxConcurrentAppointments: 1 }
  const allStaff = [staff]
  const appointments = [{ staffName: '渡邊 浩明', startMinutes: 600, durationMinutes: 60 }]
  assert.equal(slotAvailable({ startMinutes: 600, durationMinutes: 60, staff, allStaff, appointments }), false)
  assert.equal(slotAvailable({ startMinutes: 620, durationMinutes: 60, staff, allStaff, appointments }), false)
  assert.equal(slotAvailable({ startMinutes: 660, durationMinutes: 60, staff, allStaff, appointments }), true)
  assert.equal(slotAvailable({ startMinutes: 1110, durationMinutes: 60, staff, allStaff, appointments: [] }), false)
  assert.equal(slotAvailable({
    startMinutes: 660,
    durationMinutes: 60,
    staff,
    allStaff,
    appointments: [],
    capacityOverrides: [{ slotStartMinutes: 660, capacity: 0 }],
  }), false)
})
