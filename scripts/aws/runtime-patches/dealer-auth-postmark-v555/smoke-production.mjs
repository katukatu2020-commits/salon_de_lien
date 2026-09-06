import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'User-Agent': 'ORIMIA-dealer-auth-postmark-v555-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v555-production`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-auth-mail'), 'v555')
assert.equal(ready.headers.get('x-lien-dealer-form-origin'), 'v554')
assert.equal(ready.headers.get('x-lien-shared-account-identity'), 'v553')

const registration = await fetch(`${baseUrl}/dealer/register?verify=v555-production`, { headers })
assert.equal(registration.status, 200)
assert.match(await registration.text(), /ディーラー新規設定/)

const invalidRegistration = await fetch(`${baseUrl}/api/dealer/auth/register/request`, {
  method: 'POST',
  redirect: 'manual',
  headers: {
    ...headers,
    Origin: baseUrl,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ email: 'not-an-email' }),
})
assert.equal(invalidRegistration.status, 400)
assert.match(await invalidRegistration.text(), /有効なメールアドレスを入力してください/)

console.log(JSON.stringify({
  release: 'dealer-auth-postmark-v555',
  productionReady: true,
  registrationRouteReady: true,
}))
