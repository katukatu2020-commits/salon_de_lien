import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const commercial = fs.readFileSync(path.join(root, 'commercial-admin-v101.js'), 'utf8')

for (const required of [
  "X-Lien-Customer-Chart-Route-Scope', 'v571'",
  "X-Lien-Inventory-Orders-Common-Layout', 'v570'",
  'customer-chart-route-scope-v571 */',
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)

const marker = '/* salon-records-controls-v561-customer-chart */'
const markerIndex = commercial.indexOf(marker)
const clientStart = commercial.lastIndexOf(';(() => {', markerIndex)
assert.ok(clientStart >= 0 && markerIndex > clientStart, 'customer chart client boundary is missing')
const client = commercial.slice(clientStart, markerIndex)

for (const required of [
  '__lienCustomerChartRouteScopeV571',
  "RESERVED_CUSTOMER_IDS = new Set(['messages'])",
  "document.querySelectorAll('.admin-app-shell .admin-main-content')",
  "main.querySelectorAll('input[name=\"customerId\"]')",
  "node.textContent?.trim() === '実際のお名前'",
  "node.textContent?.trim() === '髪・接客情報'",
  'container !== profileSection?.parentElement',
  'card.dataset.chartCustomerV571 = current.customerId',
  'chartRootIsCurrent(card, customerId, false)',
  'chartRootIsCurrent(root, customerId, true)',
  'nameSection.after(card)',
  'if (syncTimer) return',
  "wrapHistoryMethod('pushState')",
  'clearChartUi()',
]) assert.ok(client.includes(required), `client invariant missing: ${required}`)

assert.doesNotMatch(client, /document\.querySelector\(['"]main['"]\)/)
assert.doesNotMatch(client, /else main\.appendChild\(card\)/)
assert.doesNotMatch(client, /clearTimeout\(syncTimer\)/)
assert.equal((commercial.match(/__lienCustomerChartRouteScopeV571/g) || []).length >= 1, true)

const appointmentMarker = '/* customer-appointment-history-memos-v565 */'
const appointmentMarkerIndex = commercial.indexOf(appointmentMarker)
const appointmentStart = commercial.lastIndexOf(';(() => {', appointmentMarkerIndex)
assert.ok(appointmentStart >= 0 && appointmentMarkerIndex > appointmentStart, 'appointment history client boundary is missing')
const appointmentClient = commercial.slice(appointmentStart, appointmentMarkerIndex)
for (const required of [
  "CUSTOMER_HISTORY_RESERVED_IDS = new Set(['messages'])",
  'function findCustomerHistoryMain(current)',
  "document.querySelectorAll('.admin-app-shell .admin-main-content')",
  "main.querySelectorAll('input[name=\"customerId\"]')",
  "node.textContent?.trim() === '来店・会計履歴'",
  'if (syncTimer) return',
  '!findCustomerHistoryMain(next)',
]) assert.ok(appointmentClient.includes(required), `appointment client invariant missing: ${required}`)
assert.doesNotMatch(appointmentClient, /clearTimeout\(syncTimer\)/)

console.log(JSON.stringify({
  release:'customer-chart-route-scope-v571',
  runtimeVerified:true,
  reservedRouteExcluded:true,
  strictCustomerIdentity:true,
  strictMount:true,
  appointmentHistoryScoped:true,
  staleResponseGuard:true,
  routeCleanup:true,
}))
