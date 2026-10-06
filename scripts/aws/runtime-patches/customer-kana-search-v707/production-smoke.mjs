import assert from 'node:assert/strict'
const base = process.env.ORIMIA_SMOKE_URL || 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready', { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-kana-search'), 'v707')
assert.equal(ready.headers.get('x-lien-campaign-coupon-confirm'), 'v706')
assert.equal(ready.headers.get('x-lien-dealer-order-flow'), 'v698')
for (const route of ['/admin/customers?q=' + encodeURIComponent('ヤマモトハナ'), '/customers?q=' + encodeURIComponent('ヤマモトハナ')]) {
  const response = await fetch(base + route, { redirect: 'manual' })
  assert.ok([302,303,307].includes(response.status), route + ' remains authenticated')
}
console.log('v707 production read-only smoke PASS: health, existing release markers and authenticated customer search')
