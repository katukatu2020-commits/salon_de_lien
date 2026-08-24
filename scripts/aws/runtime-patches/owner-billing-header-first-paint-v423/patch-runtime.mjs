import fs from 'node:fs'
import path from 'node:path'

const clientChunkDirectory = '/app/.next/static/chunks/app'
const serverChunkPath = '/app/.next/server/chunks/1425.js'
const oldClientChunkName = 'layout-sidebar-boundary-20260812-01.customertabs.sms-compliance-v1.admin-mobile-v38.staff-unified-v48.tenant-runtime-v267.js'
const newClientChunkName = 'layout-sidebar-boundary-20260812-01.customertabs.sms-compliance-v1.admin-mobile-v38.staff-unified-v48.tenant-runtime-v267.owner-header-first-paint-v423.js'
const oldClientChunkPath = path.join(clientChunkDirectory, oldClientChunkName)
const newClientChunkPath = path.join(clientChunkDirectory, newClientChunkName)
const oldSearchClass = 'className: "relative ml-2 min-w-0 flex-1 max-w-xl"'
const hiddenSearchClass = 'className: "hidden"'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

function walk(directory) {
  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(filePath))
    else files.push(filePath)
  }
  return files
}

const serverChunk = fs.readFileSync(serverChunkPath, 'utf8')
fs.writeFileSync(
  serverChunkPath,
  replaceOnce(serverChunk, oldSearchClass, hiddenSearchClass, 'server-rendered owner header search'),
)

let clientChunk = fs.readFileSync(oldClientChunkPath, 'utf8')
clientChunk = replaceOnce(clientChunk, oldSearchClass, hiddenSearchClass, 'hydrated owner header search')
clientChunk = replaceOnce(
  clientChunk,
  "/commercial-admin-v136.js?v=20260817-267",
  "/commercial-admin-v136.js?v=20260824-423",
  'commercial admin cache key',
)
fs.writeFileSync(newClientChunkPath, clientChunk)

const manifestFiles = [
  '/app/.next/app-build-manifest.json',
  ...walk('/app/.next/server/app').filter(filePath => filePath.endsWith('_client-reference-manifest.js')),
]
let replacedManifestCount = 0
for (const manifestPath of manifestFiles) {
  const source = fs.readFileSync(manifestPath, 'utf8')
  if (!source.includes(oldClientChunkName)) continue
  fs.writeFileSync(manifestPath, source.split(oldClientChunkName).join(newClientChunkName))
  replacedManifestCount += 1
}
if (replacedManifestCount < 2) {
  throw new Error(`layout manifest references were not fully found: ${replacedManifestCount}`)
}

console.log(`owner billing first-paint header v423 patched (${replacedManifestCount} manifests)`)
