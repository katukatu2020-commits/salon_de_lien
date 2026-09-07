import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const inventoryClientPath = path.join(root, 'public', 'inventory-orders-common-layout-v572.js')
const marker = 'dealer-operations-v576'

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(before, after)
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`/* ${marker} */`)) throw new Error(`${marker}: server patch already applied`)

server = replaceOnce(
  server,
  '/wholesale-ordering-v543.css?v=570-common-layout1',
  '/wholesale-ordering-v543.css?v=576-dealer-operations1',
  'inventory ordering stylesheet cache key',
)

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Chart-Header-Actions', 'v575') /* customer-chart-header-actions-v575 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Operations', 'v576') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let inventoryClient = fs.readFileSync(inventoryClientPath, 'utf8')
if (inventoryClient.includes(`/* ${marker} */`)) throw new Error(`${marker}: inventory client patch already applied`)
inventoryClient = replaceOnce(
  inventoryClient,
  '/wholesale-ordering-client-v543.js?v=572-shared-page-format1',
  '/wholesale-ordering-client-v543.js?v=576-dealer-operations1',
  'inventory ordering client cache key',
)
inventoryClient += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(inventoryClientPath, inventoryClient)

console.log(JSON.stringify({
  release:marker,
  readiness:true,
  salonAssetCacheKeys:true,
}))
