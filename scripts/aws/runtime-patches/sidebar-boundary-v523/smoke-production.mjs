import assert from 'node:assert/strict'

const baseUrl = String(process.env.BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-sidebar-boundary-v523-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(ready.ok, true)
assert.equal(ready.headers.get('x-lien-sidebar-boundary'), 'v523')
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

const appointments = await fetch(`${baseUrl}/admin/appointments?smoke=v523`, {
  headers: { ...headers, Cookie: cookie },
})
assert.equal(appointments.ok, true)
const html = await appointments.text()
assert.match(html, /layout-runtime-v518-release1\.js/)

const stylesheet = await fetch(`${baseUrl}/shell-consistency-v518.css?v=523-boundary1`, { headers })
assert.equal(stylesheet.ok, true)
const css = await stylesheet.text()
assert.match(css, /sidebar-boundary-v523/)
assert.match(css, /--orimia-admin-sidebar-width-v518, 18rem/)

console.log(JSON.stringify({ baseUrl, release: 'sidebar-boundary-v523', ready: true }))
