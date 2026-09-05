import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = {
  Accept: 'text/html',
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-customer-chat-send-only-v547-smoke/1.0',
}

async function get(pathname, extraHeaders = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { ...headers, ...extraHeaders },
    cache: 'no-store',
  })
  assert.equal(response.status, 200, `${pathname}: expected 200, received ${response.status}`)
  return response
}

const ready = await get('/api/health/ready?smoke=v547')
assert.equal(ready.headers.get('x-lien-customer-chat-send-only'), 'v547')
assert.equal(ready.headers.get('x-lien-customer-navigation-privacy'), 'v546')
assert.equal(ready.headers.get('x-lien-customer-profile-auto-upload'), 'v545')
assert.equal(ready.headers.get('x-lien-customer-registration-single-loader'), 'v544')

const workflow = await (await get('/ui-workflows-v294.js?v=547-send-only1&smoke=v547')).text()
assert.match(workflow, /window\.__orimiaCustomerChatSendOnlyV547 = true/)
assert.match(workflow, /data-lien-chat-can-edit="false" data-lien-chat-customer-read-only="v547"/)
assert.match(workflow, /enforceCustomerChatReadOnly/)
assert.doesNotMatch(workflow, /script\.src = '\/content-edit-delete-client-v466\.js'/)

const login = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': headers['User-Agent'] },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/chat' }),
})
assert.ok([302, 303].includes(login.status), `unexpected login redirect: ${login.status}`)
const cookie = login.headers.get('set-cookie')?.split(';')[0]
assert.ok(cookie, 'customer login cookie was not returned')

const chatHtml = await (await get('/u/chat?smoke=v547', { Cookie: cookie })).text()
assert.match(chatHtml, /layout-customer-mobile-nav-v425\.chat-send-only-v547\.js/)

const customerLayout = await (await get('/_next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.chat-send-only-v547.js?smoke=v547')).text()
assert.match(customerLayout, /ui-workflows-v294\.js\?v=547-send-only1/)

console.log(JSON.stringify({
  release: 'customer-chat-send-only-v547',
  productionVerified: true,
  legacyControlLoaderRemoved: true,
  customerChatMessagesReadOnly: true,
}))
