import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-store-frequency'), 'v668')
assert.equal(ready.headers.get('x-lien-style-order-focus-stability'), 'v667')
assert.equal(ready.headers.get('x-lien-customer-store-unlink'), 'v654')

const asset = await fetch(`${base}/customer-link-ui-v293.js?v=668-store-frequency1`, { cache: 'no-store' })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /dataset\.lienStoresV668/)
assert.doesNotMatch(source, /initialCount >= limit/)
assert.doesNotMatch(source, /登録できる美容室は最大/)

const api = await fetch(`${base}/api/lien-customer-stores`, { cache: 'no-store', redirect: 'manual' })
assert.equal(api.status, 401)
const page = await fetch(`${base}/u/stores`, { cache: 'no-store', redirect: 'manual' })
assert.equal(page.status, 401)

console.log(JSON.stringify({
  release: 'customer-store-frequency-v668',
  productionVerified: true,
  clientAssetVerified: true,
  customerRoutesProtected: true,
}))
