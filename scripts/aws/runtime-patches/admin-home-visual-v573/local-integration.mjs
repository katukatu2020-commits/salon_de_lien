import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3148').replace(/\/$/, '')

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/appointments' }),
  })
  assert.ok([302, 303].includes(response.status), `login failed with ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^lien_admin_session=/)
  return cookie
}

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v573`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-admin-home-visual'), 'v573')
assert.equal(ready.headers.get('x-lien-admin-shared-page-format'), 'v572')
assert.equal(ready.headers.get('x-lien-customer-home-branding'), 'v528')

const cookie = await login()
const headers = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }
for (const pathname of [
  '/admin/appointments',
  '/admin/customers',
  '/admin/products',
  '/admin/community',
  '/admin/owner-analytics',
  '/admin/products/orders',
  '/admin/settings',
]) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers })
  assert.equal(response.status, 200, `${pathname} failed`)
  const html = await response.text()
  assert.match(html, /class="admin-app-shell/, `${pathname}: admin shell is missing`)
  assert.match(html, /orimia-admin-home-visual-v573/, `${pathname}: shared home visual client is missing`)
  assert.match(html, /admin-home-visual-v573\.css/, `${pathname}: shared home visual styles are missing`)
}

const brandingResponse = await fetch(`${baseUrl}/api/lien-customer-home-branding?audience=staff`, {
  headers:{ Cookie:cookie, Accept:'application/json', 'Cache-Control':'no-cache' },
})
assert.equal(brandingResponse.status, 200)
const branding = await brandingResponse.json()
assert.equal(branding.success, true)
assert.equal(typeof branding.branding?.imageUrl, 'string')
assert.ok(Boolean(branding.branding.imageUrl))

const [scriptResponse, styleResponse] = await Promise.all([
  fetch(`${baseUrl}/admin-home-visual-v573.js?integration=v573`),
  fetch(`${baseUrl}/admin-home-visual-v573.css?integration=v573`),
])
assert.equal(scriptResponse.status, 200)
assert.equal(styleResponse.status, 200)
assert.match(await scriptResponse.text(), /__orimiaAdminHomeVisualV573/)
assert.match(await styleResponse.text(), /data-orimia-admin-home-visual-v573/)

console.log(JSON.stringify({
  release:'admin-home-visual-v573',
  integration:true,
  adminRoutes:7,
  organizationScopedImage:true,
  readOnly:true,
}))
