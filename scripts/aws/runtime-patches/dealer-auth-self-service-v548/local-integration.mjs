import assert from 'node:assert/strict'
import http from 'node:http'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3120').replace(/\/$/, '')
const mailPort = Number(process.env.VERIFY_MAIL_PORT || 3328)
const runId = Date.now().toString(36)
const messages = []

function readRequest(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', chunk => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

const mailServer = http.createServer(async (request, response) => {
  if (request.url === '/token' && request.method === 'POST') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ access_token: 'dealer-v548-test-token', token_type: 'Bearer', expires_in: 3600 }))
    return
  }
  if (request.url === '/send' && request.method === 'POST') {
    const payload = JSON.parse(await readRequest(request))
    messages.push(Buffer.from(String(payload.raw || ''), 'base64url').toString('utf8'))
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ id: `mail-${messages.length}` }))
    return
  }
  response.writeHead(404)
  response.end()
})

await new Promise((resolve, reject) => {
  mailServer.once('error', reject)
  mailServer.listen(mailPort, '0.0.0.0', resolve)
})

async function waitForMail(count) {
  const deadline = Date.now() + 10_000
  while (messages.length < count && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50))
  assert.ok(messages.length >= count, `expected ${count} captured messages, received ${messages.length}`)
  return messages[count - 1]
}

function extractActionUrl(raw, path) {
  const expression = new RegExp(`https?:\\/\\/[^\\s<]+${path}\\/[A-Za-z0-9_-]{40,100}`)
  const match = raw.match(expression)
  assert.ok(match, `action URL for ${path} was not found in mail`)
  return match[0].replace(/&amp;/g, '&')
}

async function form(path, values, cookie = '') {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded', ...(cookie ? { Cookie: cookie } : {}) },
    body: new URLSearchParams(values),
  })
}

try {
  const ready = await fetch(`${baseUrl}/api/health/ready?verify=v548`, { headers: { 'Cache-Control': 'no-cache' } })
  assert.equal(ready.status, 200)
  assert.equal(ready.headers.get('x-lien-dealer-auth-self-service'), 'v548')
  assert.equal(ready.headers.get('x-lien-customer-chat-send-only'), 'v547')

  const loginPage = await fetch(`${baseUrl}/dealer/login`)
  assert.equal(loginPage.status, 200)
  const loginHtml = await loginPage.text()
  assert.match(loginHtml, /新規アカウントを設定/)
  assert.match(loginHtml, /ID・パスワードを忘れた方/)

  const adminLogin = await form('/api/auth/login', { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products/orders' })
  assert.ok([302, 303].includes(adminLogin.status))
  const adminCookie = (adminLogin.headers.get('set-cookie') || '').split(';')[0]
  assert.match(adminCookie, /^[^=]+=/)

  const missingEmailInvite = await fetch(`${baseUrl}/api/admin/wholesale/invites`, {
    method: 'POST',
    headers: { Origin: baseUrl, Cookie: adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealerName: `V548メール未設定検証 ${runId}`, loginId: `dealer.no-email.${runId}` }),
  })
  assert.equal(missingEmailInvite.status, 400)
  assert.match(await missingEmailInvite.text(), /メールアドレス/)

  const invitedEmail = `dealer.invited.v548.${runId}@example.test`
  const invitedLoginId = `dealer.invited.v548.${runId}`
  const invitedPassword = `Dealer-Invited-V548-${runId}!`
  const invitedResponse = await fetch(`${baseUrl}/api/admin/wholesale/invites`, {
    method: 'POST',
    headers: { Origin: baseUrl, Cookie: adminCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealerName: `V548招待検証 ${runId}`, loginId: invitedLoginId, email: invitedEmail }),
  })
  assert.equal(invitedResponse.status, 200)
  const invited = await invitedResponse.json()
  const invitedSetupUrl = new URL(invited.setupUrl)
  const invitedSetupPage = await fetch(`${baseUrl}${invitedSetupUrl.pathname}${invitedSetupUrl.search}`)
  assert.equal(invitedSetupPage.status, 200)
  const invitedSetupHtml = await invitedSetupPage.text()
  assert.match(invitedSetupHtml, /登録メールアドレス/)
  assert.match(invitedSetupHtml, new RegExp(invitedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  const invitedSetup = await form('/api/dealer/auth/setup', {
    token: invitedSetupUrl.searchParams.get('token'),
    password: invitedPassword,
    passwordConfirm: invitedPassword,
  })
  assert.equal(invitedSetup.status, 303)
  const invitedEmailLogin = await form('/api/dealer/auth/login', { loginId: invitedEmail, password: invitedPassword })
  assert.equal(invitedEmailLogin.status, 303)

  const email = `dealer.v548.${runId}@example.test`
  const loginId = `dealer.v548.${runId}`
  const password = `Dealer-V548-${runId}!`
  const nextPassword = `Dealer-V548-New-${runId}!`

  const requestRegistration = await form('/api/dealer/auth/register/request', { email })
  assert.equal(requestRegistration.status, 303)
  assert.equal(requestRegistration.headers.get('location'), '/dealer/register?sent=1')
  const registrationMail = await waitForMail(1)
  assert.match(registrationMail, /ディーラーアカウントを設定してください/)
  const registrationUrl = new URL(extractActionUrl(registrationMail, '/dealer/register'))

  const registrationPage = await fetch(`${baseUrl}${registrationUrl.pathname}`)
  assert.equal(registrationPage.status, 200)
  assert.match(await registrationPage.text(), new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  const invalidRegistration = await form('/api/dealer/auth/register/confirm', {
    token: registrationUrl.pathname.split('/').pop(),
    dealerName: `V548検証ディーラー ${runId}`,
    loginId,
    password: 'short',
    passwordConfirm: 'short',
  })
  assert.equal(invalidRegistration.status, 400)
  assert.match(await invalidRegistration.text(), /パスワードは10〜72文字/)

  const register = await form('/api/dealer/auth/register/confirm', {
    token: registrationUrl.pathname.split('/').pop(),
    dealerName: `V548検証ディーラー ${runId}`,
    loginId,
    phone: '03-5555-0548',
    postalCode: '100-0001',
    address: '東京都千代田区千代田1-1',
    password,
    passwordConfirm: password,
  })
  assert.equal(register.status, 303)
  assert.equal(register.headers.get('location'), '/dealer/login?registered=complete')

  const reusedRegistration = await fetch(`${baseUrl}${registrationUrl.pathname}`)
  assert.equal(reusedRegistration.status, 410)

  const login = await form('/api/dealer/auth/login', { loginId: email, password })
  assert.equal(login.status, 303)
  const oldCookie = (login.headers.get('set-cookie') || '').split(';')[0]
  assert.match(oldCookie, /^orimia_dealer_session=/)

  const portal = await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers: { Cookie: oldCookie, Accept: 'application/json' } })
  assert.equal(portal.status, 200)
  const portalPayload = await portal.json()
  assert.equal(portalPayload.ok, true)
  assert.deepEqual(portalPayload.contracts, [])

  const requestReset = await form('/api/dealer/auth/password-reset/request', { email })
  assert.equal(requestReset.status, 303)
  assert.equal(requestReset.headers.get('location'), '/dealer/password-reset?sent=1')
  const resetMail = await waitForMail(2)
  assert.match(resetMail, new RegExp(loginId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  const resetUrl = new URL(extractActionUrl(resetMail, '/dealer/password-reset'))

  const resetPage = await fetch(`${baseUrl}${resetUrl.pathname}`)
  assert.equal(resetPage.status, 200)
  assert.match(await resetPage.text(), /新しいパスワードを設定/)

  const mismatchedReset = await form('/api/dealer/auth/password-reset/confirm', {
    token: resetUrl.pathname.split('/').pop(),
    password: nextPassword,
    passwordConfirm: `${nextPassword}-different`,
  })
  assert.equal(mismatchedReset.status, 400)
  assert.match(await mismatchedReset.text(), /確認用パスワードが一致しません/)

  const reset = await form('/api/dealer/auth/password-reset/confirm', {
    token: resetUrl.pathname.split('/').pop(),
    password: nextPassword,
    passwordConfirm: nextPassword,
  }, oldCookie)
  assert.equal(reset.status, 303)
  assert.equal(reset.headers.get('location'), '/dealer/login?reset=complete')

  const oldSession = await fetch(`${baseUrl}/api/dealer/bootstrap`, { headers: { Cookie: oldCookie, Accept: 'application/json' } })
  assert.equal(oldSession.status, 401)
  const reusedReset = await fetch(`${baseUrl}${resetUrl.pathname}`)
  assert.equal(reusedReset.status, 410)

  const oldPasswordLogin = await form('/api/dealer/auth/login', { loginId, password })
  assert.equal(oldPasswordLogin.status, 303)
  assert.equal(oldPasswordLogin.headers.get('location'), '/dealer/login?error=invalid')
  const newPasswordLogin = await form('/api/dealer/auth/login', { loginId, password: nextPassword })
  assert.equal(newPasswordLogin.status, 303)
  assert.match(newPasswordLogin.headers.get('set-cookie') || '', /orimia_dealer_session=/)

  const invitedReset = await form('/api/dealer/auth/password-reset/request', { email: invitedEmail })
  assert.equal(invitedReset.status, 303)
  const invitedResetMail = await waitForMail(3)
  assert.match(invitedResetMail, new RegExp(invitedLoginId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  console.log(JSON.stringify({ release: 'dealer-auth-self-service-v548', registration: true, invitedAccountRecovery: true, passwordReset: true, oneTimeTokens: true, priorSessionsRevoked: true, emailsCaptured: messages.length }))
} finally {
  await new Promise(resolve => mailServer.close(resolve))
}
