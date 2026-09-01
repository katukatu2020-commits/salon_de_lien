import assert from 'node:assert/strict'

const baseUrl = String(process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-customer-staff-booking-v520-smoke/1.0' }

const health = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(health.ok, true)
assert.equal(health.headers.get('x-lien-customer-staff-booking'), 'v520')
assert.equal(health.headers.get('x-lien-campaign-image-crop'), 'v519')

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/appointments' }),
  redirect: 'manual',
})
assert.equal(login.status, 303)
const setCookies = typeof login.headers.getSetCookie === 'function'
  ? login.headers.getSetCookie()
  : [login.headers.get('set-cookie')].filter(Boolean)
const cookie = setCookies.map(value => value.split(';', 1)[0]).join('; ')
assert.ok(cookie, 'customer login cookie is missing')

const appointments = await fetch(`${baseUrl}/u/appointments?smoke=v520`, {
  headers: { ...headers, Cookie: cookie },
  redirect: 'manual',
})
assert.equal(appointments.ok, true)
const html = await appointments.text()
assert.match(html, /サロン予約/)

console.log(JSON.stringify({ baseUrl, release: 'customer-staff-booking-v520', ready: true }))
