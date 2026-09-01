import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-customer-global-profile-v512-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v512`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-global-profile'), 'v512')
assert.equal(ready.headers.get('x-lien-public-brand-icon'), 'v511')
assert.equal(ready.headers.get('x-lien-store-platform'), 'v503')

const home = await fetch(`${baseUrl}/?smoke=v512`, { headers })
assert.equal(home.status, 200)
const html = await home.text()
assert.match(html, /ORIMIA/)
assert.match(html, /\/brand\/orimia-icon-192\.png\?v=511/)

console.log(JSON.stringify({ baseUrl, release: 'customer-global-profile-v512', ready: true }, null, 2))
