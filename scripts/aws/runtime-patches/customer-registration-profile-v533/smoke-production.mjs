import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-registration-profile'), 'v533')
assert.equal(ready.headers.get('x-lien-customer-account-lifecycle'), 'v532')
assert.equal(ready.headers.get('x-lien-billing-display-mask'), 'v531')
assert.equal(ready.headers.get('x-lien-customer-home-menu-order'), 'v530')
assert.equal(ready.headers.get('x-lien-customer-desktop-frontend'), 'v529')
assert.equal(ready.headers.get('x-lien-customer-home-branding'), 'v528')
assert.equal(ready.headers.get('x-lien-line-booking-ui-parity'), 'v527')

const registration = await fetch(`${baseUrl}/u/register`, {
  headers: { 'Cache-Control': 'no-cache' },
  cache: 'no-store',
})
assert.equal(registration.status, 200)
const registrationHtml = await registration.text()
assert.match(registrationHtml, /\/api\/customer-auth\/registration-link\/request/)
assert.match(registrationHtml, /name="email"/)

console.log(JSON.stringify({
  release: 'customer-registration-profile-v533',
  ready: ready.status,
  registrationAvailable: true,
}))
