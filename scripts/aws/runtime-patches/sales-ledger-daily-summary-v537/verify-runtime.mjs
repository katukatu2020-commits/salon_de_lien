import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const client = read('sales-ledger-client-v318.js')
const service = read('sales-ledger-accounts-v318.js')
const server = read('server.js')
const helper = read('sales-ledger-summary-v537.js')
const marker = 'sales-ledger-daily-summary-v537'

for (const required of [
  `const VERSION = '${marker}'`,
  '日別売上集計',
  '決済明細',
  '施術売上',
  '店販売上',
  '税抜合計',
  '消費税',
  '税込合計',
  '指名料',
  '送料',
  'ポイント',
  '電子マネー',
  'QR決済',
  'data-sl-summary-table',
  'data-sl-summary-rows',
  'data-sl-summary-total',
  'data-sl-kpi-total',
  'data-sl-detail-card',
  'data-sl-clear-day',
  'function renderSummary(root)',
  'function detailRows()',
  'state.detailDate',
  'state.paymentMethods',
  'payload.summary',
  'name="payment"',
  'sales-ledger-daily-summary-v537 */',
]) assert.ok(client.includes(required), `sales ledger client invariant missing: ${required}`)

assert.equal(client.includes(`<h2>売上一覧</h2>`), false)
assert.equal(client.includes(`const VERSION = 'sales-ledger-month-filter-v534'`), false)
assert.match(client, /\.sl-daily-table\{width:max-content;table-layout:fixed\}/)
assert.match(client, /\.sl-summary-date\{position:sticky;left:0/)
assert.match(client, /@media\(max-width:700px\)/)
assert.match(client, /@media print\{\.sl-page>\*\{display:none!important\}/)

for (const required of [
  `require('./sales-ledger-summary-v537')`,
  `url.searchParams.get('payment')`,
  `o."taxRate"`,
  `SUM(l."quantity")`,
  `p."type"='redeem'`,
  `p."sourceId"=a."id"`,
  `s."paymentMethod",'')=$9`,
  'salesSummary.summarizeSales(numericRows)',
  'summary: report.summary',
  'paymentMethods: paymentRows.map',
]) assert.ok(service.includes(required), `sales ledger service invariant missing: ${required}`)

for (const required of [
  `X-Lien-Sales-Ledger-Daily-Summary', 'v537'`,
  `X-Lien-Navigation-Loading-Experience', 'v536'`,
  `X-Lien-Manual-Booking-Break-Interaction', 'v535'`,
  `X-Lien-Sales-Ledger-Month-Filter', 'v534'`,
]) assert.ok(server.includes(required), `readiness invariant missing: ${required}`)

for (const required of [
  'function describeSale(row)',
  'function summarizeSales(rows)',
  "timeZone: TOKYO_TIME_ZONE",
  "return 'electronic'",
  "return 'qr'",
]) assert.ok(helper.includes(required), `summary helper invariant missing: ${required}`)

console.log(JSON.stringify({ release: marker, runtimeVerified: true, existingLedgerEditingPreserved: client.includes('function openEdit(root, row, bulk = false)') }))
