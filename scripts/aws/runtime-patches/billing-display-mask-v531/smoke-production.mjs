import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-billing-display-mask'), 'v531')
assert.equal(ready.headers.get('x-lien-customer-home-menu-order'), 'v530')
assert.equal(ready.headers.get('x-lien-customer-desktop-frontend'), 'v529')
assert.equal(ready.headers.get('x-lien-customer-home-branding'), 'v528')
assert.equal(ready.headers.get('x-lien-line-booking-ui-parity'), 'v527')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/owner-analytics?section=billing' }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/owner-analytics?section=billing`, {
  headers: { Cookie: cookie, 'Cache-Control': 'no-cache' },
  cache: 'no-store',
})
assert.equal(page.status, 200)
const html = await page.text()
const start = html.indexOf('システム利用料')
assert.ok(start >= 0)
const billingHtml = html.slice(start)
const masks = billingHtml.match(/\*{5}円/g) || []
assert.ok(masks.length >= 4, `only ${masks.length} masked amounts were rendered`)
assert.doesNotMatch(billingHtml.replace(/data-amount="[^"]*"/g, ''), /-?\d[\d,]*円/)

console.log(JSON.stringify({ release: 'billing-display-mask-v531', ready: ready.status, billing: page.status, maskedAmounts: masks.length }))
