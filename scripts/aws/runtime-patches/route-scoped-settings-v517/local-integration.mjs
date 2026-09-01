import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3123').replace(/\/$/, '')
const noCache = { 'Cache-Control': 'no-cache' }

async function text(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { ...noCache, ...(options.headers || {}) },
  })
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`)
  return response.text()
}

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      Origin: baseUrl,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      email: 'demo.owner',
      password: 'LienDemo2026!',
      next: '/admin/settings',
    }),
  })
  assert.ok([302, 303].includes(response.status), `admin login failed with ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^[^=]+=/)
  return cookie
}

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v517`, { headers: noCache })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-route-scoped-settings'), 'v517')
assert.equal(ready.headers.get('x-lien-ui-transition-consistency'), 'v516')

const adminLogin = await text('/admin/login?integration=v517')
assert.match(adminLogin, /layout-runtime-v517-release1\.js/)

const cookie = await login()
const settings = await text('/admin/settings?integration=v517', { headers: { Cookie: cookie } })
assert.match(settings, /layout-runtime-v517-release1\.js/)
const appointments = await text('/admin/appointments?integration=v517', { headers: { Cookie: cookie } })
assert.match(appointments, /layout-runtime-v517-release1\.js/)

const layout = await text('/_next/static/chunks/app/layout-runtime-v517-release1.js?integration=v517')
assert.match(layout, /commercial-admin-v136\.js\?v=20260901-517-release1/)
assert.match(layout, /route-scoped-settings-v517/)

const commercial = await text('/commercial-admin-v136.js?integration=v517')
assert.match(commercial, /function cleanup\(\)/)
assert.match(commercial, /document\.getElementById\(PANEL_ID\)\?\.remove\(\)/)
assert.match(commercial, /route-scoped-settings-v517/)

console.log(JSON.stringify({
  release: 'route-scoped-settings-v517',
  ready: true,
  settings: true,
  appointments: true,
}, null, 2))
