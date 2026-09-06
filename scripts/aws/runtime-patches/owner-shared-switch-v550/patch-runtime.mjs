import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const marker = 'owner-shared-switch-v550'

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(marker)) throw new Error(`${marker}: patch already applied`)

fs.copyFileSync(path.join(patchRoot, 'owner-shared-switch-v550.js'), path.join(root, 'owner-shared-switch-v550.js'))
fs.copyFileSync(path.join(patchRoot, 'owner-shared-switch-client-v550.js'), path.join(root, 'public', 'owner-shared-switch-v550.js'))
fs.copyFileSync(path.join(patchRoot, 'owner-shared-switch-v550.css'), path.join(root, 'public', 'owner-shared-switch-v550.css'))

const salesImport = `const { createSalesLedgerAccountsService } = require('./sales-ledger-accounts-v318') /* sales-ledger-accounts-v318 */`
server = replaceExactly(
  server,
  salesImport,
  `${salesImport}\nconst { createOwnerSharedSwitchService } = require('./owner-shared-switch-v550') /* ${marker} */`,
  'owner shared switch import',
)

const salesService = `const salesLedgerAccounts = createSalesLedgerAccountsService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* sales-ledger-accounts-v318-service */`
server = replaceExactly(
  server,
  salesService,
  `${salesService}\nconst ownerSharedSwitch = createOwnerSharedSwitchService({\n  prisma,\n  crypto,\n  staffSession: req => chatSession(req, 'staff'),\n}) /* ${marker}-service */`,
  'owner shared switch service',
)

const customerReturn = `  if (!customerRoute) return output`
server = replaceExactly(
  server,
  customerReturn,
  `  if (adminRoute && !output.includes('${marker}')) {\n    output = output.replace('<head>', '<head>' + "<link id=\\"owner-shared-switch-style-v550\\" rel=\\"stylesheet\\" href=\\"/owner-shared-switch-v550.css?v=550-release1\\"><script id=\\"owner-shared-switch-script-v550\\" src=\\"/owner-shared-switch-v550.js?v=550-release1\\" defer></script>")\n  } /* ${marker}-assets */\n${customerReturn}`,
  'owner shared switch asset injection',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shared-Account-Contact', 'v549') /* shared-account-contact-v549 */`
server = replaceExactly(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Owner-Shared-Switch', 'v550') /* ${marker} */`,
  'owner shared switch readiness marker',
)

const salesRoute = `      if (await salesLedgerAccounts.handle(req, res, url)) return /* sales-ledger-accounts-v318-route */`
server = replaceExactly(
  server,
  salesRoute,
  `      if (await ownerSharedSwitch.handle(req, res, url)) return /* ${marker}-route */\n${salesRoute}`,
  'owner shared switch route',
)

server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
