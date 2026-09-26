import assert from 'node:assert/strict'
const base = 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready')
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('X-Lien-Style-Mobile-Stability'), 'v676')
assert.equal(ready.headers.get('X-Lien-Salon-Branch-Inquiry'), 'v675')
const client = await fetch(base + '/content-edit-delete-client-v615.js?v=676-owner1')
assert.equal(client.status, 200)
assert.match(await client.text(), /modernStyleListOwnsPageV676/)
const css = await fetch(base + '/style-admin-controls-v618.css?v=676-focus1')
assert.equal(css.status, 200)
assert.match(await css.text(), /style-mobile-stability-v676/)
console.log('v676 production read-only smoke passed')
