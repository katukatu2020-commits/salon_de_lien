import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-chat-message-ux'), 'v509')
assert.equal(ready.headers.get('x-lien-customer-experience'), 'v508')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers/messages/chat' }),
})
assert.equal(login.status, 303)
const sessionCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(sessionCookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/customers/messages/chat?smoke=v509`, {
  headers: { cookie: sessionCookie, 'Cache-Control': 'no-cache' },
})
assert.equal(page.status, 200)
const html = await page.text()
assert.match(html, /content-edit-delete-client-v509\.js/)
assert.doesNotMatch(html, /content-edit-delete-client-v490\.js/)

const client = await fetch(`${baseUrl}/content-edit-delete-client-v509.js?smoke=v509`, {
  headers: { 'Cache-Control': 'no-cache' },
})
assert.equal(client.status, 200)
const source = await client.text()
assert.match(source, /__lienStyleCommunityControlsV509/)
assert.match(source, /max-width:66\.666667%!important/)
assert.match(source, /addEventListener\('dblclick'/)

const chatEnhancer = source.slice(
  source.indexOf('function enhanceChatMessages()'),
  source.indexOf('function useStableCommunityNavigation'),
)
assert.doesNotMatch(chatEnhancer, /method: 'PATCH'/)
assert.doesNotMatch(chatEnhancer, /actionButton\('編集'/)

console.log(JSON.stringify({
  baseUrl,
  client: 'content-edit-delete-client-v509.js',
  maxBubbleWidth: '66.666667%',
  editControls: false,
  deleteGesture: 'dblclick-with-confirmation',
}, null, 2))
