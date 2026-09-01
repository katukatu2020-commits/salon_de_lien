'use strict'

const assert = require('node:assert/strict')
const crypto = require('node:crypto')

const modulePath = process.env.LIEN_LINE_RESERVATIONS_MODULE || '/app/line-reservations-v436.js'
const { createLineReservationService, addDaysToDateKey } = require(modulePath)

function tokyoDateAfter(days) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(Date.now() + days * 86400000))
}

let appointmentQueries = 0
const prisma = {
  appointment: {
    async findMany() { appointmentQueries += 1; return [] },
  },
  async $queryRawUnsafe(sql) {
    const source = String(sql)
    if (source.includes('OrganizationLineConnection')) {
      return [{
        organizationId: 'org-line-v527', lineLoginChannelId: '1234567890', liffId: '1234567890-AbCdEf',
        status: 'active', slug: 'line-test', publicCode: 'LIEN-TEST', organizationName: 'テストサロン',
      }]
    }
    if (source.includes('FROM "Organization" o')) {
      return [{ id: 'org-line-v527', name: 'テストサロン', businessOpenMinutes: 600, businessCloseMinutes: 1200, closedWeekdays: '' }]
    }
    if (source.includes('FROM "SalonMenu"')) {
      return [{ id: 'menu-cut', name: '似合わせカット', category: 'カット', description: '', durationMinutes: 60, priceYen: 5500 }]
    }
    if (source.includes('FROM "StaffBookingSetting" s')) {
      return [{ staffKey: 'staff-v527', staffName: '予約担当', maxConcurrentAppointments: 1, workStartMinutes: 600, workEndMinutes: 1200, closedWeekdays: '', introduction: '', roleLabel: 'スタイリスト' }]
    }
    if (source.includes('BookingCapacityOverride') || source.includes('StaffScheduleBreak')) return []
    throw new Error(`Unexpected weekly availability query: ${source.slice(0, 100)}`)
  },
}

const originalFetch = global.fetch
global.fetch = async url => {
  assert.match(String(url), /api\.line\.me\/oauth2\/v2\.1\/verify/)
  return new Response(JSON.stringify({ sub: 'line-user-v527', aud: '1234567890', name: 'LINE顧客' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function main() {
try {
  const service = createLineReservationService({
    prisma,
    crypto,
    staffSession: async () => null,
    settingsClientScript: '',
    customerNameAutoMerge: {},
  })
  const weekStart = tokyoDateAfter(7)
  const url = new URL(`https://example.test/api/lien-line-booking/availability?store=LIEN-TEST&weekStart=${weekStart}&menuId=menu-cut&staffKey=free`)
  const req = { method: 'GET', headers: { authorization: 'Bearer test-id-token', host: 'example.test' }, socket: { remoteAddress: '127.0.0.1' } }
  const response = {
    statusCode: 0,
    headers: {},
    headersSent: false,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value },
    end(body) { this.body = body; this.headersSent = true },
  }
  const handled = await service.handle(req, response, url)
  assert.notEqual(handled, false)
  assert.equal(response.statusCode, 200)
  const payload = JSON.parse(response.body)
  assert.equal(payload.weekStart, weekStart)
  assert.equal(payload.days.length, 7)
  assert.deepEqual(payload.days.map(day => day.date), Array.from({ length: 7 }, (_, index) => addDaysToDateKey(weekStart, index)))
  assert.ok(payload.days.every(day => day.slots.some(slot => slot.startMinutes === 600)))
  assert.equal(appointmentQueries, 7)
  console.log(JSON.stringify({ release: 'line-booking-ui-parity-v527', weeklyAvailabilityVerified: true }))
} finally {
  global.fetch = originalFetch
}
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
