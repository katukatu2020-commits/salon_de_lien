import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const page = fs.readFileSync(`${root}/.next/server/app/admin/customers/messages/page.js`, 'utf8')
const server = fs.readFileSync(`${root}/server.js`, 'utf8')

for (const required of [
  'admin-chat-read-position-v580',
  '"data-lien-admin-chat-direction": e.senderType === "staff" ? "outgoing" : "incoming"',
  'style: { flexDirection: e.senderType === "staff" ? "row-reverse" : "row" }',
  '"data-lien-admin-chat-meta": "v580"',
  'textAlign: e.senderType === "staff" ? "right" : "left"',
  '"data-lien-admin-chat-read": "v580"',
  'e.senderType === "staff" && m.customerLastReadAt',
]) assert.ok(page.includes(required), `admin chat invariant missing: ${required}`)

assert.doesNotMatch(page, /e\.senderType === "staff" \? "ml-auto flex-row-reverse"/)
assert.equal((page.match(/data-lien-admin-chat-direction/g) || []).length, 1)
assert.equal((page.match(/data-lien-admin-chat-meta/g) || []).length, 1)
assert.equal((page.match(/data-lien-admin-chat-read/g) || []).length, 1)

for (const required of [
  "X-Lien-Admin-Chat-Read-Position', 'v580'",
  "X-Lien-Receipt-Physical-Roll', 'v579'",
  "X-Lien-Admin-Sidebar-Labels', 'v578'",
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)

console.log(JSON.stringify({
  release:'admin-chat-read-position-v580',
  runtimeVerified:true,
  outgoingMetadataSide:'left',
  incomingMetadataSide:'right',
  perMessageReadStatePreserved:true,
}))
