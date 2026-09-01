import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-coupon-broadcast-delivery-v525-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-coupon-broadcast-delivery'), 'v525')
assert.equal(ready.headers.get('x-lien-customer-booking-transition'), 'v524')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { ...headers, Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    email: 'demo.owner',
    password: 'LienDemo2026!',
    next: '/admin/customers/messages',
  }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';', 1)[0]
assert.match(sessionCookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/customers/messages?smoke=v525`, {
  headers: { ...headers, Cookie: sessionCookie, Accept: 'text/html' },
})
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /アプリ内または登録メールへお知らせを届けます/)
assert.match(html, /value="app"/)
assert.match(html, /value="email"/)
assert.doesNotMatch(html, /value="sms"/)
assert.doesNotMatch(html, /SMS一斉配信/)

console.log(JSON.stringify({
  baseUrl,
  release: 'coupon-broadcast-delivery-v525',
  deliveryMethods: ['app', 'email'],
  broadcastSent: false,
  ready: true,
}))
