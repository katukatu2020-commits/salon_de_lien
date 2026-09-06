import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3125').replace(/\/$/, '')

async function post(path, headers = {}, body = 'email=not-an-email') {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body,
  })
}

async function expectEmailValidation(response, label) {
  const body = await response.text()
  assert.equal(response.status, 400, `${label}: ${response.status}`)
  assert.match(body, /有効なメールアドレスを入力してください/)
  assert.doesNotMatch(body, /安全性を確認できない/)
}

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v554`)
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-dealer-form-origin'), 'v554')
assert.equal(ready.headers.get('x-lien-shared-account-identity'), 'v553')

const page = await fetch(`${baseUrl}/dealer/register?verify=v554`)
assert.equal(page.status, 200)
assert.match(await page.text(), /ディーラー新規設定/)

await expectEmailValidation(
  await post('/api/dealer/auth/register/request', { Origin: baseUrl }),
  'explicit origin',
)
await expectEmailValidation(
  await post('/api/dealer/auth/register/request', { Referer: `${baseUrl}/dealer/register` }),
  'same-origin referer',
)
await expectEmailValidation(
  await post('/api/dealer/auth/register/request', { 'Sec-Fetch-Site': 'same-origin' }),
  'omitted Safari origin',
)
await expectEmailValidation(
  await post('/api/dealer/auth/register/request', { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' }),
  'opaque Safari origin',
)

for (const [label, headers] of [
  ['missing metadata', {}],
  ['cross-site metadata', { 'Sec-Fetch-Site': 'cross-site' }],
  ['foreign origin', { Origin: 'https://attacker.example', 'Sec-Fetch-Site': 'same-origin' }],
]) {
  const response = await post('/api/dealer/auth/register/request', headers)
  assert.equal(response.status, 403, `${label}: ${response.status}`)
  assert.match(await response.text(), /安全性を確認できない/)
}

const login = await post(
  '/api/dealer/auth/login',
  { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' },
  'loginId=missing-v554&password=invalid-v554',
)
assert.equal(login.status, 303)
assert.match(login.headers.get('location') || '', /\/dealer\/login\?error=invalid$/)

const reset = await post(
  '/api/dealer/auth/password-reset/request',
  { Origin: 'null', 'Sec-Fetch-Site': 'same-origin' },
)
assert.equal(reset.status, 303)
assert.match(reset.headers.get('location') || '', /\/dealer\/password-reset\?sent=1$/)

console.log(JSON.stringify({
  release: 'dealer-form-origin-v554',
  registrationFormAccepted: true,
  safariHeadersAccepted: true,
  crossSiteRequestsRejected: true,
  loginAndResetCovered: true,
}))
