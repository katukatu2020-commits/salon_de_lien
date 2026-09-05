import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-manual-booking-break-interaction-v535-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers, cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-manual-booking-break-interaction'), 'v535')
assert.equal(ready.headers.get('x-lien-sales-ledger-month-filter'), 'v534')
assert.equal(ready.headers.get('x-lien-manual-break-cleanup'), 'v522')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { ...headers, Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' }),
})
assert.ok([302, 303].includes(login.status), `admin login returned ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const appointments = await fetch(`${baseUrl}/admin/appointments?smoke=v535`, {
  headers: { ...headers, Cookie: cookie },
  cache: 'no-store',
})
assert.equal(appointments.status, 200)

const asset = await fetch(`${baseUrl}/staff-breaks-checkout-menu-client-v442.js?smoke=v535`, {
  headers: { ...headers, Cookie: cookie },
  cache: 'no-store',
})
assert.equal(asset.status, 200)
const client = await asset.text()
assert.match(client, /manual-booking-break-interaction-v535/)
assert.match(client, /setBreakControlsActive/)
assert.match(client, /syncBreakTimingFromAppointment/)
assert.match(client, /control\.required = false/)
assert.match(client, /lien-break-resize-v461/)
assert.match(client, /beginBreakDrag/)

const date = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date())
const breaks = await fetch(`${baseUrl}/api/admin/staff-breaks?date=${date}`, {
  headers: { ...headers, Cookie: cookie, Accept: 'application/json' },
  cache: 'no-store',
})
assert.equal(breaks.status, 200)
const payload = await breaks.json()
assert.ok(Array.isArray(payload.staff))
assert.ok(Array.isArray(payload.breaks))

console.log(JSON.stringify({ release: 'manual-booking-break-interaction-v535', ready: ready.status, appointments: appointments.status, asset: asset.status, breakApi: breaks.status }))
