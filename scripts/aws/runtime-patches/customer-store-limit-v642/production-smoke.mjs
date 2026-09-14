import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-store-limit'), 'v642')
assert.equal(ready.headers.get('x-lien-search-input-stability'), 'v641')
assert.equal(ready.headers.get('x-lien-customer-store-list'), 'v595')

const asset = await fetch(`${base}/customer-link-ui-v293.js?v=642-store-limit1`, { cache: 'no-store' })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /dataset\.lienStoresV642/)
assert.match(source, /data-remove-store/)
assert.match(source, /最大\$\{limit\}店舗/)

const api = await fetch(`${base}/api/lien-customer-stores`, { cache: 'no-store', redirect: 'manual' })
assert.equal(api.status, 401)
const page = await fetch(`${base}/u/stores`, { cache: 'no-store', redirect: 'manual' })
assert.ok([302, 303, 307, 308].includes(page.status))

console.log(JSON.stringify({ release: 'customer-store-limit-v642', productionVerified: true, clientAssetVerified: true, customerRoutesProtected: true }))
