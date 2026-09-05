import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3115').replace(/\/$/, '')
const noCache = { 'Cache-Control': 'no-cache' }
const adminLayout = 'layout-runtime-v518-release1.navigation-loading-v536-release1.js'
const customerLayout = 'layout-d1470003e928b0b1.customertabs-v503.ui-transition-v516-release5.navigation-loading-v536-release1.js'
const criticalCss = '51ded9af5ca8c344.customer-native-v82.customer-shell-v88.customer-layout-v92.navigation-v84.sidebar-shift-v87.admin-theme-first-paint-v153.ui-transition-v516-release6.navigation-loading-v536-release1.css'

async function response(pathname, options = {}) {
  const result = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { ...noCache, ...(options.headers || {}) },
  })
  assert.equal(result.status, 200, `${pathname}: expected 200, received ${result.status}`)
  return result
}

async function text(pathname, options = {}) {
  return (await response(pathname, options)).text()
}

async function login(pathname, form) {
  const result = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  })
  assert.ok([302, 303].includes(result.status), `${pathname}: login failed with ${result.status}`)
  const cookie = (result.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

const ready = await response('/api/health/ready?integration=v536')
assert.equal(ready.headers.get('x-lien-navigation-loading-experience'), 'v536')
assert.equal(ready.headers.get('x-lien-manual-booking-break-interaction'), 'v535')

const adminLogin = await text('/admin/login?integration=v536')
assert.match(adminLogin, new RegExp(adminLayout.replaceAll('.', '\\.')))
assert.match(adminLogin, new RegExp(criticalCss.replaceAll('.', '\\.')))

const customerLogin = await text('/u/login?integration=v536')
assert.match(customerLogin, new RegExp(customerLayout.replaceAll('.', '\\.')))
assert.match(customerLogin, new RegExp(criticalCss.replaceAll('.', '\\.')))

const adminCookie = await login('/api/auth/login', {
  email: 'demo.owner',
  password: 'LienDemo2026!',
  next: '/admin/products',
})
const adminProducts = await text('/admin/products?integration=v536', { headers: { Cookie: adminCookie } })
assert.match(adminProducts, new RegExp(adminLayout.replaceAll('.', '\\.')))

const customerCookie = await login('/api/customer-auth/login', {
  loginId: 'demo.hana',
  password: 'Mypage2026!',
  next: '/u/home',
})
const customerHeaders = { Cookie: customerCookie }
const customerHome = await text('/u/home?integration=v536', { headers: customerHeaders })
assert.match(customerHome, /id="orimia-customer-transition-v536"/)
assert.match(customerHome, /ui-transition-v536\.js\?v=536-release1/)
assert.doesNotMatch(customerHome, /ui-transition-v516\.js\?v=516-release7/)

const customerAppointments = await text('/u/appointments?integration=v536', { headers: customerHeaders })
assert.match(customerAppointments, new RegExp(customerLayout.replaceAll('.', '\\.')))

const transitionScript = await text('/ui-transition-v536.js?integration=v536')
assert.match(transitionScript, /normalizePathname\(before\.pathname\) !== normalizePathname\(after\.pathname\)/)
assert.match(transitionScript, /ページを移動しています/)
assert.match(transitionScript, /orimia-ui-loader-v536__rail/)

const transitionStyle = await text('/ui-transition-v536.css?integration=v536')
assert.match(transitionStyle, /@keyframes orimia-ui-progress-v536/)
assert.match(transitionStyle, /prefers-reduced-motion/)

console.log(JSON.stringify({
  release: 'navigation-loading-experience-v536',
  ready: true,
  adminShell: true,
  customerNextShell: true,
  customerStandaloneShell: true,
}))
