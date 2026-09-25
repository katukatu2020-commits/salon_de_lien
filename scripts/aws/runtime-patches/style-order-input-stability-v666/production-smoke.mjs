import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(baseUrl + '/api/health/ready', { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-style-order-input-stability'), 'v666')
assert.equal(ready.headers.get('x-lien-coupon-menu-prefill'), 'v665')

const stabilityAsset = await fetch(baseUrl + '/style-order-input-stability-v666.js?v=666-release1', { cache: 'no-store' })
assert.equal(stabilityAsset.status, 200)
const stabilitySource = await stabilityAsset.text()
assert.match(stabilitySource, /style-order-input-stability-v666/)
assert.match(stabilitySource, /const drafts = new Map\(\)/)
assert.match(stabilitySource, /transform: none !important/)

const styleAsset = await fetch(baseUrl + '/style-admin-controls-v618.js?v=661-order-recovery1', { cache: 'no-store' })
assert.equal(styleAsset.status, 200)
assert.match(await styleAsset.text(), /orimia:style-order-saved-v666/)

console.log(JSON.stringify({
  release: 'style-order-input-stability-v666',
  productionSmokeVerified: true,
}))
