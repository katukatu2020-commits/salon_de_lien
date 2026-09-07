import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function waitForReady() {
  let lastStatus = 0
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/health/ready?smoke=v571-${Date.now()}-${attempt}`, { cache:'no-store' })
    lastStatus = response.status
    if (
      response.status === 200
      && response.headers.get('x-lien-customer-chart-route-scope') === 'v571'
      && response.headers.get('x-lien-inventory-orders-common-layout') === 'v570'
      && response.headers.get('x-lien-customer-chart-delete') === 'v567'
      && response.headers.get('x-lien-customer-chart-attachments') === 'v564'
    ) return
    await sleep(1500)
  }
  assert.fail(`production readiness did not reach v571; last status ${lastStatus}`)
}

await waitForReady()

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
assert.ok(customerId)

for (const pathname of [`/admin/customers/${encodeURIComponent(customerId)}`, '/admin/customers/messages']) {
  const response = await fetch(`${baseUrl}${pathname}?smoke=v571`, { headers })
  assert.equal(response.status, 200, `${pathname} failed`)
  const html = await response.text()
  assert.match(html, /admin-app-shell/)
}

const clientResponse = await fetch(`${baseUrl}/commercial-admin-v101.js?smoke=v571-${Date.now()}`, { cache:'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
assert.match(client, /__lienCustomerChartRouteScopeV571/)
assert.match(client, /RESERVED_CUSTOMER_IDS = new Set\(\['messages'\]\)/)
assert.match(client, /document\.querySelectorAll\('\.admin-app-shell \.admin-main-content'\)/)
assert.doesNotMatch(client, /else main\.appendChild\(card\)/)

console.log(JSON.stringify({
  release:'customer-chart-route-scope-v571',
  production:true,
  customerDetail:true,
  messagesExcluded:true,
  staleUiCleanup:true,
  readOnly:true,
}))
