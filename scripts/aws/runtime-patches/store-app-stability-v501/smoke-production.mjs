import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const userAgent = 'ORIMIA-store-app-stability-v501-smoke/1.0'
const htmlHeaders = {
  Accept: 'text/html',
  'Cache-Control': 'no-cache',
  'User-Agent': userAgent,
}
const legacyBrand = /Salon\s+de\s+Lien|Salon\s+CRM|繧ｵ繝ｭ繝ｳ繝ｻ繝峨・繝ｪ繧｢繝ｳ/i

async function fetchText(pathname, headers = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: 'manual',
    headers: { 'Cache-Control': 'no-cache', 'User-Agent': userAgent, ...headers },
  })
  assert.equal(response.status, 200, `${pathname} must return 200`)
  return { response, text: await response.text() }
}

async function fetchHtml(pathname, cookie = '') {
  const separator = pathname.includes('?') ? '&' : '?'
  const { text } = await fetchText(`${pathname}${separator}store-smoke=v501`, {
    ...htmlHeaders,
    ...(cookie ? { cookie } : {}),
  })
  assert.doesNotMatch(text, legacyBrand, `${pathname} still contains the legacy brand`)
  assert.match(text, /ORIMIA/, `${pathname} does not contain ORIMIA`)
  return text
}

const ready = await fetch(`${baseUrl}/api/health/ready`, {
  headers: { 'Cache-Control': 'no-cache', 'User-Agent': userAgent },
})
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-product-catalog-stability'), 'v495')
assert.equal(ready.headers.get('x-lien-campaign-tablet-layout'), 'v499')
assert.equal(ready.headers.get('x-orimia-branding'), 'v500')
assert.equal(ready.headers.get('x-lien-store-app-stability'), 'v501')

for (const pathname of ['/', '/privacy', '/terms', '/admin/login', '/u/login']) {
  await fetchHtml(pathname)
}

const { text: layoutRuntime } = await fetchText('/_next/static/chunks/app/layout-runtime-v450.js')
for (const marker of [
  'store-app-stability-v501-loader',
  '/orimia-brand-v501.js?v=501',
  '/store-app-stability-v501.js?v=501',
]) {
  assert.ok(layoutRuntime.includes(marker), `layout runtime is missing ${marker}`)
}

const { text: brandRuntime } = await fetchText('/orimia-brand-v501.js?v=501')
assert.match(brandRuntime, /startAfterHydration/)
const { text: storeRuntime } = await fetchText('/store-app-stability-v501.js?v=501')
for (const marker of [
  'data-store-back-v501',
  'lien-route-line-v461',
  'data-store-duplicate-v501',
  'store-chat-toggle-v501',
  'store-broadcast-flow-v501',
  'storeProductUploadV501',
]) {
  assert.ok(storeRuntime.includes(marker), `store runtime is missing ${marker}`)
}

const manifestResponse = await fetch(`${baseUrl}/orimia.webmanifest?v=500`, {
  headers: { 'Cache-Control': 'no-cache', 'User-Agent': userAgent },
})
assert.equal(manifestResponse.status, 200)
const manifest = await manifestResponse.json()
assert.equal(manifest.name, 'ORIMIA')
assert.equal(manifest.short_name, 'ORIMIA')
assert.equal(manifest.display, 'standalone')
assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'))
assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'))

for (const pathname of [
  '/favicon.ico',
  '/brand/orimia-icon-180.png?v=500',
  '/brand/orimia-icon-192.png?v=500',
  '/brand/orimia-icon-512.png?v=500',
  '/brand/orimia-icon-maskable-512.png?v=500',
]) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { 'Cache-Control': 'no-cache', 'User-Agent': userAgent },
  })
  assert.equal(response.status, 200, `${pathname} must return 200`)
  assert.match(response.headers.get('content-type') || '', /^image\/png/i)
  const signature = Buffer.from(await response.arrayBuffer()).subarray(0, 8).toString('hex')
  assert.equal(signature, '89504e470d0a1a0a', `${pathname} has an invalid PNG signature`)
}

const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' }),
})
assert.equal(adminLogin.status, 303)
const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(adminCookie, /^[^=]+=/)

for (const pathname of [
  '/admin/appointments',
  '/admin/customers?registrationStatus=registered',
  '/admin/customers/messages?chat=1',
  '/admin/customers/messages',
  '/admin/products',
]) {
  await fetchHtml(pathname, adminCookie)
}

console.log(JSON.stringify({
  ready: ready.status,
  publicPages: 5,
  adminPages: 5,
  release: ready.headers.get('x-lien-store-app-stability'),
  manifest: manifest.name,
}))
