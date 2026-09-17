import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(base + '/api/health/ready', { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-password-common-layout'), 'v653')
assert.equal(ready.headers.get('x-lien-customer-booking-points'), 'v652')
assert.equal(ready.headers.get('x-lien-dealer-password-change'), 'v646')

const stylesheet = await fetch(base + '/wholesale-ordering-v543.css?v=653-password-layout1', { cache: 'no-store' })
assert.equal(stylesheet.status, 200)
assert.match(await stylesheet.text(), /dealer-password-common-layout-v653/)

const login = await fetch(base + '/dealer/login?verify=v653', { cache: 'no-store' })
assert.equal(login.status, 200)
assert.match(await login.text(), /\/api\/dealer\/auth\/login/)

const protectedPage = await fetch(base + '/dealer/password-change?verify=v653', { cache: 'no-store', redirect: 'manual' })
assert.equal(protectedPage.status, 404)

console.log(JSON.stringify({
  release: 'dealer-password-common-layout-v653',
  productionVerified: true,
  sharedStylesheetVerified: true,
  dealerLoginAvailable: true,
  passwordPageProtected: true,
}))
