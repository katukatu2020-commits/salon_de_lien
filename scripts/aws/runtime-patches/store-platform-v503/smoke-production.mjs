import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const noCache = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-store-platform-v503-smoke/1.0' }

async function get(pathname, headers = {}) {
  return fetch(`${baseUrl}${pathname}`, { headers: { ...noCache, ...headers }, redirect: 'manual' })
}

const ready = await get('/api/health/ready')
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-store-app-stability'), 'v501')
assert.equal(ready.headers.get('x-lien-store-app-cache-activation'), 'v502')
assert.equal(ready.headers.get('x-lien-store-platform'), 'v503')

const loginPage = await get('/admin/login?store-platform-smoke=v503', { Accept: 'text/html' })
assert.equal(loginPage.status, 200)
const loginHtml = await loginPage.text()
assert.match(loginHtml, /\/_next\/static\/chunks\/app\/layout-runtime-v503-final\.js/)
assert.doesNotMatch(loginHtml, /layout-runtime-v502\.js/)

const layout = await get('/_next/static/chunks/app/layout-runtime-v503-final.js')
assert.equal(layout.status, 200)
const layoutSource = await layout.text()
assert.match(layoutSource, /store-platform-v503-inline/)
assert.match(layoutSource, /ORIMIA for Salon/)
assert.match(layoutSource, /Powered by ORIMIA/)

const customerLoginPage = await get('/u/login?store-platform-smoke=v503', { Accept: 'text/html' })
assert.equal(customerLoginPage.status, 200)
const customerLoginHtml = await customerLoginPage.text()
assert.match(customerLoginHtml, /\/_next\/static\/chunks\/app\/layout-d1470003e928b0b1\.customertabs-v503\.js/)
const customerLayout = await get('/_next/static/chunks/app/layout-d1470003e928b0b1.customertabs-v503.js')
assert.equal(customerLayout.status, 200)
assert.match(await customerLayout.text(), /store-platform-v503-customer-inline/)
const customerExperience = await get('/customer-experience-v503.js?v=503')
assert.equal(customerExperience.status, 200)
assert.match(await customerExperience.text(), /store-platform-v503-customer-experience/)

const storeManifestResponse = await get('/orimia-for-salon.webmanifest?v=503')
assert.equal(storeManifestResponse.status, 200)
const storeManifest = await storeManifestResponse.json()
assert.equal(storeManifest.name, 'ORIMIA for Salon')
assert.equal(storeManifest.scope, '/admin/')

const customerManifestResponse = await get('/powered-by-orimia.webmanifest?v=503')
assert.equal(customerManifestResponse.status, 200)
const customerManifest = await customerManifestResponse.json()
assert.equal(customerManifest.name, 'Powered by ORIMIA')
assert.equal(customerManifest.scope, '/u/')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products?section=feedback' }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const demographics = await get('/api/lien-product-demographics', { cookie, Accept: 'application/json' })
assert.equal(demographics.status, 200)
const demographicsPayload = await demographics.json()
assert.ok(Array.isArray(demographicsPayload.products))
for (const product of demographicsPayload.products) {
  assert.ok(Array.isArray(product.ageGroups))
  assert.ok(Array.isArray(product.genders))
  assert.equal(typeof product.totalQuantity, 'number')
}

const profile = await get('/api/admin/store-profile', { cookie, Accept: 'application/json' })
assert.equal(profile.status, 200)
const profilePayload = await profile.json()
assert.ok(profilePayload.profile?.storeName)
assert.ok(profilePayload.profile?.businessSchedule)

const tokyoMonth = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit',
}).format(new Date()).slice(0, 7)
const businessDays = await get(`/api/lien-business-days?month=${tokyoMonth}`, { cookie, Accept: 'application/json' })
assert.equal(businessDays.status, 200)

console.log(JSON.stringify({
  release: ready.headers.get('x-lien-store-platform'),
  products: demographicsPayload.products.length,
  storeName: profilePayload.profile.storeName,
  storeManifest: storeManifest.name,
  customerManifest: customerManifest.name,
}))
