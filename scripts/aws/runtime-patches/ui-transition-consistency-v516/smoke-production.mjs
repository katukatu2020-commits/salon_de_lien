import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = {
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-ui-transition-consistency-v516-smoke/1.0',
}

async function text(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { headers })
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`)
  return response.text()
}

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v516`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-ui-transition-consistency'), 'v516')
assert.equal(ready.headers.get('x-lien-product-insights'), 'v515')
assert.equal(ready.headers.get('x-lien-business-hours-consistency'), 'v514')

const adminLogin = await text('/admin/login?smoke=v516')
assert.match(adminLogin, /layout-runtime-v516-release5\.js/)
assert.match(adminLogin, /admin-theme-first-paint-v153\.ui-transition-v516-release6\.css/)

const customerLogin = await text('/u/login?smoke=v516')
assert.match(customerLogin, /customertabs-v503\.ui-transition-v516-release5\.js/)
assert.match(customerLogin, /admin-theme-first-paint-v153\.ui-transition-v516-release6\.css/)

const transitionAsset = await text('/ui-transition-v516.js?smoke=v516')
assert.match(transitionAsset, /customer-standalone-v516/)
assert.match(transitionAsset, /admin-product-insights-v516/)
assert.match(transitionAsset, /safety-timeout/)

const standaloneRuntime = await text('/customer-experience-v503.js?smoke=v516')
assert.match(standaloneRuntime, /source: 'customer-standalone-v516'/)
assert.match(standaloneRuntime, /if \(routeTimer\) return/)

const nextCustomerRuntime = await text('/customer-experience-v508.js?smoke=v516')
assert.match(nextCustomerRuntime, /source: 'customer-experience-v516'/)

const productInsights = await text('/product-insights-v515.js?smoke=v516')
assert.match(productInsights, /source: 'admin-product-insights-v516'/)
assert.match(productInsights, /if \(timer\) return/)

console.log(JSON.stringify({ baseUrl, release: 'ui-transition-consistency-v516', ready: true }, null, 2))
