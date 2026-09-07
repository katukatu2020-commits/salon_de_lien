import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

async function waitForReady() {
  let lastStatus = 0
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/health/ready?smoke=v580-${Date.now()}-${attempt}`, { cache:'no-store' })
    lastStatus = response.status
    if (
      response.status === 200
      && response.headers.get('x-lien-admin-chat-read-position') === 'v580'
      && response.headers.get('x-lien-receipt-physical-roll') === 'v579'
      && response.headers.get('x-lien-admin-sidebar-labels') === 'v578'
    ) return
    await sleep(1500)
  }
  assert.fail(`production readiness did not reach v580; last status ${lastStatus}`)
}

await waitForReady()

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers/messages/chat' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)

const list = await fetch(`${baseUrl}/admin/customers/messages/chat?smoke=v580`, {
  headers:{ Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' },
})
assert.equal(list.status, 200)
const listHtml = await list.text()
const threadIds = [...listHtml.matchAll(/\/admin\/customers\/messages\/chat\?threadId=([^"&]+)/g)]
  .map(match => decodeURIComponent(match[1]))
  .filter((value, index, values) => values.indexOf(value) === index)
assert.ok(threadIds.length > 0, 'production has no admin chat fixture')

let outgoingRows = 0
for (const threadId of threadIds.slice(0, 20)) {
  const response = await fetch(`${baseUrl}/admin/customers/messages/chat?threadId=${encodeURIComponent(threadId)}&smoke=v580`, {
    headers:{ Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' },
  })
  assert.equal(response.status, 200)
  const html = await response.text()
  outgoingRows += (html.match(/data-lien-admin-chat-direction="outgoing"/g) || []).length
  if (outgoingRows > 0) {
    assert.match(html, /data-lien-admin-chat-meta="v580"/)
    assert.match(html, /flex-direction:row-reverse/)
    break
  }
}
assert.ok(outgoingRows > 0, 'production has no outgoing chat message fixture')

console.log(JSON.stringify({
  release:'admin-chat-read-position-v580',
  production:true,
  readOnly:true,
  threadFixtures:threadIds.length,
  outgoingRows,
}))
