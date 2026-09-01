import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-broadcast-layout'), 'v510')
assert.equal(ready.headers.get('x-lien-chat-message-ux'), 'v509')
assert.equal(ready.headers.get('x-lien-customer-experience'), 'v508')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    email: 'demo.owner',
    password: 'LienDemo2026!',
    next: '/admin/customers/messages',
  }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/customers/messages?smoke=v510`, {
  headers: { cookie: sessionCookie, 'Cache-Control': 'no-cache' },
})
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /layout-runtime-v510\.js/)

const layoutRuntime = await fetch(`${baseUrl}/_next/static/chunks/app/layout-runtime-v510.js?smoke=v510`, {
  headers: { 'Cache-Control': 'no-cache' },
})
assert.equal(layoutRuntime.status, 200)
assert.match(await layoutRuntime.text(), /broadcast-layout-v510-loader/)

const client = await fetch(`${baseUrl}/broadcast-layout-v510.js?v=510-final&smoke=v510`, {
  headers: { 'Cache-Control': 'no-cache' },
})
assert.equal(client.status, 200)
const source = await client.text()
assert.match(source, /__lienBroadcastLayoutV510/)
assert.match(source, /repeat\(2, minmax\(0, 1fr\)\)/)
assert.match(source, /data-store-broadcast-step="3"/)

console.log(JSON.stringify({
  baseUrl,
  layout: 'broadcast-layout-v510',
  desktop: 'steps-1-and-2-side-by-side',
  couponClosed: 'compact-full-width-row',
  mobile: 'single-column',
  broadcastSent: false,
}, null, 2))
