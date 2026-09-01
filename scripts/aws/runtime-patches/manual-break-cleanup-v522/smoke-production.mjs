import assert from 'node:assert/strict'

const baseUrl = String(process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-manual-break-cleanup-v522-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(ready.ok, true)
assert.equal(ready.headers.get('x-lien-manual-break-cleanup'), 'v522')
assert.equal(ready.headers.get('x-lien-manual-break-booking'), 'v521')

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

const appointments = await fetch(`${baseUrl}/admin/appointments?smoke=v522`, {
  headers: { ...headers, Cookie: cookie },
})
assert.equal(appointments.ok, true)

const client = await fetch(`${baseUrl}/staff-breaks-checkout-menu-client-v442.js?v=522`, {
  headers: { ...headers, Cookie: cookie },
})
assert.equal(client.ok, true)
const script = await client.text()
assert.match(script, /manual-break-cleanup-v522/)
assert.match(script, /body \.lien-break-action-v442\{display:none!important/)
assert.match(script, /manual-break-booking-v521/)

console.log(JSON.stringify({ baseUrl, release: 'manual-break-cleanup-v522', ready: true }))
