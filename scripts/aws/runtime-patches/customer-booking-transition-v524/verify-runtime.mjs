import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.APP_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const shellCss = fs.readFileSync(path.join(root, 'public', 'shell-consistency-v518.css'), 'utf8')
const client = fs.readFileSync(path.join(root, 'public', 'customer-booking-transition-v524.js'), 'utf8')

assert.match(server, /X-Lien-Customer-Booking-Transition', 'v524'/)
assert.match(server, /X-Lien-Sidebar-Boundary', 'v523'/)
assert.match(server, /shell-consistency-v518\.css\?v=524-booking-transition1/)
assert.match(server, /const CUSTOMER_BOOKING_GATE_V524 =/)
assert.match(server, /orimia-customer-booking-gate-v524/)
assert.match(server, /customer-booking-transition-v524\.js\?v=524/)
assert.match(server, /output = output\.replace\('<head>', '<head>' \+ CUSTOMER_BOOKING_GATE_V524\)/)
assert.match(shellCss, /customer-booking-transition-v524/)
assert.match(shellCss, /data-orimia-customer-booking-gate-v524/)
assert.match(shellCss, /body > :not\(script\):not\(style\)/)
assert.match(shellCss, /orimia-icon-192\.png\?v=524/)
assert.match(client, /window\.__orimiaCustomerBookingGateV524/)
assert.match(client, /data-orimia-customer-booking-gate-v524/)
assert.match(client, /new MutationObserver\(maintain\)/)

console.log(JSON.stringify({ release: 'customer-booking-transition-v524', verified: true }))
