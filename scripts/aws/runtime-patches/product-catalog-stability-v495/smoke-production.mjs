import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-product-catalog-submit'), 'v494')
assert.equal(ready.headers.get('x-lien-product-catalog-stability'), 'v495')

const runtime = await fetch(`${baseUrl}/commercial-admin-v136.js?v=495`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(runtime.status, 200)
const runtimeSource = await runtime.text()
assert.match(runtimeSource, /product-catalog-submit-v494/)
assert.match(runtimeSource, /product-catalog-stability-v495/)
assert.match(runtimeSource, /__lienProductImageFetchCountV495/)
assert.match(runtimeSource, /function scheduleProductImages\(\)/)
assert.match(runtimeSource, /notificationFetchedAt: 0/)
assert.match(runtimeSource, /Date\.now\(\) - state\.notificationFetchedAt < 25000/)

const staffRuntime = await fetch(`${baseUrl}/admin-staff-experience-v276.js?v=495`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(staffRuntime.status, 200)
const staffSource = await staffRuntime.text()
assert.match(staffSource, /product-catalog-stability-v495/)
assert.match(staffSource, /storePromise: null/)
assert.match(staffSource, /ownProfilePromise: null/)

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
assert.match(await page.text(), /蝠・刀繝ｻ萓｡譬ｼ繝ｻ蝨ｨ蠎ｫ繧堤ｮ｡逅・/)

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
    manufacturerName: '繝溘Ν繝懊Φ',
    name: '繧ｪ繝ｼ繧ｸ繝･繧｢ 繧ｯ繧ｨ繝ｳ繝・繧ｷ繝｣繝ｳ繝励・',
    category: '繧ｷ繝｣繝ｳ繝励・',
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
assert.match(duplicatePayload.error, /縺吶〒縺ｫ逋ｻ骭ｲ/)

console.log(JSON.stringify({
  ready: ready.status,
  runtime: runtime.status,
  staffRuntime: staffRuntime.status,
  page: page.status,
  duplicateValidation: duplicate.status,
}))
