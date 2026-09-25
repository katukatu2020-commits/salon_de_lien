import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { Accept: 'text/html', 'Cache-Control': 'no-cache' }

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v660`, { headers, cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-registration-link-recovery'), 'v660')
assert.equal(ready.headers.get('x-lien-dealer-product-search-filters'), 'v659')

for (const pathname of ['/u/register?verify=v660', '/u/register/not-a-valid-registration-token?verify=v660']) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers, cache: 'no-store' })
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /orimia-customer-registration-link-recovery-v660/)
  assert.match(html, /__orimiaCustomerRegistrationLinkRecoveryV660/)
}

console.log(JSON.stringify({
  release: 'customer-registration-link-recovery-v660',
  productionSmokeVerified: true,
  registrationEntryVerified: true,
  emailLinkRouteVerified: true,
}))
