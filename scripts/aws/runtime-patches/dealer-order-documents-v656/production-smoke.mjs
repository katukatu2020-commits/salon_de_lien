import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-order-documents'), 'v656')
assert.equal(ready.headers.get('x-lien-sales-ledger-product-names'), 'v655')
assert.equal(ready.headers.get('x-lien-dealer-password-common-layout'), 'v653')

const clientResponse = await fetch(`${base}/wholesale-ordering-client-v543.js?v=656-order-documents1`, { cache: 'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
assert.match(client, /function orderDocumentActions\(order\)/)
assert.match(client, /\/delivery-note/)
assert.match(client, /\/invoice/)
assert.match(client, /\/export\.csv/)
assert.match(client, /wo-dialog-document-actions-v656/)

const cssResponse = await fetch(`${base}/wholesale-ordering-v543.css?v=656-order-documents1`, { cache: 'no-store' })
assert.equal(cssResponse.status, 200)
const css = await cssResponse.text()
assert.match(css, /dealer-order-documents-v656/)
assert.match(css, /wo-order-document-actions-v656/)

for (const path of [
  '/dealer/orders/production-smoke-v656/delivery-note',
  '/dealer/orders/production-smoke-v656/invoice',
  '/dealer/orders/production-smoke-v656/export.csv',
]) {
  const response = await fetch(base + path, { cache: 'no-store', redirect: 'manual' })
  assert.equal(response.status, 302, `${path} must require dealer authentication`)
  assert.match(response.headers.get('location') || '', /^\/dealer\/login\?next=/)
}

console.log(JSON.stringify({
  release: 'dealer-order-documents-v656',
  productionVerified: true,
  dealerDocumentUi: true,
  protectedRoutes: true,
}))
