import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-line-booking-customer-recovery'), 'v493')

const page = await fetch(`${baseUrl}/line/booking/LIEN-YOHAKU`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(page.status, 200)
assert.match(page.headers.get('content-security-policy') || '', /line-scdn\.net/)
const html = await page.text()
assert.match(html, /LINE予約/)
assert.match(html, /id="booking"/)
assert.match(html, /\/api\/lien-line-booking\/book/)

const unauthenticated = await fetch(`${baseUrl}/api/lien-line-booking/config?store=LIEN-YOHAKU`)
assert.equal(unauthenticated.status, 401)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/settings' }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

const settings = await fetch(`${baseUrl}/api/lien-line-settings`, {
  headers: { cookie: sessionCookie, Accept: 'application/json', 'Cache-Control': 'no-cache' },
})
assert.equal(settings.status, 200)
const payload = await settings.json()
assert.equal(payload.connected, true)
assert.equal(payload.storeCode, 'LIEN-YOHAKU')
assert.ok(payload.liffId)

console.log(JSON.stringify({ ready: ready.status, page: page.status, unauthenticated: unauthenticated.status, connected: payload.connected, storeCode: payload.storeCode }))
