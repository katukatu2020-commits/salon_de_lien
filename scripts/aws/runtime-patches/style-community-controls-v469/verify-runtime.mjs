import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const files = {
  service: `${root}/content-management-v465.js`,
  client: `${root}/content-edit-delete-client-v469.js`,
  adminList: `${root}/.next/server/app/admin/community/page.js`,
  adminDetail: `${root}/.next/server/app/admin/community/[postId]/page.js`,
  customerDetail: `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  adminChat: `${root}/.next/server/app/admin/customers/messages/page.js`,
}

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]))
const assertions = [
  [source.service.includes('style-community-controls-v469'), 'service has v469 marker'],
  [source.service.includes("input.action === 'visibility'"), 'service supports visibility changes'],
  [source.service.includes('DELETE FROM "VisitCommunityPost"'), 'service separates deletion from visibility'],
  [source.service.includes("url.searchParams.get('scope') === 'posts'"), 'service exposes staff post management list'],
  [source.service.includes("audience === 'staff' ? staffSessionProvider"), 'service preserves separate staff/customer sessions'],
  [source.client.includes('window.__lienStyleCommunityControlsV469'), 'client initializes once'],
  [source.client.includes('投稿の公開管理'), 'client renders public/private management'],
  [source.client.includes('data-lien-comment-id'), 'client maps comment controls by stable ids'],
  [source.client.includes("document.addEventListener('lien:chat-rendered', schedule)"), 'client preserves stable chat renders'],
  [!source.client.includes('new MutationObserver'), 'client does not install a document-wide observer'],
  [source.adminList.includes('/content-edit-delete-client-v469.js'), 'admin list loads v469'],
  [source.adminDetail.includes('/content-edit-delete-client-v469.js'), 'admin detail loads v469'],
  [source.customerDetail.includes('/content-edit-delete-client-v469.js'), 'customer detail loads v469'],
  [source.adminChat.includes('/content-edit-delete-client-v469.js'), 'admin chat loads v469'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of Object.values(files)) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`style community controls v469 verified (${assertions.length} assertions)`)
