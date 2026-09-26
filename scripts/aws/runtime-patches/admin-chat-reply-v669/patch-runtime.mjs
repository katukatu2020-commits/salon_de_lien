import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const release = 'admin-chat-reply-v669'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const source = path.dirname(fileURLToPath(import.meta.url))

function once(value, before, after, label) {
  const matches = value.split(before).length - 1
  if (matches !== 1) throw new Error(`${label}: expected one anchor, found ${matches}`)
  return value.replace(before, after)
}

for (const file of ['admin-chat-reply-v669.js', 'admin-chat-reply-client-v669.js']) {
  fs.copyFileSync(path.join(source, file), path.join(root, file))
}

const inboxPath = path.join(root, 'admin-chat-inbox-v589.js')
let inbox = fs.readFileSync(inboxPath, 'utf8').replace(/\r\n/g, '\n')
if (inbox.includes(release)) throw new Error(`${release}: inbox already patched`)
inbox = once(
  inbox,
  `const files = {'/admin-chat-search-v589.css':'text/css','/admin-chat-search-client-v589.js':'application/javascript'}`,
  `const files = {'/admin-chat-search-v589.css':'text/css','/admin-chat-search-client-v589.js':'application/javascript','/admin-chat-reply-client-v669.js':'application/javascript'} /* ${release} */`,
  'chat asset map',
)
fs.writeFileSync(inboxPath, inbox)

const serverPath = path.join(root, 'server.js')
let server = fs.readFileSync(serverPath, 'utf8').replace(/\r\n/g, '\n')
if (server.includes(release)) throw new Error(`${release}: server already patched`)
server = once(
  server,
  `const adminChatInbox = require('./admin-chat-inbox-v589')`,
  `const adminChatInbox = require('./admin-chat-inbox-v589')\nconst adminChatReplyV669 = require('./admin-chat-reply-v669') /* ${release} */`,
  'reply recovery import',
)
server = once(
  server,
  `  } /* admin-chat-search-v589-lifecycle */`,
  `  } /* admin-chat-search-v589-lifecycle */\n  if (adminRoute && !output.includes('orimia-admin-chat-reply-v669')) {\n    output = output.replace('<head>', '<head><script id="orimia-admin-chat-reply-v669" src="/admin-chat-reply-client-v669.js?v=669-release1" defer></script>')\n  } /* ${release}-asset */`,
  'reply client injection',
)
server = once(
  server,
  `  const form = new URLSearchParams(raw)\n  const threadId = String(form.get('threadId') || '')\n  const customerId = String(form.get('customerId') || '')`,
  `  const form = new URLSearchParams(raw)\n  const recoveredChatContext = adminChatReplyV669.recoverContext(req, form) /* ${release} */\n  const threadId = recoveredChatContext.threadId\n  const customerId = recoveredChatContext.customerId`,
  'chat form context',
)
server = once(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-Frequency', 'v668') /* customer-store-frequency-v668-ready */`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-Frequency', 'v668') /* customer-store-frequency-v668-ready */\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Chat-Reply', 'v669') /* ${release}-ready */`,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release, clientContextSync: true, serverReferrerRecovery: true }))
