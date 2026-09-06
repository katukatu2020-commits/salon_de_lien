import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const commercial = read('commercial-admin-v101.js')
const wholesaleModule = read('wholesale-ordering-v543.js')
const wholesaleStyle = read('wholesale-ordering-v543.css')
const script = read('public/inventory-orders-common-layout-v570.js')
const style = read('public/inventory-orders-common-layout-v570.css')

for (const required of [
  "X-Lien-Inventory-Orders-Common-Layout', 'v570'",
  "X-Lien-Receipt-Roll-Print', 'v569'",
  "url.pathname === '/admin/products/orders'",
  "req.url = '/admin/products?' + shellSearch.toString()",
  "url.pathname = '/admin/products'",
  'orimiaWholesaleShell=v570',
  'orimia-inventory-orders-common-script-v570',
  'inventory-orders-common-layout-v570 */',
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)

assert.match(commercial, /inventory-orders-common-layout-v570-hard-navigation/)
assert.match(commercial, /location\.assign\(link\.href\)/)
assert.match(wholesaleModule, /inventory-orders-common-layout-v570-authenticated-shared-shell/)
assert.match(wholesaleModule, /admin\/login\?next=.*admin\/products\/orders/)

assert.doesNotMatch(wholesaleStyle, /^body \{/m)
assert.doesNotMatch(wholesaleStyle, /^svg \{/m)
assert.doesNotMatch(wholesaleStyle, /^a \{/m)
assert.match(wholesaleStyle, /\.wo-app-root :where\(svg\)/)
assert.match(wholesaleStyle, /body\.wo-auth-body/)

for (const required of [
  '__orimiaInventoryOrdersCommonLayoutV570',
  "const ROUTE = '/admin/products/orders'",
  "document.querySelector('.admin-app-shell .admin-main-content')",
  "document.body.dataset.wholesalePage = 'salon'",
  'data-orimia-inventory-orders-source-v570',
  '/wholesale-ordering-client-v543.js?v=570-common-layout1',
]) assert.ok(script.includes(required), `layout script invariant missing: ${required}`)

for (const required of [
  '#orimia-inventory-orders-host-v570',
  '[data-orimia-inventory-orders-source-v570]',
  'max-width: 80rem',
  'visibility: visible !important',
]) assert.ok(style.includes(required), `layout style invariant missing: ${required}`)

console.log(JSON.stringify({
  release: 'inventory-orders-common-layout-v570',
  runtimeVerified: true,
  sharedNextShell: true,
  canonicalLoginReturn: true,
  wholesaleStylesScoped: true,
}))
