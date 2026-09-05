import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3121').replace(/\/$/, '')
const sharedPassword = `Shared-V549-${Date.now().toString(36)}!`

async function adminLogin(loginId, password, next = '/admin/account') {
  return fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: loginId, password, next }),
  })
}

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v549`)
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-shared-account-contact'), 'v549')
assert.equal(ready.headers.get('x-lien-dealer-auth-self-service'), 'v548')

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
assert.equal(saveResponse.status, 200)
const saved = await saveResponse.json()
assert.equal(saved.ok, true)
assert.equal(saved.created, false)
assert.equal(saved.loginId, before.account.loginId)

const afterResponse = await fetch(`${baseUrl}/api/admin/shared-store-account`, {
  headers: { Cookie: ownerCookie, Accept: 'application/json' },
})
assert.equal(afterResponse.status, 200)
const after = await afterResponse.json()
assert.equal(after.account.active, true)
assert.equal(after.account.loginId, before.account.loginId)

const sharedLogin = await adminLogin(before.account.loginId, sharedPassword, '/admin/appointments')
assert.ok([302, 303].includes(sharedLogin.status), `shared login failed: ${sharedLogin.status}`)
assert.equal(sharedLogin.headers.get('location'), `${baseUrl}/admin/appointments`)
assert.match(sharedLogin.headers.get('set-cookie') || '', /lien_admin_session=/)

const duplicateResponse = await fetch(`${baseUrl}/api/admin/shared-store-account`, {
  method: 'POST',
  headers: { Origin: baseUrl, Cookie: ownerCookie, 'Content-Type': 'application/json' },
  body: JSON.stringify({ loginId: 'demo.owner', password: sharedPassword }),
})
assert.equal(duplicateResponse.status, 409)
assert.match(await duplicateResponse.text(), /すでに使用/)

for (const path of ['/', '/privacy', '/terms']) {
  const response = await fetch(`${baseUrl}${path}?verify=v549`)
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /070-9444-6007/)
  assert.match(html, /tel:\+817094446007/)
  assert.doesNotMatch(html, /086-232-6007|\+81862326007/)
}

console.log(JSON.stringify({ release: 'shared-account-contact-v549', save: true, login: true, duplicateProtected: true, publicContact: true }))
