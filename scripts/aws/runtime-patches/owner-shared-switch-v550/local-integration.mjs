import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3122').replace(/\/$/, '')

async function login(loginId, password, next = '/admin/appointments') {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: loginId, password, next }),
  })
}

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v550`)
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-owner-shared-switch'), 'v550')
assert.equal(ready.headers.get('x-lien-shared-account-contact'), 'v549')

const ownerLogin = await login('demo.owner', 'LienDemo2026!')
assert.ok([302, 303].includes(ownerLogin.status), `owner login failed: ${ownerLogin.status}`)
const ownerCookie = (ownerLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(ownerCookie, /^lien_admin_session=/)

const capabilityResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  headers: { Cookie: ownerCookie, Accept: 'application/json' },
})
assert.equal(capabilityResponse.status, 200)
const capability = await capabilityResponse.json()
assert.equal(capability.canSwitch, true)
assert.equal(capability.role, 'ADMIN')
assert.match(capability.account.loginId, /^[a-z0-9._-]{3,80}$/)

const switchResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  method: 'POST',
  headers: { Origin: baseUrl, Cookie: ownerCookie, Accept: 'application/json' },
})
assert.equal(switchResponse.status, 200)
const switchedPayload = await switchResponse.json()
assert.equal(switchedPayload.ok, true)
assert.equal(switchedPayload.role, 'STAFF')
const sharedCookie = (switchResponse.headers.get('set-cookie') || '').split(';')[0]
assert.match(sharedCookie, /^lien_admin_session=/)
assert.notEqual(sharedCookie, ownerCookie)

const sharedCapabilityResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  headers: { Cookie: sharedCookie, Accept: 'application/json' },
})
assert.equal(sharedCapabilityResponse.status, 200)
const sharedCapability = await sharedCapabilityResponse.json()
assert.equal(sharedCapability.canSwitch, false)
assert.equal(sharedCapability.role, 'STAFF')

const reverseResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  method: 'POST',
  headers: { Origin: baseUrl, Cookie: sharedCookie, Accept: 'application/json' },
})
assert.equal(reverseResponse.status, 403)
assert.match(await reverseResponse.text(), /オーナーアカウントからのみ/)

const profileResponse = await fetch(`${baseUrl}/api/admin/store-profile`, {
  headers: { Cookie: sharedCookie, Accept: 'application/json' },
})
assert.equal(profileResponse.status, 200)
const profile = await profileResponse.json()
assert.equal(profile.profile.currentUserName, switchedPayload.displayName)

const pageResponse = await fetch(`${baseUrl}/admin/appointments?verify=v550`, {
  headers: { Cookie: ownerCookie, Accept: 'text/html' },
})
assert.equal(pageResponse.status, 200)
const page = await pageResponse.text()
assert.match(page, /owner-shared-switch-v550\.css\?v=550-release1/)
assert.match(page, /owner-shared-switch-v550\.js\?v=550-release1/)

for (const asset of ['/owner-shared-switch-v550.js?v=550-release1', '/owner-shared-switch-v550.css?v=550-release1']) {
  const response = await fetch(`${baseUrl}${asset}`)
  assert.equal(response.status, 200)
  assert.match(await response.text(), /owner-shared-switch-v550/)
}

console.log(JSON.stringify({ release: 'owner-shared-switch-v550', ownerVisible: true, switched: true, sharedHidden: true, reverseDenied: true }))
