import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const publicRoot = path.join(root, 'public')
const serverPath = path.join(root, 'server.js')
const marker = 'receipt-physical-roll-v579'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

for (const asset of ['receipt-physical-roll-v579.css', 'receipt-physical-roll-v579.js']) {
  fs.copyFileSync(path.join(patchRoot, asset), path.join(publicRoot, asset))
}

const previousHead = '<link id="orimia-receipt-roll-style-v569" rel="stylesheet" href="/receipt-roll-print-v569.css?v=569-release1"><script id="orimia-receipt-roll-script-v569" src="/receipt-roll-print-v569.js?v=569-release1" defer></script>'
const receiptHead = '<link id="orimia-receipt-physical-roll-style-v579" rel="stylesheet" href="/receipt-physical-roll-v579.css?v=579-release1"><script id="orimia-receipt-physical-roll-script-v579" src="/receipt-physical-roll-v579.js?v=579-release1" defer></script>'

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: patch already applied`)
server = replaceOnce(
  server,
  "'orimia-receipt-roll-script-v569'",
  "'orimia-receipt-physical-roll-script-v579'",
  'receipt asset guard',
)
server = replaceOnce(
  server,
  JSON.stringify(previousHead),
  JSON.stringify(receiptHead),
  'receipt route assets',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Sidebar-Labels', 'v578') /* admin-sidebar-labels-v578 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Physical-Roll', 'v579') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release:marker, assets:true, server:true }))
