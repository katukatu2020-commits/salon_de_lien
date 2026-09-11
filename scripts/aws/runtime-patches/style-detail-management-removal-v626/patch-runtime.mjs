import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const marker = 'style-detail-management-removal-v626'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

function appendClient(file, sourceName, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  if (source.includes(`/* ${marker} */`)) throw new Error(`${label}: marker already exists`)
  const addition = fs.readFileSync(path.join(here, sourceName), 'utf8')
  fs.writeFileSync(target, `${source.trimEnd()}\n\n/* ${marker} */\n${addition.trim()}\n`)
  changes.push({ file, label, count: 1 })
}

replaceExact(
  'public/content-edit-delete-client-v615.js',
  '    if (!commentOnlyCustomer) meta.insertAdjacentElement("afterend", panel);',
  `    const hideManagementForStaffStyle =
      audience === "staff" &&
      (article.matches(".orimia-style-detail-staff-v602") ||
        Boolean(content.querySelector(".orimia-style-details-v602")));
    if (!commentOnlyCustomer && !hideManagementForStaffStyle)
      meta.insertAdjacentElement("afterend", panel);`,
  1,
  'stop inserting the legacy management panel on staff style details',
)

appendClient(
  'public/style-admin-controls-v618.js',
  'style-detail-management-removal-v626.js',
  'append cached-client cleanup for staff style details',
)

replaceExact(
  'server.js',
  '/style-admin-controls-v618.js?v=625-post-controls3',
  '/style-admin-controls-v618.js?v=626-detail-cleanup1',
  1,
  'style detail cleanup client cache key',
)

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Admin-Post-Controls', 'v625') /* style-admin-post-controls-v625-ready */`
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Detail-Cleanup', 'v626') /* ${marker}-ready */`,
  1,
  'style detail management removal readiness',
)

fs.writeFileSync('/tmp/style-detail-management-removal-v626-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
