import assert from 'node:assert/strict'

const base = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const health = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-shift-customer-search'), 'v662')
assert.equal(health.headers.get('x-lien-style-order-loading-recovery'), 'v661')

const asset = await fetch(`${base}/staff-breaks-checkout-menu-client-v442.js?v=662-customer-search1`, { cache: 'no-store' })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /__orimiaShiftCustomerSearchV662/)
assert.match(source, /item\.search\.includes\(query\)/)
assert.match(source, /compositionstart/)
assert.match(source, /shift-customer-search-v662/)

console.log(JSON.stringify({ release: 'shift-customer-search-v662', productionSmokeVerified: true }))
