import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const servicePath = path.join(root, 'sales-ledger-accounts-v318.js')
const serverPath = path.join(root, 'server.js')
const marker = 'shared-account-identity-scope-v552'

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let service = fs.readFileSync(servicePath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

if ([service, server].some(source => source.includes(marker))) {
  throw new Error(`${marker}: patch already applied`)
}

fs.copyFileSync(
  path.join(patchRoot, 'shared-account-service-v552.js'),
  path.join(root, 'shared-account-service-v552.js'),
)

service = replaceExactly(
  service,
  `const { saveSharedStoreAccount } = require('./shared-account-service-v549') /* shared-account-contact-v549 */`,
  `const { saveSharedStoreAccount } = require('./shared-account-service-v552') /* ${marker} */`,
  'shared account service version',
)
service += `\n/* ${marker} */\n`

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-Detail-Navigation', 'v551') /* style-detail-navigation-v551 */`
server = replaceExactly(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shared-Account-Identity', 'v552') /* ${marker} */`,
  'readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(servicePath, service)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
