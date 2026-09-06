import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3124').replace(/\/$/, '')
const sharedPassword = `Shared-V552-${Date.now().toString(36)}!`

async function adminLogin(loginId, password, next = '/admin/account') {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: loginId, password, next }),
  })
}

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v552`)
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-shared-account-identity'), 'v552')
assert.equal(ready.headers.get('x-lien-style-detail-navigation'), 'v551')

const ownerLogin = await adminLogin('demo.owner', 'LienDemo2026!')
assert.ok([302, 303].includes(ownerLogin.status), `owner login failed: ${ownerLogin.status}`)
const ownerCookie = (ownerLogin.headers.get('set-cookie') || '').split(';')[0]
assert.match(ownerCookie, /^[^=]+=/)

const beforeResponse = await fetch(`${baseUrl}/api/admin/shared-store-account`, {
  headers: { Cookie: ownerCookie, Accept: 'application/json' },
})
assert.equal(beforeResponse.status, 200)
const before = await beforeResponse.json()
assert.match(before.account.loginId, /^[a-z0-9._-]{3,80}$/)

const saveResponse = await fetch(`${baseUrl}/api/admin/shared-store-account`, {
  method: 'POST',
  headers: { Origin: baseUrl, Cookie: ownerCookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ loginId: before.account.loginId, password: sharedPassword }),
})
const saveBody = await saveResponse.text()
assert.equal(saveResponse.status, 200, saveBody)
const saved = JSON.parse(saveBody)
assert.equal(saved.ok, true)
assert.equal(saved.created, false)
assert.equal(saved.loginId, before.account.loginId)

const sharedLogin = await adminLogin(before.account.loginId, sharedPassword, '/admin/appointments')
assert.ok([302, 303].includes(sharedLogin.status), `shared login failed: ${sharedLogin.status}`)
assert.equal(sharedLogin.headers.get('location'), `${baseUrl}/admin/appointments`)

const conflictResponse = await fetch(`${baseUrl}/api/admin/shared-store-account`, {
  method: 'POST',
  headers: { Origin: baseUrl, Cookie: ownerCookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ loginId: 'demo.owner', password: sharedPassword }),
})
assert.equal(conflictResponse.status, 409)
assert.match(await conflictResponse.text(), /すでに使用されています/)

console.log(JSON.stringify({
  release: 'shared-account-identity-scope-v552',
  sameIdReset: true,
  sharedLogin: true,
  backofficeConflictProtected: true,
}))
