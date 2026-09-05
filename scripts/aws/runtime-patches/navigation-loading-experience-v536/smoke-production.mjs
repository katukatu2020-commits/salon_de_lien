import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = {
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-navigation-loading-experience-v536-smoke/1.0',
}
const adminLayout = 'layout-runtime-v518-release1.navigation-loading-v536-release1.js'
const customerLayout = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.js'
const criticalCss = '51ded9af5ca8c344.customer-native-v82.customer-shell-v88.customer-layout-v92.navigation-v84.sidebar-shift-v87.admin-theme-first-paint-v153.ui-transition-v516-release6.navigation-loading-v536-release1.css'

async function get(pathname, requestHeaders = {}) {
  const result = await fetch(`${baseUrl}${pathname}`, {
    headers: { ...headers, ...requestHeaders },
    cache: 'no-store',
  })
  assert.equal(result.status, 200, `${pathname}: expected 200, received ${result.status}`)
  return result
}

async function text(pathname, requestHeaders = {}) {
  return (await get(pathname, requestHeaders)).text()
}

async function login(pathname, form) {
  const result = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { ...headers, Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  })
  assert.ok([302, 303].includes(result.status), `${pathname}: login returned ${result.status}`)
  const cookie = (result.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

const ready = await get('/api/health/ready?smoke=v536')
assert.equal(ready.headers.get('x-lien-navigation-loading-experience'), 'v536')
assert.equal(ready.headers.get('x-lien-manual-booking-break-interaction'), 'v535')

const transitionScript = await text('/ui-transition-v536.js?smoke=v536')
assert.match(transitionScript, /__orimiaUiTransitionV536/)
assert.match(transitionScript, /normalizePathname\(before\.pathname\) !== normalizePathname\(after\.pathname\)/)
assert.match(transitionScript, /if \(!changesPage\(before, after\)\) return/)
assert.match(transitionScript, /ページを移動しています/)
assert.match(transitionScript, /画面を準備しています/)
assert.match(transitionScript, /orimia-ui-loader-v536__rail/)
assert.match(transitionScript, /React can reconcile away body children/)

const transitionStyle = await text('/ui-transition-v536.css?smoke=v536')
assert.match(transitionStyle, /@keyframes orimia-ui-mark-v536/)
assert.match(transitionStyle, /@keyframes orimia-ui-progress-v536/)
assert.match(transitionStyle, /prefers-reduced-motion: no-preference/)
assert.match(transitionStyle, /prefers-reduced-motion: reduce/)
assert.match(transitionStyle, /width: 100vw !important/)

const adminCookie = await login('/api/auth/login', {
  email: 'demo.owner',
  password: 'LienDemo2026!',
  next: '/admin/products',
})
const adminProducts = await text('/admin/products?smoke=v536', { Cookie: adminCookie })
assert.match(adminProducts, new RegExp(adminLayout.replaceAll('.', '\\.')))
assert.match(adminProducts, new RegExp(criticalCss.replaceAll('.', '\\.')))

const customerCookie = await login('/api/customer-auth/login', {
  loginId: 'demo.hana',
  password: 'Mypage2026!',
  next: '/u/home',
})
const customerHome = await text('/u/home?smoke=v536', { Cookie: customerCookie })
assert.match(customerHome, /id="orimia-customer-transition-v536"/)
assert.match(customerHome, /ui-transition-v536\.js\?v=536-release1/)
const customerAppointments = await text('/u/appointments?smoke=v536', { Cookie: customerCookie })
assert.match(customerAppointments, new RegExp(customerLayout.replaceAll('.', '\\.')))
assert.match(customerAppointments, new RegExp(criticalCss.replaceAll('.', '\\.')))

console.log(JSON.stringify({
  release: 'navigation-loading-experience-v536',
  ready: ready.status,
  admin: true,
  customer: true,
  samePageExclusion: true,
}))
