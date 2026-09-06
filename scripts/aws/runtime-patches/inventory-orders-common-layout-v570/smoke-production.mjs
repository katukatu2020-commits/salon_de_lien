import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function waitForReady() {
  let lastStatus = 0
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/health/ready?smoke=v570-${Date.now()}-${attempt}`, { cache:'no-store' })
    lastStatus = response.status
    if (
      response.status === 200
      && response.headers.get('x-lien-inventory-orders-common-layout') === 'v570'
      && response.headers.get('x-lien-receipt-roll-print') === 'v569'
      && response.headers.get('x-lien-style-detail-three-photo-layout') === 'v568'
      && response.headers.get('x-lien-customer-chart-delete') === 'v567'
      && response.headers.get('x-lien-style-post-directions') === 'v566'
      && response.headers.get('x-lien-daily-sales-print-fit') === 'v563'
    ) return
    await sleep(1500)
  }
  assert.fail(`production readiness did not reach v570; last status ${lastStatus}`)
}

await waitForReady()

const unauthenticated = await fetch(`${baseUrl}/admin/products/orders`, { redirect:'manual' })
assert.ok([302, 303, 307, 308].includes(unauthenticated.status))
const loginLocation = unauthenticated.headers.get('location') || ''
assert.match(loginLocation, /^\/admin\/login\?next=/)
assert.equal(new URL(loginLocation, baseUrl).searchParams.get('next'), '/admin/products/orders')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)
const authenticatedHeaders = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }

const page = await fetch(`${baseUrl}/admin/products/orders?smoke=v570`, { headers:authenticatedHeaders })
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /admin-app-shell/)
assert.match(html, /admin-desktop-sidebar/)
assert.match(html, /admin-desktop-header/)
assert.match(html, /orimia-inventory-orders-common-style-v570/)
assert.match(html, /orimia-inventory-orders-common-script-v570/)
assert.doesNotMatch(html, /class="wo-admin-layout"/)

const bootstrap = await fetch(`${baseUrl}/api/admin/wholesale/bootstrap?smoke=v570`, {
  headers:{ Cookie:cookie, Accept:'application/json', 'Cache-Control':'no-cache' },
})
assert.equal(bootstrap.status, 200)
const payload = await bootstrap.json()
assert.ok(Array.isArray(payload.products))

const products = await fetch(`${baseUrl}/admin/products?smoke=v570`, { headers:authenticatedHeaders })
assert.equal(products.status, 200)
const productsHtml = await products.text()
assert.match(productsHtml, /admin-app-shell/)
assert.doesNotMatch(productsHtml, /orimia-inventory-orders-common-script-v570/)

const dealer = await fetch(`${baseUrl}/dealer/login?smoke=v570`, { headers:{ Accept:'text/html', 'Cache-Control':'no-cache' } })
assert.equal(dealer.status, 200)
const dealerHtml = await dealer.text()
assert.match(dealerHtml, /class="wo-auth-body"/)
assert.match(dealerHtml, /action="\/api\/dealer\/auth\/login"/)
assert.doesNotMatch(dealerHtml, /orimia-inventory-orders-common-script-v570/)

const [script, style] = await Promise.all([
  fetch(`${baseUrl}/inventory-orders-common-layout-v570.js?smoke=v570`, { headers:{ 'Cache-Control':'no-cache' } }),
  fetch(`${baseUrl}/inventory-orders-common-layout-v570.css?smoke=v570`, { headers:{ 'Cache-Control':'no-cache' } }),
])
assert.equal(script.status, 200)
assert.equal(style.status, 200)
assert.match(await script.text(), /__orimiaInventoryOrdersCommonLayoutV570/)
assert.match(await style.text(), /white-space:\s*nowrap/)

console.log(JSON.stringify({
  release:'inventory-orders-common-layout-v570',
  production:true,
  commonShell:true,
  canonicalLoginReturn:true,
  wholesaleApi:true,
  products:Number(payload.products.length),
  readOnly:true,
}))
