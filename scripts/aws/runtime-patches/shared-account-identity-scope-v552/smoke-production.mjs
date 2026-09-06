import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = {
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-shared-account-identity-v552-smoke/1.0',
}

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v552`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-shared-account-identity'), 'v552')
assert.equal(ready.headers.get('x-lien-style-detail-navigation'), 'v551')
assert.equal(ready.headers.get('x-lien-owner-shared-switch'), 'v550')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { ...headers, Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/account' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const account = await fetch(`${baseUrl}/api/admin/shared-store-account`, {
  headers: { ...headers, Cookie: cookie, Accept: 'application/json' },
})
assert.equal(account.status, 200)
const payload = await account.json()
assert.match(payload.account.loginId, /^[a-z0-9._-]{3,80}$/)
assert.equal(payload.account.active, true)

const client = await fetch(`${baseUrl}/sales-ledger-v318.js?smoke=v552`, {
  headers: { ...headers, Cookie: cookie, Accept: 'application/javascript' },
})
assert.equal(client.status, 200)
assert.match(await client.text(), /shared-account-contact-v549/)

console.log(JSON.stringify({
  release: 'shared-account-identity-scope-v552',
  productionReady: true,
  sharedAccountReadable: true,
}))
