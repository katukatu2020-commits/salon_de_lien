import assert from 'node:assert/strict'

const baseUrl = String(process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-customer-booking-transition-v524-smoke/1.0' }

const health = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(health.ok, true)
assert.equal(health.headers.get('x-lien-customer-booking-transition'), 'v524')
assert.equal(health.headers.get('x-lien-sidebar-boundary'), 'v523')
assert.equal(health.headers.get('x-lien-ui-transition-consistency'), 'v516')

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

const appointments = await fetch(`${baseUrl}/u/appointments?smoke=v524`, {
  headers: { ...headers, Cookie: cookie, Accept: 'text/html' },
  redirect: 'manual',
})
assert.equal(appointments.ok, true)
const html = await appointments.text()
assert.match(html, /id="orimia-customer-booking-gate-v524"/)
assert.match(html, /customer-booking-transition-v524\.js\?v=524/)
assert.match(html, /shell-consistency-v518\.css\?v=524-booking-transition1/)

const client = await fetch(`${baseUrl}/customer-booking-transition-v524.js?v=524`, { headers })
assert.equal(client.ok, true)
const clientBody = await client.text()
assert.match(clientBody, /data-orimia-customer-booking-gate-v524/)
assert.match(clientBody, /window\.__orimiaCustomerBookingGateV524/)

const stylesheet = await fetch(`${baseUrl}/shell-consistency-v518.css?v=524-booking-transition1`, { headers })
assert.equal(stylesheet.ok, true)
const css = await stylesheet.text()
assert.match(css, /customer-booking-transition-v524/)
assert.match(css, /data-orimia-customer-booking-gate-v524/)
assert.match(css, /orimia-icon-192\.png\?v=524/)

console.log(JSON.stringify({ baseUrl, release: 'customer-booking-transition-v524', ready: true }))
