import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const files = {
  service: `${root}/content-management-v465.js`,
  customerChat: `${root}/ui-workflows-v294.js`,
  customerCommunity: `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  adminCommunity: `${root}/.next/server/app/admin/community/[postId]/page.js`,
  adminChat: `${root}/.next/server/app/admin/customers/messages/page.js`,
  client: `${root}/content-edit-delete-client-v466.js`,
}

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]))
const assertions = [
  [source.service.includes("url.pathname === '/content-edit-delete-client-v466.js'"), 'service exposes v466 client'],
  [source.service.includes("endsWith('v466.js')"), 'service reads the v466 client file'],
  [source.customerChat.includes("script.src = '/content-edit-delete-client-v466.js'"), 'customer chat loads v466'],
  [source.customerChat.includes("new CustomEvent('lien:chat-rendered')"), 'customer chat announces stable renders'],
  [source.customerCommunity.includes('/content-edit-delete-client-v466.js'), 'customer community loads v466'],
  [source.adminCommunity.includes('/content-edit-delete-client-v466.js'), 'admin community loads v466'],
  [source.adminChat.includes('/content-edit-delete-client-v466.js'), 'admin chat loads v466'],
  [source.client.includes('window.__lienContentEditDeleteV466'), 'v466 initializes once'],
  [source.client.includes("document.addEventListener('lien:chat-rendered', schedule)"), 'v466 listens for chat renders'],
  [!source.client.includes('new MutationObserver(schedule)'), 'v466 removes the document-wide observer'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of Object.values(files)) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`customer chat stability v466 verified (${assertions.length} assertions)`)
