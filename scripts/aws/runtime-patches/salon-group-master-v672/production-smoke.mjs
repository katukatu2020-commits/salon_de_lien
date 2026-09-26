import assert from 'node:assert/strict'
const base = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const health = await fetch(base + '/api/health/ready')
assert.equal(health.status, 200)
for (const [header, value] of [['x-lien-salon-group-master', 'v672'], ['x-lien-dealer-sales-team', 'v671'], ['x-lien-orimia-store-directory', 'v670'], ['x-lien-admin-chat-reply', 'v669']]) assert.equal(health.headers.get(header), value)
const page = await fetch(base + '/admin/salon-master', { redirect: 'manual' })
assert.equal(page.status, 302)
assert.match(page.headers.get('location'), /^\/admin\/login/)
for (const route of ['/access', '/data', '/stores', '/link']) {
  const r = await fetch(base + '/api/admin/salon-master' + route, { redirect: 'manual' })
  assert.equal(r.status, 401)
  assert.match(r.headers.get('cache-control'), /no-store/)
}
for (const route of ['/salon-group-master-v672-client.js?v=672-1', '/salon-group-master-v672.css?v=672-1']) assert.equal((await fetch(base + route)).status, 200)
console.log(JSON.stringify({ release: 'salon-group-master-v672', productionHealth: true, protectedRoutes: true, publicAssets: true }))
