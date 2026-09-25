import assert from 'node:assert/strict'

const base = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const health = await fetch(base + '/api/health/ready', { cache: 'no-store' })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-style-order-loading-recovery'), 'v661')
assert.equal(health.headers.get('x-lien-customer-registration-link-recovery'), 'v660')

const asset = await fetch(base + '/style-admin-controls-v618.js?v=661-order-recovery1', { cache: 'no-store' })
assert.equal(asset.status, 200)
const assetSource = await asset.text()
assert.match(assetSource, /__orimiaStyleOrderLoadingRecoveryV661/)
assert.match(assetSource, /requestedPageV650: destinationPage/)

const transition = await fetch(base + '/ui-transition-v661.js?v=661-loading-recovery1', { cache: 'no-store' })
assert.equal(transition.status, 200)
assert.match(await transition.text(), /public-dom-ready/)

const login = await fetch(base + '/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Origin: base,
  },
  body: new URLSearchParams({
    email: 'demo.owner',
    password: 'LienDemo2026!',
    next: '/admin/community',
  }),
  redirect: 'manual',
})
assert.ok(login.status >= 200 && login.status < 400, `Staff login returned ${login.status}`)
const cookie = login.headers.get('set-cookie')?.split(';')[0]
assert.ok(cookie, 'Staff session cookie was not issued')
const headers = { Cookie: cookie, Origin: base, 'Content-Type': 'application/json' }

const listResponse = await fetch(base + '/api/lien-style-admin-v618', { headers: { Cookie: cookie }, cache: 'no-store' })
assert.equal(listResponse.status, 200)
const before = await listResponse.json()
assert.ok(before.posts.length >= 2, 'At least two style posts are required')
const moving = before.posts[1]
const originalOrder = Number(moving.displayOrder)

try {
  const moveResponse = await fetch(base + '/api/lien-style-order-v634', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ postId: moving.id, displayOrder: 1 }),
  })
  const moveBody = await moveResponse.text()
  assert.equal(moveResponse.status, 200, moveBody)
  const moved = JSON.parse(moveBody)
  assert.equal(Number(moved.displayOrder), 1)

  const movedListResponse = await fetch(base + '/api/lien-style-admin-v618', { headers: { Cookie: cookie }, cache: 'no-store' })
  assert.equal(movedListResponse.status, 200)
  const movedList = await movedListResponse.json()
  assert.equal(movedList.posts[0].id, moving.id)
} finally {
  const restoreResponse = await fetch(base + '/api/lien-style-order-v634', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ postId: moving.id, displayOrder: originalOrder }),
  })
  const restoreBody = await restoreResponse.text()
  assert.equal(restoreResponse.status, 200, restoreBody)
}

console.log(JSON.stringify({
  release: 'style-order-loading-recovery-v661',
  productionSmokeVerified: true,
  orderMutationVerifiedAndRestored: true,
  loadingRecoveryAssetVerified: true,
}))
