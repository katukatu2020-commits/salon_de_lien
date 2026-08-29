import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const files = {
  server: `${root}/server.js`,
  customerChat: `${root}/ui-workflows-v294.js`,
  customerCommunity: `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  adminCommunity: `${root}/.next/server/app/admin/community/[postId]/page.js`,
  adminChat: `${root}/.next/server/app/admin/customers/messages/page.js`,
  service: `${root}/content-management-v465.js`,
  client: `${root}/content-edit-delete-client-v465.js`,
}

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]))
const assertions = [
  [source.server.includes("require('./content-management-v465')"), 'server loads the management service'],
  [source.server.includes('content-edit-delete-v465-ownership'), 'chat response includes ownership flags'],
  [source.server.includes('contentManagement.handle(req, res, url)'), 'management routes are dispatched'],
  [source.customerChat.includes('data-lien-chat-message='), 'customer messages expose stable ids'],
  [source.customerChat.includes('Boolean(message.canEdit)'), 'customer chat respects server ownership'],
  [source.customerCommunity.includes('/content-edit-delete-client-v465.js'), 'customer community loads editing UI'],
  [source.adminCommunity.includes('/content-edit-delete-client-v465.js'), 'admin community loads editing UI'],
  [source.adminChat.includes('e.senderUserId === s.userId'), 'admin chat limits controls to the sender'],
  [source.adminChat.includes('data-lien-chat-body'), 'admin chat body is editable'],
  [source.service.includes('"published"=FALSE'), 'community post deletion is non-destructive'],
  [source.service.includes('"deletedAt"=CURRENT_TIMESTAMP'), 'community comment deletion is non-destructive'],
  [source.service.includes('String(message.senderUserId || \'\') !== String(session.userId)'), 'chat ownership is enforced server-side'],
  [source.client.includes('自分が送信したメッセージだけを更新できます。'), 'chat editing has clear user guidance'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of Object.values(files)) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`content edit/delete v465 verified (${assertions.length} assertions)`)
