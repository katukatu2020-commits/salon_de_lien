import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const commercialPath = path.join(root, 'commercial-admin-v101.js')
const marker = 'wholesale-ordering-v543'

let server = fs.readFileSync(serverPath, 'utf8')
let commercial = fs.readFileSync(commercialPath, 'utf8')
const entry = fs.readFileSync(path.join(patchRoot, 'wholesale-entry-v543.js'), 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

for (const file of ['wholesale-ordering-v543.js', 'wholesale-ordering-client-v543.js', 'wholesale-ordering-v543.css']) {
  fs.copyFileSync(path.join(patchRoot, file), path.join(root, file))
}

server = replaceOnce(
  server,
  `const { createStoreProfileService } = require('./store-profile') /* commercial-admin-v101 */`,
  `const { createStoreProfileService } = require('./store-profile') /* commercial-admin-v101 */\nconst { createWholesaleOrderingService } = require('./wholesale-ordering-v543') /* ${marker} */`,
  'wholesale service import',
)

server = replaceOnce(
  server,
  `const storeProfile = createStoreProfileService({ prisma, crypto }) /* commercial-admin-v101-service */`,
  `const storeProfile = createStoreProfileService({ prisma, crypto }) /* commercial-admin-v101-service */\nconst wholesaleOrdering = createWholesaleOrderingService({ prisma, crypto, adminSessionProvider: req => chatSession(req, 'staff') }) /* ${marker} */`,
  'wholesale service initialization',
)

server = replaceOnce(
  server,
  `  await catalogOperations.ensureSchema() /* catalog-registration-v96-schema */`,
  `  await catalogOperations.ensureSchema() /* catalog-registration-v96-schema */\n  await wholesaleOrdering.ensureSchema() /* ${marker} */`,
  'wholesale schema initialization',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Sales-Ledger-Staff-Multiselect', 'v542') /* sales-ledger-staff-multiselect-v542 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Wholesale-Ordering', 'v543') /* ${marker} */`,
  'wholesale readiness marker',
)

server = replaceOnce(
  server,
  `      if (await tenantSetup.handle(req, res, url)) return /* tenant-bootstrap-v70-route */\n      if (await storeProfile.handle(req, res, url)) return /* commercial-admin-v101-route */`,
  `      if (await tenantSetup.handle(req, res, url)) return /* tenant-bootstrap-v70-route */\n      if (await wholesaleOrdering.handle(req, res, url)) return /* ${marker} */\n      if (await storeProfile.handle(req, res, url)) return /* commercial-admin-v101-route */`,
  'wholesale request handler',
)

commercial = replaceOnce(
  commercial,
  `    inventory: { title: '商品在庫設定', description: '入荷・棚卸し後の実在庫数をまとめて更新します。', headings: ['商品在庫'] },\n`,
  '',
  'legacy inventory embedded panel',
)
if (!commercial.includes('window.__orimiaWholesaleOrderingV543')) commercial += `\n\n${entry}\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(commercialPath, commercial)
console.log(JSON.stringify({ release: marker, patched: true }))
