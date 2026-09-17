import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-sales-ledger-product-names'), 'v655')
assert.equal(ready.headers.get('x-lien-customer-store-unlink'), 'v654')
assert.equal(ready.headers.get('x-lien-sales-ledger-daily-summary'), 'v537')

const asset = await fetch(`${base}/sales-ledger-v318.js?v=655-product-names1`, { cache: 'no-store' })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /function productLinesMarkup\(row\)/)
assert.match(source, /class="sl-product-name"/)
assert.match(source, /施術・商品・メニュー・メモ/)
assert.doesNotMatch(source, /<td>\$\{row\.productCount \?/)

const api = await fetch(`${base}/api/admin/sales-ledger`, { cache: 'no-store', redirect: 'manual' })
assert.equal(api.status, 401)

console.log(JSON.stringify({
  release: 'sales-ledger-product-names-v655',
  productionVerified: true,
  clientAssetVerified: true,
  protectedApiVerified: true,
}))
