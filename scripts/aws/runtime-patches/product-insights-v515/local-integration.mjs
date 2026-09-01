import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3119').replace(/\/$/, '')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: {
    Origin: baseUrl,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    email: 'demo.owner',
    password: 'LienDemo2026!',
    next: '/admin/products?section=feedback',
  }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v515`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-product-insights'), 'v515')
assert.equal(ready.headers.get('x-lien-business-hours-consistency'), 'v514')

const unauthorized = await fetch(`${baseUrl}/api/lien-product-demographics`, { headers: { Accept: 'application/json' } })
assert.equal(unauthorized.status, 401)

const response = await fetch(`${baseUrl}/api/lien-product-demographics`, {
  headers: {
    Accept: 'application/json',
    Cookie: cookie,
    'Cache-Control': 'no-cache',
  },
})
assert.equal(response.status, 200)
assert.match(response.headers.get('cache-control') || '', /no-store/i)
const payload = await response.json()
assert.ok(Array.isArray(payload.products) && payload.products.length > 0)

for (const product of payload.products) {
  assert.equal(typeof product.id, 'string')
  assert.equal(typeof product.name, 'string')
  assert.ok(Object.hasOwn(product, 'imageUrl'))
  assert.ok(Object.hasOwn(product, 'category'))
  assert.ok(Number.isInteger(product.reviewCount) && product.reviewCount >= 0)
  assert.ok(product.averageRating === null || (Number.isFinite(product.averageRating) && product.averageRating >= 1 && product.averageRating <= 5))
}

const reviewed = payload.products.find(product => product.reviewCount > 0 && product.averageRating !== null)
assert.ok(reviewed, 'at least one reviewed product is required for the drill-down test')
const detailParams = new URLSearchParams({
  section: 'feedback',
  manufacturer: reviewed.manufacturerName || '',
  productName: reviewed.name,
  insightProduct: reviewed.id,
})
const detail = await fetch(`${baseUrl}/admin/products?${detailParams}`, { headers: { Cookie: cookie, 'Cache-Control': 'no-cache' } })
assert.equal(detail.status, 200)
const detailHtml = await detail.text()
assert.match(detailHtml, new RegExp(reviewed.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

const imageUrl = payload.products.find(product => String(product.imageUrl || '').startsWith('/'))?.imageUrl
if (imageUrl) {
  const image = await fetch(`${baseUrl}${imageUrl}`, { headers: { Cookie: cookie } })
  assert.equal(image.status, 200)
  assert.match(image.headers.get('content-type') || '', /^image\//)
}

const loginPage = await fetch(`${baseUrl}/admin/login?integration=v515`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(loginPage.status, 200)
const loginHtml = await loginPage.text()
assert.match(loginHtml, /layout-runtime-v515\.js/)

const asset = await fetch(`${baseUrl}/product-insights-v515.js?integration=v515`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(asset.status, 200)
const assetSource = await asset.text()
assert.match(assetSource, /商品別 販売インサイト/)
assert.match(assetSource, /insightProduct/)
assert.match(assetSource, /data-sp-insights-hidden="1"/)

console.log(JSON.stringify({
  release: 'product-insights-v515',
  products: payload.products.length,
  reviewedProduct: {
    id: reviewed.id,
    name: reviewed.name,
    averageRating: reviewed.averageRating,
    reviewCount: reviewed.reviewCount,
  },
  imageVerified: Boolean(imageUrl),
  exactProductDrillDown: true,
}, null, 2))
