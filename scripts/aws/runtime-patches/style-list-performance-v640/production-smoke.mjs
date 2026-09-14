import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

async function get(pathname, options = {}) {
  return fetch(base + pathname, { cache: 'no-store', redirect: 'manual', ...options })
}

async function requiredText(pathname) {
  const response = await get(pathname)
  assert.equal(response.status, 200, `${pathname} returned ${response.status}`)
  return response.text()
}

const health = await get('/api/health/ready')
assert.equal(health.status, 200)
for (const [header, value] of [
  ['x-lien-style-list-performance', 'v640'],
  ['x-lien-style-detail-loading-recovery', 'v639'],
  ['x-lien-dealer-pricing-ime-search', 'v638'],
  ['x-lien-business-inquiries', 'v637'],
  ['x-lien-customer-profile-name-fields', 'v636'],
  ['x-lien-booking-confirmation-name', 'v635'],
  ['x-lien-style-demo-ordering', 'v634'],
  ['x-lien-list-pagination', 'v628'],
  ['x-lien-password-visibility', 'v627'],
]) assert.equal(health.headers.get(header), value, `${header} is not ready`)

const customerClient = await requiredText('/style-community-controls-v610.js?v=640-performance1')
assert.match(customerClient, /orimiaStyleListMountedV640/)
assert.match(customerClient, /orimia:style-list-state-v640/)
assert.match(customerClient, /index > 1/)
assert.match(customerClient, /8000/)

const adminClient = await requiredText('/style-admin-controls-v618.js?v=640-performance1')
assert.match(adminClient, /orimia:style-list-state-v640/)
assert.match(adminClient, /index > 3/)
assert.match(adminClient, /data-orimia-style-post-id-v625/)
assert.match(adminClient, /displayOrder/)

const loader = await requiredText('/ui-transition-v640.js?v=640-style-list-performance1')
assert.match(loader, /window\.__orimiaUiTransitionV640/)
assert.match(loader, /orimia:style-list-state-v640/)
assert.match(loader, /style-list-ready/)

const thumbnail = await get('/generated/style-thumbnails-v640/0fcb3d67d69d21be2f7ee1ed.webp')
assert.equal(thumbnail.status, 200)
assert.match(String(thumbnail.headers.get('content-type')), /^image\/webp\b/)
const thumbnailBytes = (await thumbnail.arrayBuffer()).byteLength
assert.ok(thumbnailBytes > 0 && thumbnailBytes < 250_000, `Unexpected thumbnail size: ${thumbnailBytes}`)

const unsignedThumbnail = await get('/api/lien-style-thumbnail-v640')
assert.equal(unsignedThumbnail.status, 403)

for (const pathname of ['/admin/community', '/u/community']) {
  const response = await get(pathname)
  assert.ok([302, 303, 307, 308].includes(response.status), `${pathname} did not redirect without a session`)
}

console.log(JSON.stringify({
  release: 'style-list-performance-v640',
  productionSmokeVerified: true,
  lightweightThumbnailBytes: thumbnailBytes,
  signedThumbnailRouteProtected: true,
  protectedRoutesVerified: true,
}))
