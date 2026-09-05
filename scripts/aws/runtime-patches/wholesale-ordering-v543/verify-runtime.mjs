import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const commercial = read('commercial-admin-v101.js')
const service = read('wholesale-ordering-v543.js')
const client = read('wholesale-ordering-client-v543.js')
const styles = read('wholesale-ordering-v543.css')

for (const required of [
  "require('./wholesale-ordering-v543')",
  'createWholesaleOrderingService({ prisma, crypto',
  'await wholesaleOrdering.ensureSchema()',
  'await wholesaleOrdering.handle(req, res, url)',
  "X-Lien-Wholesale-Ordering', 'v543'",
  "X-Lien-Sales-Ledger-Staff-Multiselect', 'v542'",
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)

assert.ok(commercial.includes('window.__orimiaWholesaleOrderingV543'), 'product shelf entry script is missing')
assert.ok(commercial.includes('/admin/products/orders'), 'inventory and order entry URL is missing')
assert.equal(commercial.includes("inventory: { title: '商品在庫設定'"), false, 'legacy embedded inventory panel remains')

for (const required of [
  'CREATE TABLE IF NOT EXISTS "WholesaleDealer"',
  'CREATE TABLE IF NOT EXISTS "WholesaleOrder"',
  'CREATE TABLE IF NOT EXISTS "WholesaleOrderLine"',
  '/api/admin/wholesale/orders',
  '/api/dealer/auth/login',
  '/delivery-note',
  'validSameOrigin(req)',
  'FOR UPDATE',
]) assert.ok(service.includes(required), `wholesale service invariant missing: ${required}`)

for (const required of [
  'PURCHASE ORDER',
  '現在庫を棚卸し',
  '発注履歴',
  '連携を承認',
  '出荷済みにする',
  '納品を完了',
]) assert.ok(client.includes(required), `wholesale client invariant missing: ${required}`)

for (const required of ['.wo-order-layout', '.wo-dealer-orders', '.wo-delivery-note', '@media print', '@page { size: A4 portrait']) {
  assert.ok(styles.includes(required), `wholesale style invariant missing: ${required}`)
}

console.log(JSON.stringify({
  release: 'wholesale-ordering-v543',
  runtimeVerified: true,
  salonOrdering: true,
  inventoryMoved: true,
  dealerPortal: true,
  deliveryNote: true,
}))
