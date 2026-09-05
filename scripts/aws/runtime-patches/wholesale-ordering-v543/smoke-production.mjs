import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v543`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-wholesale-ordering'), 'v543')
assert.equal(ready.headers.get('x-lien-sales-ledger-staff-multiselect'), 'v542')
assert.equal(ready.headers.get('x-lien-daily-sales-complete-print'), 'v541')
assert.equal(ready.headers.get('x-lien-receipt-thermal-print'), 'v540')

const dealerLogin = await fetch(`${baseUrl}/dealer/login`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(dealerLogin.status, 200)
assert.match(await dealerLogin.text(), /ディーラーログイン/)

const unauthenticatedDealer = await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers: { Accept: 'application/json' } })
assert.equal(unauthenticatedDealer.status, 401)
const unauthenticatedAdmin = await fetch(`${baseUrl}/api/admin/wholesale/bootstrap`, { headers: { Accept: 'application/json' } })
assert.equal(unauthenticatedAdmin.status, 401)

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products/orders' }),
})
assert.ok([302, 303].includes(login.status), `admin login failed with ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)
const headers = { Cookie: cookie, 'Cache-Control': 'no-cache', Accept: 'application/json' }

const page = await fetch(`${baseUrl}/admin/products/orders`, { headers })
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /在庫管理・発注/)
assert.match(html, /wholesale-ordering-client-v543\.js/)

const bootstrap = await fetch(`${baseUrl}/api/admin/wholesale/bootstrap`, { headers })
assert.equal(bootstrap.status, 200)
const payload = await bootstrap.json()
assert.equal(payload.ok, true)
assert.ok(payload.organization?.id)
assert.ok(Array.isArray(payload.products) && payload.products.length > 0)
assert.ok(Array.isArray(payload.contracts))
assert.ok(Array.isArray(payload.orders))

const client = await fetch(`${baseUrl}/wholesale-ordering-client-v543.js?v=543`, { headers })
assert.equal(client.status, 200)
assert.match(await client.text(), /受注を確定/)
const styles = await fetch(`${baseUrl}/wholesale-ordering-v543.css?v=543`, { headers })
assert.equal(styles.status, 200)
assert.match(await styles.text(), /@page \{ size: A4 portrait/)

const commercial = await fetch(`${baseUrl}/commercial-admin-v101.js?smoke=v543`, { headers })
assert.equal(commercial.status, 200)
const commercialText = await commercial.text()
assert.match(commercialText, /__orimiaWholesaleOrderingV543/)
assert.doesNotMatch(commercialText, /inventory: \{ title: '商品在庫設定'/)

console.log(JSON.stringify({
  release: 'wholesale-ordering-v543',
  productionReady: true,
  organization: payload.organization.name,
  products: payload.products.length,
  contracts: payload.contracts.length,
  orders: payload.orders.length,
  dealerPortalProtected: true,
}))
