import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3146').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v571`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-chart-route-scope'), 'v571')
assert.equal(ready.headers.get('x-lien-inventory-orders-common-layout'), 'v570')
assert.equal(ready.headers.get('x-lien-customer-chart-delete'), 'v567')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)
const headers = { Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' }

const ledgerResponse = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2025-01-01&to=2027-12-31`, { headers:{ Cookie:cookie } })
assert.equal(ledgerResponse.status, 200)
const ledger = await ledgerResponse.json()
const customerId = ledger.rows.find(row => row.customerId)?.customerId
assert.ok(customerId, 'customer fixture is missing')

const customerPage = await fetch(`${baseUrl}/admin/customers/${encodeURIComponent(customerId)}`, { headers })
assert.equal(customerPage.status, 200)
const customerHtml = await customerPage.text()
assert.match(customerHtml, /実際のお名前/)
assert.match(customerHtml, /髪・接客情報/)
assert.ok(customerHtml.includes(customerId))

const messagesPage = await fetch(`${baseUrl}/admin/customers/messages`, { headers })
assert.equal(messagesPage.status, 200)
const messagesHtml = await messagesPage.text()
assert.match(messagesHtml, /顧客へのお知らせ・クーポン配信/)
assert.doesNotMatch(messagesHtml, /実際のお名前/)

const clientResponse = await fetch(`${baseUrl}/commercial-admin-v101.js?integration=v571`, { cache:'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
assert.match(client, /__lienCustomerChartRouteScopeV571/)
assert.match(client, /RESERVED_CUSTOMER_IDS = new Set\(\['messages'\]\)/)
assert.match(client, /input\[name="customerId"\]/)

console.log(JSON.stringify({
  release:'customer-chart-route-scope-v571',
  ready:true,
  customerId,
  customerDetail:true,
  messagesRoute:true,
  readOnly:true,
}))
