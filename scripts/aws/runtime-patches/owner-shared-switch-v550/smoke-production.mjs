import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-owner-shared-switch-v550-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v550`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-owner-shared-switch'), 'v550')
assert.equal(ready.headers.get('x-lien-shared-account-contact'), 'v549')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { ...headers, Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const ownerCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(ownerCookie, /^lien_admin_session=/)

const capabilityResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  headers: { ...headers, Cookie: ownerCookie, Accept: 'application/json' },
})
assert.equal(capabilityResponse.status, 200)
const capability = await capabilityResponse.json()
assert.equal(capability.canSwitch, true)
assert.equal(capability.role, 'ADMIN')

const switchResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  method: 'POST',
  headers: { ...headers, Origin: baseUrl, Cookie: ownerCookie, Accept: 'application/json' },
})
assert.equal(switchResponse.status, 200)
const switched = await switchResponse.json()
assert.equal(switched.ok, true)
assert.equal(switched.role, 'STAFF')
const sharedCookie = (switchResponse.headers.get('set-cookie') || '').split(';')[0]
assert.match(sharedCookie, /^lien_admin_session=/)
assert.notEqual(sharedCookie, ownerCookie)

const sharedCapabilityResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  headers: { ...headers, Cookie: sharedCookie, Accept: 'application/json' },
})
assert.equal(sharedCapabilityResponse.status, 200)
const sharedCapability = await sharedCapabilityResponse.json()
assert.equal(sharedCapability.canSwitch, false)
assert.equal(sharedCapability.role, 'STAFF')

const reverseResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  method: 'POST',
  headers: { ...headers, Origin: baseUrl, Cookie: sharedCookie, Accept: 'application/json' },
})
assert.equal(reverseResponse.status, 403)

const pageResponse = await fetch(`${baseUrl}/admin/appointments?smoke=v550`, {
  headers: { ...headers, Cookie: ownerCookie, Accept: 'text/html' },
})
assert.equal(pageResponse.status, 200)
const page = await pageResponse.text()
assert.match(page, /owner-shared-switch-v550\.css\?v=550-release1/)
assert.match(page, /owner-shared-switch-v550\.js\?v=550-release1/)

console.log(JSON.stringify({ release: 'owner-shared-switch-v550', productionReady: true, ownerCanSwitch: true, oneWay: true }))
