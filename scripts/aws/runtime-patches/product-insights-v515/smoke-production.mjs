import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-product-insights-v515-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v515`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-product-insights'), 'v515')
assert.equal(ready.headers.get('x-lien-business-hours-consistency'), 'v514')
assert.equal(ready.headers.get('x-lien-customer-global-profile-extended'), 'v513')
assert.equal(ready.headers.get('x-lien-public-brand-icon'), 'v511')

const login = await fetch(`${baseUrl}/admin/login?smoke=v515`, { headers })
assert.equal(login.status, 200)
const loginHtml = await login.text()
assert.match(loginHtml, /layout-runtime-v515\.js/)

const asset = await fetch(`${baseUrl}/product-insights-v515.js?smoke=v515`, { headers })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /商品別 販売インサイト/)
assert.match(source, /商品別 販売インサイトへ戻る/)
assert.match(source, /averageRating/)
assert.match(source, /reviewCount/)

const unauthorized = await fetch(`${baseUrl}/api/lien-product-demographics?smoke=v515`, {
  headers: { ...headers, Accept: 'application/json' },
})
assert.equal(unauthorized.status, 401)

console.log(JSON.stringify({ baseUrl, release: 'product-insights-v515', ready: true }, null, 2))
