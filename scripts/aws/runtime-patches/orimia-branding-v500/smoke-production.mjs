import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const htmlHeaders = {
  Accept: 'text/html',
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-v500-smoke/1.0',
}
const legacyBrand = /Salon\s+de\s+Lien|Salon\s+CRM|サロン・ド・リアン/i

function assertOrimiaHtml(pathname, html) {
  assert.doesNotMatch(html, legacyBrand, `${pathname} still contains the legacy brand`)
  assert.match(html, /ORIMIA/, `${pathname} does not contain ORIMIA`)
  assert.ok(html.includes('/orimia-brand-v500.js?v=500'), `${pathname} is missing the runtime brand script`)
  assert.ok(html.includes('/orimia.webmanifest?v=500'), `${pathname} is missing the web app manifest`)
  assert.ok(html.includes('/brand/orimia-icon-180.png?v=500'), `${pathname} is missing the Apple touch icon`)
}

async function fetchHtml(pathname, cookie = '') {
  const separator = pathname.includes('?') ? '&' : '?'
  const response = await fetch(`${baseUrl}${pathname}${separator}orimia-smoke=v500`, {
    redirect: 'manual',
    headers: { ...htmlHeaders, ...(cookie ? { cookie } : {}) },
  })
  assert.equal(response.status, 200, `${pathname} must return 200`)
  const html = await response.text()
  assertOrimiaHtml(pathname, html)
  return html
}

const ready = await fetch(`${baseUrl}/api/health/ready`, {
  headers: { 'Cache-Control': 'no-cache', 'User-Agent': htmlHeaders['User-Agent'] },
})
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-campaign-tablet-layout'), 'v499')
assert.equal(ready.headers.get('x-orimia-branding'), 'v500')

for (const pathname of ['/', '/privacy', '/terms', '/admin/login', '/u/login']) {
  await fetchHtml(pathname)
}

const manifestResponse = await fetch(`${baseUrl}/orimia.webmanifest?v=500`, {
  headers: { 'Cache-Control': 'no-cache', 'User-Agent': htmlHeaders['User-Agent'] },
})
assert.equal(manifestResponse.status, 200)
const manifest = await manifestResponse.json()
assert.equal(manifest.name, 'ORIMIA')
assert.equal(manifest.short_name, 'ORIMIA')
assert.equal(manifest.start_url, '/')
assert.equal(manifest.scope, '/')
assert.equal(manifest.display, 'standalone')
assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'))
assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'))

for (const pathname of [
  '/favicon.ico',
  '/brand/orimia-icon-32.png?v=500',
  '/brand/orimia-icon-180.png?v=500',
  '/brand/orimia-icon-192.png?v=500',
  '/brand/orimia-icon-512.png?v=500',
  '/brand/orimia-icon-maskable-512.png?v=500',
]) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { 'Cache-Control': 'no-cache', 'User-Agent': htmlHeaders['User-Agent'] },
  })
  assert.equal(response.status, 200, `${pathname} must return 200`)
  assert.match(response.headers.get('content-type') || '', /^image\/png/i, `${pathname} must be a PNG`)
  const signature = Buffer.from(await response.arrayBuffer()).subarray(0, 8).toString('hex')
  assert.equal(signature, '89504e470d0a1a0a', `${pathname} has an invalid PNG signature`)
}

const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products' }),
})
assert.equal(adminLogin.status, 303)
const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(adminCookie, /^[^=]+=/)
await fetchHtml('/admin/products', adminCookie)

const customerLogin = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' }),
})
assert.equal(customerLogin.status, 303)
const customerCookie = (customerLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(customerCookie, /^[^=]+=/)
await fetchHtml('/u/home', customerCookie)

console.log(JSON.stringify({
  ready: ready.status,
  publicPages: 5,
  admin: 200,
  customer: 200,
  manifest: manifest.name,
  iconTarget: 'https://salon-de-lien.com/',
}))
