import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-dealer-auth-v548-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v548`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-auth-self-service'), 'v548')
assert.equal(ready.headers.get('x-lien-customer-chat-send-only'), 'v547')
assert.equal(ready.headers.get('x-lien-wholesale-ordering'), 'v543')

const login = await fetch(`${baseUrl}/dealer/login?smoke=v548`, { headers })
assert.equal(login.status, 200)
assert.match(login.headers.get('cache-control') || '', /no-store/)
const loginHtml = await login.text()
assert.match(loginHtml, /ディーラーログイン/)
assert.match(loginHtml, /href="\/dealer\/register"/)
assert.match(loginHtml, /href="\/dealer\/password-reset"/)

const registration = await fetch(`${baseUrl}/dealer/register?smoke=v548`, { headers })
assert.equal(registration.status, 200)
assert.match(await registration.text(), /ディーラー新規設定/)

const passwordReset = await fetch(`${baseUrl}/dealer/password-reset?smoke=v548`, { headers })
assert.equal(passwordReset.status, 200)
assert.match(await passwordReset.text(), /ログイン情報を再設定/)

const invalidRegistration = await fetch(`${baseUrl}/dealer/register/not-a-token?smoke=v548`, { headers })
assert.equal(invalidRegistration.status, 410)
assert.match(await invalidRegistration.text(), /初期設定URLを確認してください/)

const invalidOrigin = await fetch(`${baseUrl}/api/dealer/auth/password-reset/request`, {
  method: 'POST',
  redirect: 'manual',
  headers: { ...headers, Origin: 'https://invalid.example', 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'nobody@example.invalid' }),
})
assert.equal(invalidOrigin.status, 403)

const unauthenticatedDealer = await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers: { ...headers, Accept: 'application/json' } })
assert.equal(unauthenticatedDealer.status, 401)

const styles = await fetch(`${baseUrl}/wholesale-ordering-v543.css?v=548`, { headers })
assert.equal(styles.status, 200)
assert.match(await styles.text(), /dealer-auth-self-service-v548/)

console.log(JSON.stringify({ release: 'dealer-auth-self-service-v548', productionReady: true, authPages: 3, protected: true }))
