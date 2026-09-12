import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

async function requiredResponse(pathname) {
  const response = await fetch(base + pathname, { redirect: 'manual' })
  assert.equal(response.status, 200, pathname + ' returned ' + response.status)
  return response
}

const health = await requiredResponse('/api/health/ready')
assert.equal(health.headers.get('x-lien-salon-onboarding-guides'), 'removed-v632')
assert.equal(health.headers.get('x-lien-dealer-pricing-pagination'), 'v631')

const tenant = await (await requiredResponse('/tenant-setup-client.js?v=632')).text()
assert.match(tenant, /salon-onboarding-guide-removal-v632/)
assert.match(tenant, /window\.__lienProductTourActive = false/)
assert.doesNotMatch(tenant, /const shouldOpen = !state\.setup\.legacy/)
assert.doesNotMatch(tenant, /WELCOME TO ORIMIA/)

const commercial = await (await requiredResponse('/commercial-admin-v136.js?v=632')).text()
assert.match(commercial, /<span class="ca-eyebrow">Store profile<\/span>/)
assert.doesNotMatch(commercial, /<div class="ca-setup-progress">/)
assert.doesNotMatch(commercial, /data-ca-open-setup/)
assert.match(commercial, /data-ca-store-form/)
assert.match(commercial, /data-ca-email-form/)

const settings = await fetch(base + '/admin/settings?registered=1', { redirect: 'manual' })
assert.ok([302, 303, 307, 308].includes(settings.status), 'Unauthenticated settings route did not redirect')
assert.match(settings.headers.get('location') || '', /^\/admin\/login/)

console.log(JSON.stringify({
  release: 'salon-onboarding-guide-removal-v632',
  productionVerified: true,
  firstUseGuidesRemoved: true,
  settingsAssetsVerified: true,
  unauthenticatedRouteVerified: true,
}))
