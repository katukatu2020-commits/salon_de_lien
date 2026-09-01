import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'staff-breaks-checkout-menu-client-v442.js'), 'utf8')
const service = fs.readFileSync(path.join(root, 'staff-breaks-checkout-menu-v442.js'), 'utf8')

assert.match(server, /X-Lien-Manual-Break-Booking', 'v521'/)
assert.match(server, /X-Lien-Customer-Staff-Booking', 'v520'/)
assert.match(client, /manual-break-booking-v521/)
assert.match(client, /document\.documentElement\.dataset\.orimiaManualBreakBooking = 'v521'/)
assert.match(client, /toggle\.dataset\.lienBreakCheckboxV521 = '1'/)
assert.match(client, /staff\.dataset\.lienBreakStaffV521 = '1'/)
assert.match(client, /start\.dataset\.lienBreakStartV521 = '1'/)
assert.match(client, /end\.dataset\.lienBreakEndV521 = '1'/)
assert.match(client, /option\.hidden = true\s+option\.disabled = true/)
assert.match(client, /jsonRequest\('\/api\/admin\/staff-breaks', \{ method: 'POST'/)
assert.match(client, /durationMinutes: endMinutes - startMinutes/)
assert.match(service, /url\.pathname === '\/api\/admin\/staff-breaks' && req\.method === 'POST'/)
assert.match(service, /status: \{ notIn: \[\.\.\.CLOSED_APPOINTMENT_STATUSES\] \}/)
assert.match(service, /throw new RequestError\('\u3053\u306e\u6642\u9593\u5e2f\u306b\u306f\u4e88\u7d04\u304c\u3042\u308a\u307e\u3059\u3002/)

console.log(JSON.stringify({ release: 'manual-break-booking-v521', verified: true }))
