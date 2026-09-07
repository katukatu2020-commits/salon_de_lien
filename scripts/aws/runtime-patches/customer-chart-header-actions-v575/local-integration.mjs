import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3152').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v575`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-chart-header-actions'), 'v575')
assert.equal(ready.headers.get('x-lien-customer-booking-check'), 'v574')
assert.equal(ready.headers.get('x-lien-customer-chart-route-scope'), 'v571')

const clientResponse = await fetch(`${baseUrl}/commercial-admin-v101.js?integration=v575`, { cache:'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
assert.match(client, /customer-chart-header-actions-v575/)
assert.match(client, /\[data-chart-latest-card-v561\] \.lien-chart-card-header > \.lien-chart-actions > \.lien-chart-button/)
assert.match(client, /margin: 0 !important;/)

console.log(JSON.stringify({
  release:'customer-chart-header-actions-v575',
  ready:true,
  commercialClient:true,
  chartScoped:true,
}))
