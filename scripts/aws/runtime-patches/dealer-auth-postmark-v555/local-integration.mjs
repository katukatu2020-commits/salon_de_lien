import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3125').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v555`)
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-auth-mail'), 'v555')
assert.equal(ready.headers.get('x-lien-dealer-form-origin'), 'v554')
assert.equal(ready.headers.get('x-lien-shared-account-identity'), 'v553')

const page = await fetch(`${baseUrl}/dealer/register?verify=v555`)
assert.equal(page.status, 200)
assert.match(await page.text(), /ディーラー新規設定/)

const invalidRegistration = await fetch(`${baseUrl}/api/dealer/auth/register/request`, {
  method: 'POST',
  redirect: 'manual',
  headers: {
    Origin: baseUrl,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ email: 'not-an-email' }),
})
const invalidBody = await invalidRegistration.text()
assert.equal(invalidRegistration.status, 400)
assert.match(invalidBody, /有効なメールアドレスを入力してください/)
assert.doesNotMatch(invalidBody, /安全性を確認できない/)

console.log(JSON.stringify({
  release: 'dealer-auth-postmark-v555',
  runtimeReady: true,
  registrationRouteReady: true,
  invalidRequestDidNotSendMail: true,
}))
