import fs from 'node:fs'
import path from 'node:path'

const clientChunkDirectory = '/app/.next/static/chunks/app'
const serverChunkPath = '/app/.next/server/chunks/1425.js'
const oldClientChunkName = 'layout-sidebar-boundary-20260812-01.customertabs.sms-compliance-v1.admin-mobile-v38.staff-unified-v48.tenant-runtime-v267.js'
const newClientChunkName = 'layout-sidebar-boundary-20260812-01.customertabs.sms-compliance-v1.admin-mobile-v38.staff-unified-v48.tenant-runtime-v267.owner-header-first-paint-v423.js'
const newClientChunkPath = path.join(clientChunkDirectory, newClientChunkName)

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) throw new Error(`${label}: verification failed`)
}

const serverChunk = fs.readFileSync(serverChunkPath, 'utf8')
const clientChunk = fs.readFileSync(newClientChunkPath, 'utf8')
const appBuildManifest = fs.readFileSync('/app/.next/app-build-manifest.json', 'utf8')

assertIncludes(serverChunk, 'className: "hidden"', 'server first-paint search removal')
assertIncludes(clientChunk, 'className: "hidden"', 'client hydration search removal')
assertIncludes(clientChunk, '/commercial-admin-v136.js?v=20260824-423', 'commercial shell cache bust')
assertIncludes(appBuildManifest, newClientChunkName, 'active layout chunk')
if (appBuildManifest.includes(oldClientChunkName)) throw new Error('old layout chunk is still active')

console.log('owner billing first-paint header v423 verified')
