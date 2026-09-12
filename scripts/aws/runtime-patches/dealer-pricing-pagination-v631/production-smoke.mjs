import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

async function requiredResponse(pathname) {
  const response = await fetch(base + pathname, { redirect: 'manual' })
  assert.equal(response.status, 200, pathname + ' returned ' + response.status)
  return response
}

const health = await requiredResponse('/api/health/ready')
assert.equal(health.headers.get('x-lien-dealer-pricing-pagination'), 'v631')
assert.equal(health.headers.get('x-lien-list-pagination'), 'v628')

const dealerClient = await (await requiredResponse('/wholesale-ordering-client-v543.js?v=631-pricing-pagination1')).text()
assert.match(dealerClient, /data-action="dealer-pricing-page"/)
assert.match(dealerClient, /bootstrapParams\.set\('view', 'pricing'\)/)
assert.match(dealerClient, /bootstrapParams\.set\('pricingPage'/)
assert.match(dealerClient, /pricingSearchTimer = setTimeout/)
assert.match(dealerClient, /Array\.from\(dealer\.pricingDraft\.entries\(\)\)/)

const dealerCss = await (await requiredResponse('/wholesale-ordering-v543.css?v=631-pricing-pagination1')).text()
assert.match(dealerCss, /dealer-pricing-pagination-v631/)
assert.match(dealerCss, /\.wo-pricing-pager-v631/)

const unauthenticated = await fetch(base + '/dealer/pricing', { redirect: 'manual' })
assert.ok([302, 303, 307, 308].includes(unauthenticated.status), 'Unauthenticated pricing route did not redirect')
assert.match(unauthenticated.headers.get('location') || '', /^\/dealer\/login/)

console.log(JSON.stringify({
  release: 'dealer-pricing-pagination-v631',
  productionVerified: true,
  readinessVerified: true,
  dealerAssetsVerified: true,
  unauthenticatedRouteVerified: true,
}))
