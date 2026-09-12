import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-demo-ordering-v634'
const here = path.dirname(fileURLToPath(import.meta.url))
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind: 'replace', file, label, count })
}

function replaceFile(sourceName, targetName) {
  const target = path.join(root, targetName)
  if (!fs.existsSync(target)) throw new Error(`${targetName}: runtime target is missing`)
  fs.copyFileSync(path.join(here, sourceName), target)
  changes.push({ kind: 'replace-file', file: targetName })
}

replaceFile('style-admin-controls-v618.js', 'style-admin-controls-v618.js')
replaceFile('style-admin-controls-v618-client.js', 'public/style-admin-controls-v618.js')
replaceFile('style-admin-controls-v618.css', 'public/style-admin-controls-v618.css')
replaceFile('style-community-controls-v610.js', 'style-community-controls-v610.js')
replaceFile('style-community-controls-v610-client.js', 'public/style-community-controls-v610.js')

replaceExact(
  'server.js',
  '/style-community-controls-v610.js?v=618-gender1',
  '/style-community-controls-v610.js?v=634-order1',
  1,
  'customer style ordering asset cache key',
)
replaceExact(
  'server.js',
  '/style-admin-controls-v618.css?v=628-pagination1',
  '/style-admin-controls-v618.css?v=634-order1',
  1,
  'admin style ordering stylesheet cache key',
)
replaceExact(
  'server.js',
  '/style-admin-controls-v618.js?v=628-pagination1',
  '/style-admin-controls-v618.js?v=634-order1',
  1,
  'admin style ordering asset cache key',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Registration-Name-Fields', 'v633') /* customer-registration-name-fields-v633-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Demo-Ordering', 'v634') /* ${marker}-ready */`,
  1,
  'style demo ordering readiness marker',
)

replaceExact(
  'prisma/schema.prisma',
  '  publishedAt          DateTime  @default(now())\n  aiCommentDueAt',
  '  publishedAt          DateTime  @default(now())\n  displayOrder        Int?\n  aiCommentDueAt',
  1,
  'runtime style display order field',
)
replaceExact(
  'prisma/schema.prisma',
  '  @@index([organizationId, published, publishedAt])\n  @@index([organizationId, published, aiCommentDueAt, aiCommentedAt])',
  '  @@index([organizationId, published, publishedAt])\n  @@index([organizationId, displayOrder])\n  @@index([organizationId, published, aiCommentDueAt, aiCommentedAt])',
  1,
  'runtime style display order index',
)

fs.writeFileSync('/tmp/style-demo-ordering-v634-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release: marker,
  modified: [...new Set(changes.map(change => change.file))],
}))
