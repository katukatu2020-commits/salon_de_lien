import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-store-unlink'), 'v654')
assert.equal(ready.headers.get('x-lien-dealer-password-common-layout'), 'v653')
assert.equal(ready.headers.get('x-lien-customer-store-limit'), 'v642')

const asset = await fetch(`${base}/customer-link-ui-v293.js?v=654-store-unlink1`, { cache: 'no-store' })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /const finalStoreNote = button\.dataset\.lastStore === 'true'/)
assert.match(source, /if \(result\.redirect\) location\.assign\(result\.redirect\)/)

const api = await fetch(`${base}/api/lien-customer-stores`, { cache: 'no-store', redirect: 'manual' })
assert.equal(api.status, 401)
const page = await fetch(`${base}/u/stores`, { cache: 'no-store', redirect: 'manual' })
assert.equal(page.status, 401)

console.log(JSON.stringify({
  release: 'customer-store-unlink-v654',
  productionVerified: true,
  clientAssetVerified: true,
  customerRoutesProtected: true,
}))
