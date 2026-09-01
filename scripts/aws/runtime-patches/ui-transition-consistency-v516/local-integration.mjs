import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3122').replace(/\/$/, '')
const noCache = { 'Cache-Control': 'no-cache' }

async function text(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { ...noCache, ...(options.headers || {}) },
  })
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`)
  return response.text()
}

async function login(pathname, form) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Origin: baseUrl,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form),
  })
  assert.ok([302, 303].includes(response.status), `${pathname}: login failed with ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v516`, { headers: noCache })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-ui-transition-consistency'), 'v516')
assert.equal(ready.headers.get('x-lien-product-insights'), 'v515')

const adminLogin = await text('/admin/login?integration=v516')
assert.match(adminLogin, /layout-runtime-v516-release5\.js/)
assert.match(adminLogin, /admin-theme-first-paint-v153\.ui-transition-v516-release6\.css/)

const customerLogin = await text('/u/login?integration=v516')
assert.match(customerLogin, /customertabs-v503\.ui-transition-v516-release5\.js/)
assert.match(customerLogin, /admin-theme-first-paint-v153\.ui-transition-v516-release6\.css/)

const adminCookie = await login('/api/auth/login', {
  email: 'demo.owner',
  password: 'LienDemo2026!',
  next: '/admin/products?section=feedback',
})
const adminProducts = await text('/admin/products?section=feedback&integration=v516', {
  headers: { Cookie: adminCookie },
})
assert.match(adminProducts, /layout-runtime-v516-release5\.js/)
const adminLayoutRuntime = await text('/_next/static/chunks/app/layout-runtime-v516-release5.js?integration=v516')
assert.match(adminLayoutRuntime, /source: 'admin-product-insights-v516'/)
assert.match(adminLayoutRuntime, /commercial-admin-v136\.js\?v=20260901-516-release3/)

const customerCookie = await login('/api/customer-auth/login', {
  loginId: 'demo.hana',
  password: 'Mypage2026!',
  next: '/u/home',
})
const customerHeaders = { Cookie: customerCookie }
const customerHome = await text('/u/home?integration=v516', { headers: customerHeaders })
assert.match(customerHome, /data-orimia-customer-standalone="v516"/)
assert.match(customerHome, /id="orimia-customer-transition-v516"/)
assert.match(customerHome, /ui-transition-v516\.js\?v=516-release7/)
assert.match(customerHome, /customer-experience-v503\.js\?v=516-release7/)

const customerChat = await text('/u/chat?integration=v516', { headers: customerHeaders })
assert.match(customerChat, /customertabs-v503\.ui-transition-v516-release5\.js/)
assert.match(customerChat, /admin-theme-first-paint-v153\.ui-transition-v516-release6\.css/)

const customerAppointments = await text('/u/appointments?integration=v516', { headers: customerHeaders })
assert.match(customerAppointments, /customertabs-v503\.ui-transition-v516-release5\.js/)
assert.match(customerAppointments, /admin-theme-first-paint-v153\.ui-transition-v516-release6\.css/)

const transitionAsset = await text('/ui-transition-v516.js?integration=v516')
assert.match(transitionAsset, /customer-standalone-v516/)
assert.match(transitionAsset, /orimia:ui-transition-finished/)
assert.match(transitionAsset, /safety-timeout/)

const standaloneRuntime = await text('/customer-experience-v503.js?integration=v516')
assert.match(standaloneRuntime, /source: 'customer-standalone-v516'/)
assert.match(standaloneRuntime, /if \(routeTimer\) return/)

console.log(JSON.stringify({
  release: 'ui-transition-consistency-v516',
  ready: true,
  adminNextShell: true,
  customerNextShell: true,
  customerStandaloneShell: true,
  customerChatShell: true,
}, null, 2))
