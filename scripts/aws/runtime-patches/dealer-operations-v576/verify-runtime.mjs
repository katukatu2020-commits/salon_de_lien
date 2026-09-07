import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const inventoryClient = fs.readFileSync(path.join(root, 'public', 'inventory-orders-common-layout-v572.js'), 'utf8')
const service = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.css'), 'utf8')

assert.match(server, /X-Lien-Dealer-Operations', 'v576'/)
assert.match(server, /X-Lien-Customer-Chart-Header-Actions', 'v575'/)
assert.match(server, /wholesale-ordering-v543\.css\?v=576-dealer-operations1/)
assert.match(inventoryClient, /wholesale-ordering-client-v543\.js\?v=576-dealer-operations1/)
assert.match(service, /DEALER_OPERATIONS_RELEASE = 'dealer-operations-v576'/)
assert.match(service, /CREATE TABLE IF NOT EXISTS "WholesaleDealerProduct"/)
assert.match(service, /\/api\/admin\/wholesale\/contracts\/code/)
assert.match(service, /\/api\/dealer\/contracts/)
assert.match(service, /\/api\/dealer\/products/)
assert.match(service, /"dealerProductId"/)
assert.match(client, /美容室との連携に使う固有コード/)
assert.match(client, /契約美容室を管理/)
assert.match(client, /商品を登録/)
assert.match(client, /wo-order-note-link/)
assert.match(css, /\/\* dealer-operations-v576 \*\//)
assert.match(css, /\.wo-dealer-mobile-nav/)
assert.match(css, /\.wo-delete-check/)
assert.equal(server.split('X-Lien-Dealer-Operations').length - 1, 1)
assert.equal(inventoryClient.split('dealer-operations-v576').length - 1, 1)

console.log(JSON.stringify({
  release:'dealer-operations-v576',
  verified:true,
  dealerCode:true,
  salonContracts:true,
  dealerCatalog:true,
  deliveryNoteAction:true,
}))
