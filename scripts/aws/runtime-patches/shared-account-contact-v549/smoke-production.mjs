import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-shared-account-contact-v549-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v549`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-shared-account-contact'), 'v549')
assert.equal(ready.headers.get('x-lien-dealer-auth-self-service'), 'v548')

for (const path of ['/', '/privacy', '/terms']) {
  const response = await fetch(`${baseUrl}${path}?smoke=v549`, { headers })
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /070-9444-6007/)
  assert.match(html, /tel:\+817094446007/)
  assert.doesNotMatch(html, /086-232-6007|\+81862326007/)
}

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

const client = await fetch(`${baseUrl}/sales-ledger-v318.js?smoke=v549`, {
  headers: { ...headers, Cookie: cookie },
})
assert.equal(client.status, 200)
const clientSource = await client.text()
assert.match(clientSource, /shared-account-contact-v549/)
assert.match(clientSource, /店舗ログインできます/)

console.log(JSON.stringify({ release: 'shared-account-contact-v549', productionReady: true, sharedAccountReadable: true, publicContact: true }))
