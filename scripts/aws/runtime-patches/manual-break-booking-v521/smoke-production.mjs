import assert from 'node:assert/strict'

const baseUrl = String(process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-manual-break-booking-v521-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(ready.ok, true)
assert.equal(ready.headers.get('x-lien-manual-break-booking'), 'v521')
assert.equal(ready.headers.get('x-lien-customer-staff-booking'), 'v520')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' }),
})
assert.equal(login.status, 303)
const setCookies = typeof login.headers.getSetCookie === 'function'
  ? login.headers.getSetCookie()
  : [login.headers.get('set-cookie')].filter(Boolean)
const cookie = setCookies.map(value => value.split(';', 1)[0]).join('; ')
assert.ok(cookie, 'admin login cookie is missing')

const appointments = await fetch(`${baseUrl}/admin/appointments?smoke=v521`, {
  headers: { ...headers, Cookie: cookie },
})
assert.equal(appointments.ok, true)

const client = await fetch(`${baseUrl}/staff-breaks-checkout-menu-client-v442.js?v=521`, {
  headers: { ...headers, Cookie: cookie },
})
assert.equal(client.ok, true)
const script = await client.text()
assert.match(script, /manual-break-booking-v521/)
assert.match(script, /lienBreakCheckboxV521/)
assert.match(script, /lienBreakEndV521/)
assert.match(script, /option\.hidden = true/)

const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
}).formatToParts(new Date())
const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
const date = `${values.year}-${values.month}-${values.day}`
const breaks = await fetch(`${baseUrl}/api/admin/staff-breaks?date=${date}`, {
  headers: { ...headers, Cookie: cookie, Accept: 'application/json' },
})
assert.equal(breaks.ok, true)
const payload = await breaks.json()
assert.ok(Array.isArray(payload.staff))
assert.ok(Array.isArray(payload.breaks))

console.log(JSON.stringify({ baseUrl, release: 'manual-break-booking-v521', ready: true }))
