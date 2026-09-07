import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3145').replace(/\/$/, '')

async function login() {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method:'POST',
    redirect:'manual',
    headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
    body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers/messages/chat' }),
  })
  assert.ok([302, 303].includes(response.status), `login failed with ${response.status}`)
  const cookie = (response.headers.get('set-cookie') || '').split(';')[0]
  assert.match(cookie, /^lien_admin_session=/)
  return cookie
}

const ready = await fetch(`${baseUrl}/api/health/ready?integration=v580`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-admin-chat-read-position'), 'v580')
assert.equal(ready.headers.get('x-lien-receipt-physical-roll'), 'v579')

const cookie = await login()
const list = await fetch(`${baseUrl}/admin/customers/messages/chat?integration=v580`, {
  headers:{ Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' },
})
assert.equal(list.status, 200)
const listHtml = await list.text()
const threadIds = [...listHtml.matchAll(/\/admin\/customers\/messages\/chat\?threadId=([^"&]+)/g)]
  .map(match => decodeURIComponent(match[1]))
  .filter((value, index, values) => values.indexOf(value) === index)
assert.ok(threadIds.length > 0, 'no admin chat fixture is available')

let conversationHtml = ''
for (const threadId of threadIds) {
  const response = await fetch(`${baseUrl}/admin/customers/messages/chat?threadId=${encodeURIComponent(threadId)}&integration=v580`, {
    headers:{ Cookie:cookie, Accept:'text/html', 'Cache-Control':'no-cache' },
  })
  assert.equal(response.status, 200)
  const html = await response.text()
  if (html.includes('data-lien-admin-chat-direction="outgoing"')) {
    conversationHtml = html
    break
  }
}

assert.ok(conversationHtml, 'no conversation with an outgoing staff message is available')
assert.match(conversationHtml, /data-lien-admin-chat-direction="outgoing"/)
assert.match(conversationHtml, /data-lien-admin-chat-meta="v580"/)
assert.match(conversationHtml, /flex-direction:row-reverse/)
assert.doesNotMatch(conversationHtml, /ml-auto flex-row-reverse/)

console.log(JSON.stringify({
  release:'admin-chat-read-position-v580',
  routeVerified:true,
  threadFixtures:threadIds.length,
  outgoingMetadataSide:'left',
}))
