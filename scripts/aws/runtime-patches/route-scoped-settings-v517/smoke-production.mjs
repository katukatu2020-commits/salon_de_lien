import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = {
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-route-scoped-settings-v517-smoke/1.0',
}

async function text(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers })
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`)
  return response.text()
}

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v517`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-route-scoped-settings'), 'v517')
assert.equal(ready.headers.get('x-lien-ui-transition-consistency'), 'v516')
assert.equal(ready.headers.get('x-lien-product-insights'), 'v515')

const adminLogin = await text('/admin/login?smoke=v517')
assert.match(adminLogin, /layout-runtime-v517-release1\.js/)

const layout = await text('/_next/static/chunks/app/layout-runtime-v517-release1.js?smoke=v517')
assert.match(layout, /commercial-admin-v136\.js\?v=20260901-517-release1/)
assert.match(layout, /route-scoped-settings-v517/)

const commercial = await text('/commercial-admin-v136.js?smoke=v517')
assert.match(commercial, /function cleanup\(\)/)
assert.match(commercial, /route-scoped-settings-v517/)

console.log(JSON.stringify({ baseUrl, release: 'route-scoped-settings-v517', ready: true }, null, 2))
