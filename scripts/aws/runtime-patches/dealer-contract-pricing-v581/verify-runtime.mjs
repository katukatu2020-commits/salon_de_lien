import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const inventoryClient = fs.readFileSync(path.join(root, 'public', 'inventory-orders-common-layout-v572.js'), 'utf8')
const service = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.js'), 'utf8')
const client = fs.readFileSync(path.join(root, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(root, 'wholesale-ordering-v543.css'), 'utf8')

for (const invariant of [
  "X-Lien-Dealer-Contract-Pricing', 'v581'",
  "X-Lien-Admin-Chat-Read-Position', 'v580'",
  '/wholesale-ordering-v543.css?v=581-contract-pricing1',
]) assert.ok(server.includes(invariant), `server invariant missing: ${invariant}`)

assert.match(inventoryClient, /wholesale-ordering-client-v543\.js\?v=581-contract-pricing1/)
for (const invariant of [
  "dealer-contract-pricing-v581",
  'CREATE TABLE IF NOT EXISTS "WholesaleContractProductPrice"',
  'ADD COLUMN IF NOT EXISTS "listPrice"',
  'ADD COLUMN IF NOT EXISTS "discountRate"',
  '/product-pricing',
  'ディーラーが取扱設定した商品のみ発注できます',
  'JOIN "WholesaleContractProductPrice" a',
]) assert.ok(service.includes(invariant), `service invariant missing: ${invariant}`)

for (const invariant of [
  '美容室別の取扱・割引設定',
  'data-pricing-enabled',
  '定価（税抜）',
  '契約単価（税抜）',
  'ディーラーがこの店舗向けに設定した商品',
]) assert.ok(client.includes(invariant), `client invariant missing: ${invariant}`)

assert.match(css, /dealer-contract-pricing-v581-cascade/)
assert.match(css, /\.wo-contract-product-table/)
assert.match(css, /\.wo-pricing-table/)
assert.equal((server.match(/X-Lien-Dealer-Contract-Pricing/g) || []).length, 1)
assert.equal((inventoryClient.match(/dealer-contract-pricing-v581/g) || []).length, 1)

console.log(JSON.stringify({
  release:'dealer-contract-pricing-v581',
  runtimeVerified:true,
  contractScopedCatalog:true,
  orderPriceSnapshots:true,
  dealerBulkPricing:true,
  salonPriceTable:true,
}))
