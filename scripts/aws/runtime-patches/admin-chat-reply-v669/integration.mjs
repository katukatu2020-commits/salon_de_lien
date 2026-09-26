import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const reply = require('./admin-chat-reply-v669.js')

function request(referer, host = 'salon-de-lien.com') {
  return { headers: { host, ...(referer ? { referer } : {}) } }
}

let context = reply.recoverContext(
  request('https://salon-de-lien.com/admin/customers/messages?chat=1&threadId=ref-thread'),
  new URLSearchParams({ threadId: 'submitted-thread', body: 'hello' }),
)
assert.deepEqual(context, {
  threadId: 'submitted-thread',
  customerId: '',
  recoveredThreadId: false,
  recoveredCustomerId: false,
})

context = reply.recoverContext(
  request('https://salon-de-lien.com/admin/customers/messages?chat=1&threadId=ref-thread'),
  new URLSearchParams({ body: 'hello' }),
)
assert.equal(context.threadId, 'ref-thread')
assert.equal(context.recoveredThreadId, true)

context = reply.recoverContext(
  { headers: { host: 'internal:3000', 'x-forwarded-host': 'salon-de-lien.com', referer: 'https://salon-de-lien.com/admin/customers/messages/chat?customerId=customer-1' } },
  new URLSearchParams({ body: 'hello' }),
)
assert.equal(context.customerId, 'customer-1')
assert.equal(context.recoveredCustomerId, true)

for (const referer of [
  'https://attacker.example/admin/customers/messages?chat=1&threadId=evil',
  'https://salon-de-lien.com/admin/products?threadId=wrong-page',
  'not-a-url',
]) {
  context = reply.recoverContext(request(referer), new URLSearchParams({ body: 'hello' }))
  assert.equal(context.threadId, '', referer)
}

context = reply.recoverContext(
  request(`https://salon-de-lien.com/admin/customers/messages?chat=1&threadId=${'x'.repeat(201)}`),
  new URLSearchParams({ body: 'hello' }),
)
assert.equal(context.threadId, '')
assert.equal(reply.cleanId(`  thread-2  `), 'thread-2')
assert.equal(reply.cleanId('x'.repeat(201)), '')

console.log(JSON.stringify({ release: 'admin-chat-reply-v669', directContext: true, referrerRecovery: true, crossOriginRejected: true, routeRestricted: true, lengthRestricted: true }))
