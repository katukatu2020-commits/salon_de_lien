import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const chunkDirectory = `${root}/.next/server/chunks`
const clientSource = '/tmp/lien-v509/content-edit-delete-client-v509.js'
const clientTarget = `${root}/public/content-edit-delete-client-v509.js`
const oldClientPath = '/content-edit-delete-client-v490.js'
const newClientPath = '/content-edit-delete-client-v509.js'
const oldBootstrap = '"data-lien-community-bootstrap": "v490"'
const newBootstrap = '"data-lien-community-bootstrap": "v509"'
const staffRuntimePath = `${root}/admin-staff-experience-v276.js`
const serverPath = `${root}/server.js`
const pageFiles = [
  `${root}/.next/server/app/admin/community/page.js`,
  `${root}/.next/server/app/admin/community/[postId]/page.js`,
  `${root}/.next/server/app/u/(account)/community/[postId]/page.js`,
  `${root}/.next/server/app/admin/customers/messages/page.js`,
]

function replaceExact(source, before, after, expected, label) {
  const matches = source.split(before).length - 1
  if (matches !== expected) {
    throw new Error(`chat-message-ux-v509: expected ${expected} ${label} matches, found ${matches}`)
  }
  return source.replaceAll(before, after)
}

fs.copyFileSync(clientSource, clientTarget)

let shellPatches = 0
for (const entry of fs.readdirSync(chunkDirectory, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const file = `${chunkDirectory}/${entry.name}`
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes(oldBootstrap)) continue
  source = replaceExact(source, oldClientPath, newClientPath, 1, `${entry.name} client path`)
  source = replaceExact(source, oldBootstrap, newBootstrap, 1, `${entry.name} bootstrap`)
  fs.writeFileSync(file, source)
  shellPatches += 1
}

if (shellPatches !== 1) throw new Error(`chat-message-ux-v509: expected one AppShell chunk, patched ${shellPatches}`)

for (const file of pageFiles) {
  let source = fs.readFileSync(file, 'utf8')
  source = replaceExact(source, oldClientPath, newClientPath, 1, `${file} client path`)
  fs.writeFileSync(file, source)
}

let staffRuntime = fs.readFileSync(staffRuntimePath, 'utf8')
staffRuntime = replaceExact(staffRuntime, oldClientPath, newClientPath, 2, 'shared loader path')
staffRuntime = replaceExact(staffRuntime, 'V490', 'V509', 3, 'shared loader version')
fs.writeFileSync(staffRuntimePath, staffRuntime)

let server = fs.readFileSync(serverPath, 'utf8')
const readyMarker = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Experience', 'v508')"
server = replaceExact(
  server,
  readyMarker,
  `${readyMarker}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Chat-Message-UX', 'v509')`,
  1,
  'readiness marker',
)
fs.writeFileSync(serverPath, server)

console.log('chat-message-ux-v509 runtime patched')
