import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

async function requiredResponse(pathname) {
  const response = await fetch(base + pathname, { redirect: 'manual', cache: 'no-store' })
  assert.equal(response.status, 200, pathname + ' returned ' + response.status)
  return response
}

const health = await requiredResponse('/api/health/ready')
assert.equal(health.headers.get('x-lien-search-input-stability'), 'v641')
assert.equal(health.headers.get('x-lien-style-list-performance'), 'v640')
assert.equal(health.headers.get('x-lien-dealer-pricing-ime-search'), 'v638')

const client = await (await requiredResponse('/wholesale-ordering-client-v543.js?v=641-search-input-stability1')).text()
assert.match(client, /productSearchComposing: false/)
assert.match(client, /function renderSalonSearchResults\(\)/)
assert.match(client, /function renderDealerProductResults\(\)/)
assert.match(client, /function renderDealerLocalSearchResults\(kind\)/)
assert.match(client, /function scheduleDealerProductSearch\(input\)/)
assert.match(client, /reloadDealer\(false, 'product-results'\)/)
assert.match(client, /function scheduleDealerPricingSearch\(input\)/)

const salonLoader = await (await requiredResponse('/inventory-orders-common-layout-v572.js?v=641-search-input-stability1')).text()
assert.match(salonLoader, /wholesale-ordering-client-v543\.js\?v=641-search-input-stability1/)

for (const pathname of ['/dealer/products', '/dealer/orders', '/dealer/salons', '/dealer/pricing']) {
  const response = await fetch(base + pathname, { redirect: 'manual', cache: 'no-store' })
  assert.ok([302, 303, 307, 308].includes(response.status), pathname + ' did not require authentication')
  assert.match(response.headers.get('location') || '', /^\/dealer\/login/)
}

console.log(JSON.stringify({
  release: 'search-input-stability-v641',
  productionVerified: true,
  stableSearchAssetVerified: true,
  protectedDealerRoutesVerified: true,
}))
