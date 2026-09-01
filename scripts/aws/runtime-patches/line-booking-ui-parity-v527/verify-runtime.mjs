import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = process.env.APP_ROOT || '/app'
const require = createRequire(import.meta.url)
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const line = fs.readFileSync(path.join(root, 'line-reservations-v436.js'), 'utf8')
const template = fs.readFileSync(path.join(root, 'line-booking-page-v527.html'), 'utf8')
const pageModule = require(path.join(root, 'line-booking-page-v527.js'))

assert.match(server, /X-Lien-Line-Booking-UI-Parity', 'v527'/)
assert.match(server, /X-Lien-Shift-Grid-Synchronization', 'v526'/)
assert.match(line, /line-booking-ui-parity-v527/)
assert.match(line, /require\('\.\/line-booking-page-v527'\)\.createLineReservationPageV527/)
assert.match(line, /openMinutes: data\.organization\.openMinutes/)
assert.match(line, /const requestedWeekStart = url\.searchParams\.get\('weekStart'\)/)
assert.match(line, /sendJson\(res, 200, \{ weekStart: date, maximumDate: maxDate, days \}\)/)
assert.match(line, /resolveLineBookingCustomer/)
assert.match(line, /line-booking-customer-recovery-v493/)
assert.doesNotMatch(line, /<span class="mark">L<\/span>/)
assert.equal((line.match(/function liffPage\(connection\)/g) || []).length, 1)
assert.match(template, /data-line-booking-ui-parity="v527"/)
assert.match(template, /ORIMIA for Salon/)
assert.match(template, /選択中のメニュー/)
assert.match(template, /メニューとスタイリストを選択/)
assert.match(template, /id="availabilityTable"/)
assert.match(template, /weekStart=' \+ encodeURIComponent\(state\.weekStart\)/)
assert.match(template, /id="bottomHistory"/)
assert.match(template, /\/api\/lien-line-booking\/history/)
assert.match(template, /\/api\/lien-line-booking\/cancel/)
assert.equal(typeof pageModule.createLineReservationPageV527, 'function')

console.log(JSON.stringify({ release: 'line-booking-ui-parity-v527', verified: true }))
