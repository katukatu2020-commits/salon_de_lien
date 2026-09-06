import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'User-Agent': 'ORIMIA-dealer-auth-postmark-html-v556-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v556-production`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-auth-mail-content'), 'v556')
assert.equal(ready.headers.get('x-lien-dealer-auth-mail'), 'v555')
assert.equal(ready.headers.get('x-lien-dealer-form-origin'), 'v554')

const registration = await fetch(`${baseUrl}/dealer/register?verify=v556-production`, { headers })
assert.equal(registration.status, 200)
assert.match(await registration.text(), /ディーラー新規設定/)

const postmarkSend = await fetch(`${baseUrl}/api/dealer/auth/register/request`, {
  method: 'POST',
  redirect: 'manual',
  headers: {
    ...headers,
    Origin: baseUrl,
    'Sec-Fetch-Site': 'same-origin',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({ email: 'test@blackhole.postmarkapp.com' }),
})
assert.equal(postmarkSend.status, 303)
assert.match(postmarkSend.headers.get('location') || '', /\/dealer\/register\?sent=1$/)

console.log(JSON.stringify({
  release: 'dealer-auth-postmark-html-v556',
  productionReady: true,
  livePostmarkRequestAccepted: true,
  recipient: 'postmark-blackhole',
}))
