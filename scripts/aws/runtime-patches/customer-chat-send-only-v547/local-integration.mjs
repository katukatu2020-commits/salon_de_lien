import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3125').replace(/\/$/, '')
const headers = {
  Accept: 'text/html',
  'Cache-Control': 'no-cache',
  'User-Agent': 'ORIMIA-customer-chat-send-only-v547-integration/1.0',
}

const ready = await fetch(`${baseUrl}/api/health/ready?verify=v547`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-chat-send-only'), 'v547')
assert.equal(ready.headers.get('x-lien-customer-navigation-privacy'), 'v546')

const customerLogin = await fetch(`${baseUrl}/api/customer-auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': headers['User-Agent'] },
  body: new URLSearchParams({ loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/chat' }),
})
assert.ok([302, 303].includes(customerLogin.status), `unexpected customer login redirect: ${customerLogin.status}`)
const customerCookie = customerLogin.headers.get('set-cookie')?.split(';')[0]
assert.ok(customerCookie, 'customer login cookie was not returned')

const chat = await fetch(`${baseUrl}/u/chat?verify=v547`, { headers: { ...headers, Cookie: customerCookie } })
assert.equal(chat.status, 200)
const chatHtml = await chat.text()
assert.match(chatHtml, /layout-customer-mobile-nav-v425\.chat-send-only-v547\.js/)

const workflowResponse = await fetch(`${baseUrl}/ui-workflows-v294.js?v=547-send-only1`, { headers })
assert.equal(workflowResponse.status, 200)
const workflow = await workflowResponse.text()
assert.match(workflow, /window\.__orimiaCustomerChatSendOnlyV547 = true/)
assert.match(workflow, /data-lien-chat-can-edit="false" data-lien-chat-customer-read-only="v547"/)
assert.match(workflow, /enforceCustomerChatReadOnly/)
assert.doesNotMatch(workflow, /script\.src = '\/content-edit-delete-client-v466\.js'/)

const customerLayout = await fetch(`${baseUrl}/_next/static/chunks/app/u/(account)/layout-customer-mobile-nav-v425.chat-send-only-v547.js`, { headers })
assert.equal(customerLayout.status, 200)
assert.match(await customerLayout.text(), /ui-workflows-v294\.js\?v=547-send-only1/)

const staffLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': headers['User-Agent'] },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers/messages/chat' }),
})
assert.equal(staffLogin.status, 303)
const staffCookie = staffLogin.headers.get('set-cookie')?.split(';')[0]
assert.ok(staffCookie, 'staff login cookie was not returned')
const staffChat = await fetch(`${baseUrl}/admin/customers/messages/chat?verify=v547`, { headers: { ...headers, Cookie: staffCookie } })
assert.equal(staffChat.status, 200)
assert.match(await staffChat.text(), /content-edit-delete-client-v509\.js/)

console.log(JSON.stringify({
  release: 'customer-chat-send-only-v547',
  customerChatReadOnly: true,
  legacyControlLoaderRemoved: true,
  staffChatRuntimePreserved: true,
}))
