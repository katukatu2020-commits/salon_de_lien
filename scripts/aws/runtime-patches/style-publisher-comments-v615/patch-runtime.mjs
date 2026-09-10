import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'style-publisher-comments-v615'
const here = path.dirname(fileURLToPath(import.meta.url))
const changes = []
const chunkDirectory = '.next/server/chunks'
const pageFiles = [
  '.next/server/app/admin/community/page.js',
  '.next/server/app/admin/community/[postId]/page.js',
  '.next/server/app/u/(account)/community/[postId]/page.js',
  '.next/server/app/admin/customers/messages/page.js',
]

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ kind:'replace', file, before, after, count })
}

function addFile(sourceName, targetName) {
  const target = path.join(root, targetName)
  if (fs.existsSync(target)) throw new Error(`${targetName}: target already exists`)
  fs.copyFileSync(path.join(here, sourceName), target)
  changes.push({ kind:'add', file:targetName })
}

addFile('content-edit-delete-client-v615.js', 'public/content-edit-delete-client-v615.js')

const oldClientPath = '/content-edit-delete-client-v560.js'
const newClientPath = '/content-edit-delete-client-v615.js'
const oldBootstrap = '"data-lien-community-bootstrap": "v560"'
const newBootstrap = '"data-lien-community-bootstrap": "v615"'
const publisherSelectBefore = 'publishedByName:!0,customer:{select:{name:!0}},visit:'
const publisherSelectAfter = 'publishedByName:!0,organization:{select:{name:!0}},customer:{select:{name:!0}},visit:'
const publisherNameBefore = 'customerName:"STORE"===s.postKind?"ORIMIA":u(s.customer?.name??""),visitDate:'
const publisherNameAfter = 'customerName:s.organization?.name?.trim()||"店舗",visitDate:'

let shellChunks = 0
let publisherChunks = 0
for (const entry of fs.readdirSync(path.join(root, chunkDirectory), { withFileTypes:true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const relative = path.join(chunkDirectory, entry.name)
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  if (source.includes(oldBootstrap)) {
    replaceExact(relative, oldClientPath, newClientPath, 1, `${entry.name} community client path`)
    replaceExact(relative, oldBootstrap, newBootstrap, 1, `${entry.name} community bootstrap`)
    shellChunks += 1
  }
  if (source.includes(publisherNameBefore)) {
    replaceExact(relative, publisherSelectBefore, publisherSelectAfter, 1, `${entry.name} organization publisher select`)
    replaceExact(relative, publisherNameBefore, publisherNameAfter, 1, `${entry.name} organization publisher name`)
    publisherChunks += 1
  }
}
if (shellChunks !== 1) throw new Error(`${marker}: expected one AppShell chunk, patched ${shellChunks}`)
if (publisherChunks !== 2) throw new Error(`${marker}: expected two community data chunks, patched ${publisherChunks}`)

for (const file of pageFiles) {
  replaceExact(file, oldClientPath, newClientPath, 1, `${file} community client path`)
}

replaceExact(
  'admin-staff-experience-v276.js',
  oldClientPath,
  newClientPath,
  2,
  'shared community loader path',
)
replaceExact(
  'admin-staff-experience-v276.js',
  'V560',
  'V615',
  3,
  'shared community loader version',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Current-Appointment', 'v614') /* customer-current-appointment-v614-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Publisher-Comments', 'v615') /* ${marker}-ready */`,
  1,
  'style publisher and comments readiness header',
)

fs.writeFileSync('/tmp/style-publisher-comments-v615-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({
  release:marker,
  shellChunks,
  publisherChunks,
  modified:[...new Set(changes.filter(change => change.kind === 'replace').map(change => change.file))],
  added:changes.filter(change => change.kind === 'add').map(change => change.file),
}))
