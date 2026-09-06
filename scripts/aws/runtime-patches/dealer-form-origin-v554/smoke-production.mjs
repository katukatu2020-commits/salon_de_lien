import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'User-Agent': 'ORIMIA-dealer-form-origin-v554-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v554-production`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-form-origin'), 'v554')
assert.equal(ready.headers.get('x-lien-shared-account-identity'), 'v553')

const registration = await fetch(`${baseUrl}/dealer/register?verify=v554-production`, { headers })
assert.equal(registration.status, 200)
assert.match(await registration.text(), /ディーラー新規設定/)

const safariStyle = await fetch(`${baseUrl}/api/dealer/auth/register/request`, {
  method: 'POST',
  redirect: 'manual',
  headers: {
    ...headers,
    Origin: 'null',
    'Sec-Fetch-Site': 'same-origin',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ email: 'not-an-email' }),
})
const safariBody = await safariStyle.text()
assert.equal(safariStyle.status, 400)
assert.match(safariBody, /有効なメールアドレスを入力してください/)
assert.doesNotMatch(safariBody, /安全性を確認できない/)

const crossSite = await fetch(`${baseUrl}/api/dealer/auth/register/request`, {
  method: 'POST',
  redirect: 'manual',
  headers: {
    ...headers,
    Origin: 'https://attacker.example',
    'Sec-Fetch-Site': 'same-origin',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ email: 'not-an-email' }),
})
assert.equal(crossSite.status, 403)
assert.match(await crossSite.text(), /安全性を確認できない/)

console.log(JSON.stringify({
  release: 'dealer-form-origin-v554',
  productionReady: true,
  safariFormAccepted: true,
  foreignOriginRejected: true,
}))
