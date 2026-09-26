import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const inbox = fs.readFileSync(path.join(root, 'admin-chat-inbox-v589.js'), 'utf8')

function count(value, needle) {
  return value.split(needle).length - 1
}

if (snapshot) {
  assert.equal(count(server, 'admin-chat-reply-v669'), 0)
  assert.equal(count(inbox, 'admin-chat-reply-v669'), 0)
  assert.equal(count(server, `const threadId = String(form.get('threadId') || '')`), 1)
  assert.equal(count(server, `} /* admin-chat-search-v589-lifecycle */`), 1)
  assert.equal(count(server, `X-Lien-Customer-Store-Frequency', 'v668'`), 1)
  assert.equal(count(inbox, `'/admin-chat-search-client-v589.js':'application/javascript'`), 1)
  console.log(JSON.stringify({ release: 'admin-chat-reply-v669', snapshot: true }))
  process.exit(0)
}

for (const file of ['admin-chat-reply-v669.js', 'admin-chat-reply-client-v669.js']) {
  assert.equal(fs.existsSync(path.join(root, file)), true, `${file} was not installed`)
}
assert.equal(count(server, `require('./admin-chat-reply-v669')`), 1)
assert.equal(count(server, 'recoveredChatContext = adminChatReplyV669.recoverContext(req, form)'), 1)
assert.equal(count(server, 'id="orimia-admin-chat-reply-v669"'), 1)
assert.equal(count(server, `X-Lien-Admin-Chat-Reply', 'v669'`), 1)
assert.equal(count(inbox, `'/admin-chat-reply-client-v669.js':'application/javascript'`), 1)
assert.equal(server.includes(`if (!thread || !canAccessThread(session, thread) || !text || text.length > 2000)`), true)
assert.equal(server.includes(`WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1`), true)
console.log(JSON.stringify({ release: 'admin-chat-reply-v669', verified: true }))
