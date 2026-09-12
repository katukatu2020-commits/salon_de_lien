import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

async function get(pathname, options = {}) {
  return fetch(base + pathname, { cache:'no-store', redirect:'manual', ...options })
}

const health = await get('/api/health/ready')
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-style-detail-loading-recovery'), 'v639')
assert.equal(health.headers.get('x-lien-dealer-pricing-ime-search'), 'v638')
assert.equal(health.headers.get('x-lien-business-inquiries'), 'v637')
assert.equal(health.headers.get('x-lien-dealer-pricing-pagination'), 'v631')

const loaderResponse = await get('/ui-transition-v639.js?v=639-style-detail-recovery1')
assert.equal(loaderResponse.status, 200)
const loader = await loaderResponse.text()
assert.match(loader, /window\.__orimiaUiTransitionV639 = true/)
assert.match(loader, /function forceReveal\(reason\)/)
assert.match(loader, /forceReveal\('safety-timeout'\)/)
assert.match(loader, /scheduleStyleDetailReveal\('style-detail-mutation'\)/)

const styleResponse = await get('/style-system-integration-v602.js?v=639-loading-recovery1')
assert.equal(styleResponse.status, 200)
const style = await styleResponse.text()
assert.match(style, /orimia:style-detail-state-v639/)
assert.match(style, /Style detail request timed out/)

for (const pathname of ['/admin/community/production-v639-check', '/u/community/production-v639-check']) {
  const response = await get(pathname)
  assert.ok([302, 303, 307, 308].includes(response.status), `${pathname} did not redirect without a session`)
}

console.log(JSON.stringify({
  release:'style-detail-loading-recovery-v639',
  productionVerified:true,
  readinessVerified:true,
  loaderRecoveryAssetVerified:true,
  boundedStyleRequestVerified:true,
  protectedRoutesVerified:true,
}))
