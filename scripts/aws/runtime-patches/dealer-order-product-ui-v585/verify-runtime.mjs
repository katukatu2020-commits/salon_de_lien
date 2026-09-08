import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const service = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.js'), 'utf8')
const inventoryClient = fs.readFileSync(path.join(root, 'public', 'inventory-orders-common-layout-v572.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.css'), 'utf8')

for (const invariant of [
  "X-Lien-Dealer-Order-Product-Ui', 'v585'",
  "X-Lien-Dealer-Company-Billing', 'v584'",
  '/wholesale-ordering-v543.css?v=585-product-ui1',
]) assert.ok(server.includes(invariant), `server invariant missing: ${invariant}`)

assert.match(service, /wholesale-ordering-v543\.css\?v=585-product-ui1/)
assert.match(service, /wholesale-ordering-client-v543\.js\?v=585-product-ui1/)
assert.match(inventoryClient, /wholesale-ordering-client-v543\.js\?v=585-product-ui1/)
assert.match(client, /dealer-order-product-ui-v585/)
assert.match(client, /wo-contract-price/)
assert.match(client, /wo-line-subtotal/)
assert.match(css, /dealer-order-product-ui-v585/)
assert.match(css, /\.wo-contract-product-row\.is-selected/)
assert.equal((server.match(/X-Lien-Dealer-Order-Product-Ui/g) || []).length, 1)
assert.equal((service.match(/dealer-order-product-ui-v585/g) || []).length, 1)
assert.equal((inventoryClient.match(/dealer-order-product-ui-v585/g) || []).length, 1)

console.log(JSON.stringify({ release:'dealer-order-product-ui-v585', runtimeVerified:true, cacheKeys:true }))
