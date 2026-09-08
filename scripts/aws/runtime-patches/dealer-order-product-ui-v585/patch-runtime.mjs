import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'dealer-order-product-ui-v585'
const serverPath = path.join(root, 'server.js')
const servicePath = path.join(root, 'wholesale-ordering-v543.js')
const inventoryClientPath = path.join(root, 'public', 'inventory-orders-common-layout-v572.js')

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${marker}: ${label} expected one match, found ${count}`)
  return source.replace(before, after)
}

let server = fs.readFileSync(serverPath, 'utf8')
if (server.includes(`X-Lien-Dealer-Order-Product-Ui', 'v585'`) || server.includes(`/* ${marker} */`)) {
  throw new Error(`${marker}: server patch already applied`)
}
server = replaceOnce(
  server,
  '/wholesale-ordering-v543.css?v=584-company-billing1',
  '/wholesale-ordering-v543.css?v=585-product-ui1',
  'admin stylesheet cache key',
)
const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Company-Billing', 'v584') /* dealer-company-billing-v584 */`
server = replaceOnce(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Order-Product-Ui', 'v585') /* ${marker} */`,
  'readiness header',
)
server += `\n/* ${marker} */\n`

let service = fs.readFileSync(servicePath, 'utf8')
if (service.includes(`/* ${marker} */`)) throw new Error(`${marker}: wholesale service patch already applied`)
service = replaceOnce(
  service,
  '/wholesale-ordering-v543.css?v=584-company-billing1',
  '/wholesale-ordering-v543.css?v=585-product-ui1',
  'dealer stylesheet cache key',
)
service = replaceOnce(
  service,
  '/wholesale-ordering-client-v543.js?v=584-company-billing1',
  '/wholesale-ordering-client-v543.js?v=585-product-ui1',
  'dealer client cache key',
)
service += `\n/* ${marker} */\n`

let inventoryClient = fs.readFileSync(inventoryClientPath, 'utf8')
if (inventoryClient.includes(`/* ${marker} */`)) throw new Error(`${marker}: inventory client patch already applied`)
inventoryClient = replaceOnce(
  inventoryClient,
  '/wholesale-ordering-client-v543.js?v=584-company-billing1',
  '/wholesale-ordering-client-v543.js?v=585-product-ui1',
  'salon client cache key',
)
inventoryClient += `\n/* ${marker} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(servicePath, service)
fs.writeFileSync(inventoryClientPath, inventoryClient)

console.log(JSON.stringify({ release:marker, readiness:true, cacheKeys:true }))
