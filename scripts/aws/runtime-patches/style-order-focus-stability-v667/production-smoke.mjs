import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(baseUrl + '/api/health/ready', { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-style-order-focus-stability'), 'v667')
assert.equal(ready.headers.get('x-lien-style-order-input-stability'), 'v666')
assert.equal(ready.headers.get('x-lien-coupon-menu-prefill'), 'v665')

const stabilityAsset = await fetch(baseUrl + '/style-order-focus-stability-v667.js?v=667-release1', { cache: 'no-store' })
assert.equal(stabilityAsset.status, 200)
const stabilitySource = await stabilityAsset.text()
assert.match(stabilitySource, /style-order-focus-stability-v667/)
assert.match(stabilitySource, /const drafts = new Map\(\)/)
assert.match(stabilitySource, /root\.queueMicrotask\(restoreDrafts\)/)
assert.doesNotMatch(stabilitySource, /requestAnimationFrame/)
assert.match(stabilitySource, /transform: none !important/)

const styleAsset = await fetch(baseUrl + '/style-admin-controls-v618.js?v=661-order-recovery1', { cache: 'no-store' })
assert.equal(styleAsset.status, 200)
const styleSource = await styleAsset.text()
assert.match(styleSource, /orimia:style-order-saved-v666/)
assert.equal(styleSource.split('queueMicrotask(scan)').length - 1, 2)
assert.doesNotMatch(styleSource, /requestAnimationFrame\(scan\)/)

console.log(JSON.stringify({
  release: 'style-order-focus-stability-v667',
  productionSmokeVerified: true,
}))
