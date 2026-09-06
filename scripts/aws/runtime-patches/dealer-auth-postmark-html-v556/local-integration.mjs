import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3127').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v556`)
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-auth-mail-content'), 'v556')
assert.equal(ready.headers.get('x-lien-dealer-auth-mail'), 'v555')
assert.equal(ready.headers.get('x-lien-dealer-form-origin'), 'v554')

const page = await fetch(`${baseUrl}/dealer/register?verify=v556`)
assert.equal(page.status, 200)
assert.match(await page.text(), /ディーラー新規設定/)

const invalidRegistration = await fetch(`${baseUrl}/api/dealer/auth/register/request`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'not-an-email' }),
})
assert.equal(invalidRegistration.status, 400)
assert.match(await invalidRegistration.text(), /有効なメールアドレスを入力してください/)

console.log(JSON.stringify({ release: 'dealer-auth-postmark-html-v556', runtimeReady: true }))
