import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const marker = 'style-admin-post-controls-v625'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

function appendFile(file, additionName, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  if (source.includes(marker)) throw new Error(`${label}: marker already exists`)
  const addition = fs.readFileSync(path.join(here, additionName), 'utf8')
  fs.writeFileSync(target, `${source.trimEnd()}\n\n/* ${marker} */\n${addition.trim()}\n`)
  changes.push({ file, label, count: 1 })
}

replaceExact(
  'style-admin-controls-v618.js',
  `p."organizationId"=$1 AND p."published"=TRUE AND p."deletedAt" IS NULL`,
  `p."organizationId"=$1 AND p."deletedAt" IS NULL`,
  2,
  'include private posts in admin filters and list',
)
replaceExact(
  'style-admin-controls-v618.js',
  `    SELECT p."id",p."publishedAt",p."postKind",p."styleStaffKey",`,
  `    SELECT p."id",p."published",p."publishedAt",p."postKind",p."styleStaffKey",`,
  1,
  'select publication state',
)
replaceExact(
  'style-admin-controls-v618.js',
  `  SELECT "id","publishedAt","postKind","styleStaffKey","title","stylistName","gender","courseName","coverReference","likeCount",`,
  `  SELECT "id","published","publishedAt","postKind","styleStaffKey","title","stylistName","gender","courseName","coverReference","likeCount",`,
  1,
  'return publication state',
)
replaceExact(
  'style-admin-controls-v618.js',
  `    postKind: String(row.postKind || ''),\n    title: String(row.title || 'サロンスタイル'),`,
  `    postKind: String(row.postKind || ''),\n    published: Boolean(row.published),\n    title: String(row.title || 'サロンスタイル'),`,
  1,
  'serialize publication state',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `    return '<a class="orimia-admin-style-card-v618" href="/admin/community/' + encodeURIComponent(post.id) +\n      '" aria-label="' + esc(post.title) + 'の詳細を開く">' +`,
  `    return '<a class="orimia-admin-style-card-v618" data-orimia-style-post-id-v625="' + esc(post.id) +\n      '" data-orimia-style-published-v625="' + (post.published ? 'true' : 'false') +\n      '" href="/admin/community/' + encodeURIComponent(post.id) +\n      '" aria-label="' + esc(post.title) + 'の詳細を開く">' +`,
  1,
  'expose card identity and publication state',
)
replaceExact(
  'public/style-admin-controls-v618.js',
  `  bindEditorButton()\n  const activateList = () => {`,
  `  window.__orimiaReloadStyleAdminV625 = () => {\n    if (normalizedPath() === LIST_PATH) loadList()\n  }\n  bindEditorButton()\n  const activateList = () => {`,
  1,
  'expose same-page list refresh',
)
appendFile('public/style-admin-controls-v618.js', 'style-admin-post-controls-v625.js', 'append admin post controls client')
appendFile('public/style-admin-controls-v618.css', 'style-admin-post-controls-v625.css', 'append admin post controls styles')

replaceExact(
  'server.js',
  '/style-admin-controls-v618.css?v=618-release1',
  '/style-admin-controls-v618.css?v=625-post-controls1',
  1,
  'style controls css cache key',
)
replaceExact(
  'server.js',
  '/style-admin-controls-v618.js?v=619-rerender1',
  '/style-admin-controls-v618.js?v=625-post-controls1',
  1,
  'style controls client cache key',
)

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Navigation-Loader-Verified', 'v624') /* navigation-loader-verification-v624-ready */`
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Post-Controls', 'v625') /* ${marker}-ready */`,
  1,
  'style admin post controls readiness',
)

fs.writeFileSync('/tmp/style-admin-post-controls-v625-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
