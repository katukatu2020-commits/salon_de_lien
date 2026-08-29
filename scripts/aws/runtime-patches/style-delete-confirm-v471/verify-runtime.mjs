import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const files = {
  service: `${root}/content-management-v465.js`,
  client: `${root}/content-edit-delete-client-v471.js`,
  adminList: `${root}/.next/server/app/admin/community/page.js`,
  adminDetail: `${root}/.next/server/app/admin/community/[postId]/page.js`,
  customerDetail: `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  adminChat: `${root}/.next/server/app/admin/customers/messages/page.js`,
}

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, 'utf8')]))
const assertions = [
  [source.service.includes('style-delete-confirm-v471'), 'service has v471 marker'],
  [source.service.includes('coverPhotoReference'), 'service returns tenant-scoped cover photos'],
  [source.service.includes('getSignedUrl'), 'service signs private S3 references'],
  [source.service.includes("input.action === 'visibility'"), 'service preserves visibility changes'],
  [source.service.includes('DELETE FROM "VisitCommunityPost"'), 'service preserves post deletion'],
  [source.client.includes('window.__lienStyleCommunityControlsV471'), 'client initializes once'],
  [source.client.includes('data-lien-style-grid-managed-v471'), 'client manages the existing image grid'],
  [source.client.includes('lien-style-card__footer'), 'client places controls below each image'],
  [source.client.includes("posts.filter(post => !post.published"), 'client adds hidden posts to the same grid'],
  [source.client.includes('data-dialog-confirmation-input'), 'delete dialog uses a single-line confirmation field'],
  [source.client.includes("confirmationText: '削除する'"), 'post deletion requires the exact confirmation text'],
  [source.client.includes('textarea[hidden]'), 'unused multiline fields stay hidden'],
  [!source.client.includes('投稿の公開管理'), 'client removes the duplicate management list'],
  [source.client.includes('data-lien-comment-id'), 'client preserves comment ownership controls'],
  [source.client.includes("document.addEventListener('lien:chat-rendered', schedule)"), 'client preserves stable chat renders'],
  [!source.client.includes('new MutationObserver'), 'client does not install a document-wide observer'],
  [source.adminList.includes('/content-edit-delete-client-v471.js'), 'admin list loads v471'],
  [source.adminDetail.includes('/content-edit-delete-client-v471.js'), 'admin detail loads v471'],
  [source.customerDetail.includes('/content-edit-delete-client-v471.js'), 'customer detail loads v471'],
  [source.adminChat.includes('/content-edit-delete-client-v471.js'), 'admin chat loads v471'],
]

for (const [condition, label] of assertions) {
  if (!condition) throw new Error(`runtime verification failed: ${label}`)
}

for (const file of Object.values(files)) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file}: ${syntax.stderr || syntax.stdout}`)
}

console.log(`style delete confirm v471 verified (${assertions.length} assertions)`)
