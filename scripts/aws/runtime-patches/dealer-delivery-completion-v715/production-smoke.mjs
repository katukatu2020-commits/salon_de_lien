import assert from 'node:assert/strict'
const base = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready')
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-delivery'), 'v715')
assert.equal(ready.headers.get('x-lien-dealer-salon-picker'), 'v714')
assert.equal(ready.headers.get('x-lien-dealer-order-flow'), 'v698')
const client = await fetch(base + '/dealer-orders-v715.js')
assert.equal(client.status, 200)
const source = await client.text()
assert(source.includes('if (canEditDealerOrderLines(dealer.detail)) payload.lines = detailLinesPayload()'))
assert(source.includes("if (dealer.detail.tracked) { location.href = '/dealer/fulfillment?order='"))
for (const route of ['orders', 'fulfillment', 'receivables']) {
  const response = await fetch(base + '/dealer/' + route, { redirect: 'manual' })
  assert([302, 303].includes(response.status), route)
  assert(response.headers.get('location').startsWith('/dealer/login'))
}
console.log('v715 production PASS: delivery client, retained ERP/picker releases, health and authentication')
