import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-customer-global-profile-v513-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v513`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-global-profile-extended'), 'v513')
assert.equal(ready.headers.get('x-lien-customer-global-profile'), 'v512')
assert.equal(ready.headers.get('x-lien-public-brand-icon'), 'v511')

const home = await fetch(`${baseUrl}/?smoke=v513`, { headers })
assert.equal(home.status, 200)
assert.match(await home.text(), /ORIMIA/)

console.log(JSON.stringify({ baseUrl, release: 'customer-global-profile-v513', ready: true }, null, 2))
