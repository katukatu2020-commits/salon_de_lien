import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const clientPath = `${root}/public/broadcast-layout-v510.js`
const serverPath = `${root}/server.js`
const layoutRuntimePath = `${root}/.next/static/chunks/app/layout-runtime-v510.js`
const messagesManifestPath = `${root}/.next/server/app/admin/customers/messages/page_client-reference-manifest.js`

assert.ok(fs.existsSync(clientPath), 'v510 browser client is missing')
const client = fs.readFileSync(clientPath, 'utf8')
assert.match(client, /__lienBroadcastLayoutV510/)
assert.match(client, /dataset\.lienBroadcastLayout = 'v510'/)
assert.match(client, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/)
assert.match(client, /grid-template-areas:[\s\S]*?"step toggle"[\s\S]*?"step note"/)
assert.match(client, /\.store-broadcast-flow-v501 > \[data-store-broadcast-step="1"\]/)
assert.match(client, /\.store-broadcast-flow-v501 > \[data-store-broadcast-step="2"\]/)
assert.match(client, /\.store-broadcast-flow-v501 > \[data-store-broadcast-step="3"\]/)
assert.match(client, /@media \(max-width: 767\.98px\)/)
assert.match(client, /fields\.hidden = !enabled/)
assert.match(client, /input\.disabled = !enabled/)

const server = fs.readFileSync(serverPath, 'utf8')
assert.equal((server.match(/X-Lien-Broadcast-Layout/g) || []).length, 1)
assert.match(server, /X-Lien-Broadcast-Layout', 'v510'/)
assert.match(server, /X-Lien-Chat-Message-UX', 'v509'/)
assert.equal((server.match(/broadcast-layout-v510\.js\?v=510-final/g) || []).length, 1)

assert.ok(fs.existsSync(layoutRuntimePath), 'cache-busted v510 layout chunk is missing')
const layoutRuntime = fs.readFileSync(layoutRuntimePath, 'utf8')
assert.equal((layoutRuntime.match(/broadcast-layout-v510-loader/g) || []).length, 3)
assert.match(layoutRuntime, /broadcast-layout-v510\.js\?v=510-final/)

const messagesManifest = fs.readFileSync(messagesManifestPath, 'utf8')
assert.match(messagesManifest, /layout-runtime-v510\.js/)
assert.doesNotMatch(messagesManifest, /layout-runtime-v503-final\.js/)

console.log('broadcast-layout-v510 runtime verified')
