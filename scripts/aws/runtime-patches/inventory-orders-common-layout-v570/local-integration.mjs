import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3145').replace(/\/$/, '')

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' }),
  })
  assert.ok([302, 303].includes(response.status), `login failed with ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

function assertSharedShell(html, label) {
  assert.match(html, /admin-app-shell/, `${label}: shared application shell is missing`)
  assert.match(html, /admin-desktop-sidebar/, `${label}: shared sidebar is missing`)
  assert.match(html, /admin-desktop-header/, `${label}: shared header is missing`)
  assert.match(html, /\/_next\/static\/css\//, `${label}: Next.js application styles are missing`)
}

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v570`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-inventory-orders-common-layout'), 'v570')
assert.equal(ready.headers.get('x-lien-receipt-roll-print'), 'v569')
assert.equal(ready.headers.get('x-lien-style-detail-three-photo-layout'), 'v568')

const unauthenticated = await fetch(`${baseUrl}/admin/products/orders`, { redirect:'manual' })
assert.ok([302, 303, 307, 308].includes(unauthenticated.status))
const loginLocation = unauthenticated.headers.get('location') || ''
assert.match(loginLocation, /^\/admin\/login\?next=/)
assert.equal(new URL(loginLocation, baseUrl).searchParams.get('next'), '/admin/products/orders')

const cookie = await login()
const authenticatedHeaders = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }

for (const query of ['', '?view=inventory', '?view=history']) {
  const response = await fetch(`${baseUrl}/admin/products/orders${query}`, { headers:authenticatedHeaders })
  assert.equal(response.status, 200, `inventory route ${query || 'order'} failed`)
  const html = await response.text()
  assertSharedShell(html, `inventory route ${query || 'order'}`)
  assert.match(html, /orimia-inventory-orders-common-style-v570/)
  assert.match(html, /orimia-inventory-orders-common-script-v570/)
  assert.match(html, /orimia-inventory-orders-workspace-style-v543/)
  assert.doesNotMatch(html, /class="wo-admin-layout"/, 'legacy standalone shell was rendered')
}

const productsResponse = await fetch(`${baseUrl}/admin/products`, { headers:authenticatedHeaders })
assert.equal(productsResponse.status, 200)
const productsHtml = await productsResponse.text()
assertSharedShell(productsHtml, 'product shelf')
assert.doesNotMatch(productsHtml, /orimia-inventory-orders-common-script-v570/)

const dealerResponse = await fetch(`${baseUrl}/dealer/login`, { headers:{ Accept:'text/html', 'Cache-Control':'no-cache' } })
assert.equal(dealerResponse.status, 200)
const dealerHtml = await dealerResponse.text()
assert.match(dealerHtml, /class="wo-auth-body"/)
assert.match(dealerHtml, /action="\/api\/dealer\/auth\/login"/)
assert.doesNotMatch(dealerHtml, /orimia-inventory-orders-common-script-v570/)

const bootstrap = await fetch(`${baseUrl}/api/admin/wholesale/bootstrap`, {
  headers:{ Cookie:cookie, Accept:'application/json', 'Cache-Control':'no-cache' },
})
assert.equal(bootstrap.status, 200)
const bootstrapPayload = await bootstrap.json()
assert.ok(Array.isArray(bootstrapPayload.products))
assert.ok(Array.isArray(bootstrapPayload.contracts))
assert.ok(Array.isArray(bootstrapPayload.orders))

const [scriptResponse, styleResponse, workspaceStyleResponse, commercialResponse] = await Promise.all([
  fetch(`${baseUrl}/inventory-orders-common-layout-v570.js?integration=v570`),
  fetch(`${baseUrl}/inventory-orders-common-layout-v570.css?integration=v570`),
  fetch(`${baseUrl}/wholesale-ordering-v543.css?integration=v570`),
  fetch(`${baseUrl}/commercial-admin-v101.js?integration=v570`),
])
for (const response of [scriptResponse, styleResponse, workspaceStyleResponse, commercialResponse]) assert.equal(response.status, 200)
assert.match(await scriptResponse.text(), /__orimiaInventoryOrdersCommonLayoutV570/)
assert.match(await styleResponse.text(), /white-space:\s*nowrap/)
const workspaceStyle = await workspaceStyleResponse.text()
assert.match(workspaceStyle, /\.wo-app-root \*/)
assert.doesNotMatch(workspaceStyle, /\n\* \{ box-sizing: border-box; \}/)
assert.match(await commercialResponse.text(), /inventory-orders-common-layout-v570-hard-navigation/)

console.log(JSON.stringify({
  release:'inventory-orders-common-layout-v570',
  commonShell:true,
  canonicalLoginReturn:true,
  standaloneShellRemoved:true,
  views:['order', 'inventory', 'history'],
  products:Number(bootstrapPayload.products.length),
  readOnly:true,
}))
