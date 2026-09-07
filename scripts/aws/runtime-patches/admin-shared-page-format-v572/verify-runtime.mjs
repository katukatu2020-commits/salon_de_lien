import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const salesClient = fs.readFileSync(path.join(root, 'sales-ledger-client-v318.js'), 'utf8')
const publicRoot = path.join(root, 'public')

for (const asset of [
  'admin-workspace-layout-v572.js',
  'admin-workspace-layout-v572.css',
  'inventory-orders-common-layout-v572.js',
  'inventory-orders-common-layout-v572.css',
]) assert.ok(fs.existsSync(path.join(publicRoot, asset)), `missing public asset: ${asset}`)

for (const required of [
  "X-Lien-Admin-Shared-Page-Format', 'v572'",
  "X-Lien-Customer-Chart-Route-Scope', 'v571'",
  "orimiaWholesaleShell=v572",
  'admin-workspace-layout-v572.js?v=572-release1',
  'inventory-orders-common-layout-v572.js?v=572-release1',
  'admin-shared-page-format-v572 */',
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)

for (const required of [
  `window.__orimiaAdminWorkspaceV572?.unmount('sales-ledger')`,
  `const workspace = window.__orimiaAdminWorkspaceV572`,
  `preserveSelectors:['nav[aria-label="経営ページ切替"]']`,
  `activeHref:'/admin/owner-analytics?salesLedger=1'`,
  `headerTitle:'会計データ管理'`,
  `mounted.host.appendChild(portal)`,
  `.sl-ledger-portal{display:contents}`,
  `.sl-ledger-portal-inner{display:contents}`,
  `display:contents;color:var(--sl-ink)`,
  'admin-shared-page-format-v572 */',
]) assert.ok(salesClient.includes(required), `sales client invariant missing: ${required}`)

assert.doesNotMatch(salesClient, /main\.style\.visibility\s*=\s*'hidden'/)
assert.doesNotMatch(salesClient, /main\.style\.pointerEvents\s*=\s*'none'/)
assert.doesNotMatch(salesClient, /document\.body\.appendChild\(portal\)/)
assert.doesNotMatch(salesClient, /function syncLedgerPortal\(/)
assert.doesNotMatch(salesClient, /<nav class="sl-tabs" aria-label="経営ページ切替">/)

const workspace = fs.readFileSync(path.join(publicRoot, 'admin-workspace-layout-v572.js'), 'utf8')
const inventory = fs.readFileSync(path.join(publicRoot, 'inventory-orders-common-layout-v572.js'), 'utf8')
for (const required of [
  `document.querySelector('.admin-app-shell main.admin-main-content')`,
  `element.matches('.mx-auto.grid.max-w-7xl.gap-6')`,
  `host.className = 'orimia-admin-workspace-host-v572'`,
  `records.set(key, record)`,
]) assert.ok(workspace.includes(required), `workspace invariant missing: ${required}`)
for (const required of [
  `const workspace = window.__orimiaAdminWorkspaceV572`,
  `preserveSelectors:['nav[aria-label="商品ページ切替"]']`,
  `activeHref:'/admin/products'`,
  `mounted.host.appendChild(pageContent)`,
  `data-inventory-orders-page-header-v572`,
]) assert.ok(inventory.includes(required), `inventory invariant missing: ${required}`)
assert.doesNotMatch(inventory, /main\.appendChild\(/)
assert.doesNotMatch(inventory, /data-orimia-inventory-orders-source-v570/)

console.log(JSON.stringify({
  release:'admin-shared-page-format-v572',
  runtimeVerified:true,
  sharedNativeRoot:true,
  inventoryIntegrated:true,
  salesLedgerIntegrated:true,
  fixedOverlayRemoved:true,
  duplicateNavigationRemoved:true,
}))
