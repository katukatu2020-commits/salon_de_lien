import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3147').replace(/\/$/, '')

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' }),
  })
  assert.ok([302, 303].includes(response.status), `login failed with ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^lien_admin_session=/)
  return cookie
}

function assertSharedShell(html, label) {
  assert.match(html, /admin-app-shell/, `${label}: shared application shell is missing`)
  assert.match(html, /admin-main-content/, `${label}: shared main content is missing`)
  assert.match(html, /admin-desktop-sidebar/, `${label}: shared sidebar is missing`)
  assert.match(html, /admin-desktop-header/, `${label}: shared header is missing`)
  assert.match(html, /orimia-admin-workspace-layout-v572/, `${label}: shared workspace runtime is missing`)
}

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v572`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-admin-shared-page-format'), 'v572')
assert.equal(ready.headers.get('x-lien-customer-chart-route-scope'), 'v571')
assert.equal(ready.headers.get('x-lien-inventory-orders-common-layout'), 'v570')

const unauthenticated = await fetch(`${baseUrl}/admin/products/orders`, { redirect:'manual' })
assert.ok([302, 303, 307, 308].includes(unauthenticated.status))
assert.equal(new URL(unauthenticated.headers.get('location'), baseUrl).searchParams.get('next'), '/admin/products/orders')

const cookie = await login()
const headers = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }

for (const query of ['', '?view=inventory', '?view=history']) {
  const response = await fetch(`${baseUrl}/admin/products/orders${query}`, { headers })
  assert.equal(response.status, 200, `inventory route ${query || 'order'} failed`)
  const html = await response.text()
  assertSharedShell(html, `inventory route ${query || 'order'}`)
  assert.match(html, /orimia-inventory-orders-common-script-v572/)
  assert.match(html, /inventory-orders-common-layout-v572\.css/)
  assert.doesNotMatch(html, /orimia-inventory-orders-common-script-v570/)
  assert.doesNotMatch(html, /class="wo-admin-layout"/)
}

for (const pathname of ['/admin/products', '/admin/owner-analytics', '/admin/owner-analytics?salesLedger=1']) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers })
  assert.equal(response.status, 200, `${pathname} failed`)
  const html = await response.text()
  assertSharedShell(html, pathname)
  if (pathname === '/admin/products') assert.doesNotMatch(html, /orimia-inventory-orders-common-script-v572/)
}

const bootstrap = await fetch(`${baseUrl}/api/admin/wholesale/bootstrap`, {
  headers:{ Cookie:cookie, Accept:'application/json', 'Cache-Control':'no-cache' },
})
assert.equal(bootstrap.status, 200)
const bootstrapPayload = await bootstrap.json()
assert.ok(Array.isArray(bootstrapPayload.products))
assert.ok(Array.isArray(bootstrapPayload.contracts))
assert.ok(Array.isArray(bootstrapPayload.orders))

const assets = await Promise.all([
  fetch(`${baseUrl}/admin-workspace-layout-v572.js?integration=v572`),
  fetch(`${baseUrl}/admin-workspace-layout-v572.css?integration=v572`),
  fetch(`${baseUrl}/inventory-orders-common-layout-v572.js?integration=v572`),
  fetch(`${baseUrl}/inventory-orders-common-layout-v572.css?integration=v572`),
])
for (const response of assets) assert.equal(response.status, 200)
assert.match(await assets[0].text(), /__orimiaAdminWorkspaceV572/)
assert.match(await assets[1].text(), /data-orimia-admin-workspace-source-v572/)
assert.match(await assets[2].text(), /__orimiaInventoryOrdersCommonLayoutV572/)
assert.match(await assets[3].text(), /data-orimia-admin-workspace-root-v572="inventory-orders"/)

console.log(JSON.stringify({
  release:'admin-shared-page-format-v572',
  integration:true,
  sharedShell:true,
  inventoryViews:['order', 'inventory', 'history'],
  salesLedger:true,
  products:Number(bootstrapPayload.products.length),
  readOnly:true,
}))
