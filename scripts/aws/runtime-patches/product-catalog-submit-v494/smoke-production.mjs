import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-product-catalog-submit'), 'v494')

const runtime = await fetch(`${baseUrl}/commercial-admin-v136.js?v=494`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(runtime.status, 200)
const runtimeSource = await runtime.text()
assert.match(runtimeSource, /product-catalog-submit-v494/)
assert.match(runtimeSource, /handleCatalogCreateClick/)
assert.match(runtimeSource, /_caNotificationMarkup === markup/)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products' }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/products`, {
  headers: { cookie: sessionCookie, Accept: 'text/html', 'Cache-Control': 'no-cache' },
})
assert.equal(page.status, 200)
assert.match(await page.text(), /商品・価格・在庫を管理/)

const duplicate = await fetch(`${baseUrl}/api/admin/catalog`, {
  method: 'POST',
  headers: {
    Origin: baseUrl,
    cookie: sessionCookie,
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
  },
  body: new URLSearchParams({
    kind: 'product',
    action: 'create',
    manufacturerName: 'ミルボン',
    name: 'オージュア クエンチ シャンプー',
    category: 'シャンプー',
    retailPrice: '3080',
    stockQuantity: '13',
    imageDataUrl: '',
    description: '',
    alternativeRecommendation: '',
  }),
})
assert.equal(duplicate.status, 409)
const duplicatePayload = await duplicate.json()
assert.equal(duplicatePayload.ok, false)
assert.match(duplicatePayload.error, /すでに登録/)

console.log(JSON.stringify({
  ready: ready.status,
  runtime: runtime.status,
  page: page.status,
  duplicateValidation: duplicate.status,
}))
