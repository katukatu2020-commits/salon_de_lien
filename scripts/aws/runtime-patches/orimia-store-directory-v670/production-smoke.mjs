import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-orimia-store-directory'), 'v670')
assert.equal(ready.headers.get('x-lien-admin-chat-reply'), 'v669')
assert.equal(ready.headers.get('x-lien-customer-store-frequency'), 'v668')

for (const assetPath of [
  '/customer-link-ui-v424.js?v=670-orimia-directory1',
  '/customer-experience-v503.js?v=670-orimia-directory1',
]) {
  const asset = await fetch(base + assetPath, { cache: 'no-store' })
  assert.equal(asset.status, 200)
  const source = await asset.text()
  if (assetPath.includes('customer-link')) {
    assert.match(source, /dataset\.lienStoresV670/)
    assert.doesNotMatch(source, /action: 'unlink'/)
    assert.doesNotMatch(source, /action: 'link'/)
  } else {
    assert.match(source, /サロンを探す/)
    assert.doesNotMatch(source, /登録済みの店舗/)
  }
}

const api = await fetch(`${base}/api/lien-customer-stores`, { cache: 'no-store', redirect: 'manual' })
assert.equal(api.status, 401)
const page = await fetch(`${base}/u/stores`, { cache: 'no-store', redirect: 'manual' })
assert.equal(page.status, 401)

console.log(JSON.stringify({
  release: 'orimia-store-directory-v670',
  productionVerified: true,
  assetsVerified: true,
  customerRoutesProtected: true,
}))
