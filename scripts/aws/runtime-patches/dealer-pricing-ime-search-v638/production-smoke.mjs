import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

async function requiredResponse(pathname) {
  const response = await fetch(base + pathname, { redirect:'manual', cache:'no-store' })
  assert.equal(response.status, 200, pathname + ' returned ' + response.status)
  return response
}

const health = await requiredResponse('/api/health/ready')
assert.equal(health.headers.get('x-lien-dealer-pricing-ime-search'), 'v638')
assert.equal(health.headers.get('x-lien-business-inquiries'), 'v637')
assert.equal(health.headers.get('x-lien-dealer-pricing-pagination'), 'v631')

const client = await (await requiredResponse('/wholesale-ordering-client-v543.js?v=638-ime-safe-search1')).text()
assert.match(client, /pricingSearchComposing: false/)
assert.match(client, /root\.addEventListener\('compositionstart'/)
assert.match(client, /root\.addEventListener\('compositionend'/)
assert.match(client, /function renderDealerPricingResults\(\)/)
assert.match(client, /reloadDealer\(false, 'pricing-results'\)/)
assert.match(client, /currentForm\.replaceWith\(nextForm\)/)

const unauthenticated = await fetch(base + '/dealer/pricing', { redirect:'manual' })
assert.ok([302, 303, 307, 308].includes(unauthenticated.status), 'Unauthenticated pricing route did not redirect')
assert.match(unauthenticated.headers.get('location') || '', /^\/dealer\/login/)

console.log(JSON.stringify({
  release:'dealer-pricing-ime-search-v638',
  productionVerified:true,
  readinessVerified:true,
  imeLifecycleVerified:true,
  stableSearchRenderingVerified:true,
  unauthenticatedRouteVerified:true,
}))
