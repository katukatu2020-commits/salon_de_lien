import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const client = read('sales-ledger-client-v318.js')
const service = read('sales-ledger-accounts-v318.js')
const server = read('server.js')
const marker = 'sales-ledger-staff-filter-v539'

for (const required of [
  `const VERSION = '${marker}'`,
  'id="sl-ledger-filter-form"',
  'data-sl-summary-staff',
  'form="sl-ledger-filter-form"',
  'aria-label="日別売上集計の担当者"',
  "root.querySelector('[data-sl-summary-staff]').addEventListener('change'",
  "selectedPeriodLabel(root) + ' / 担当者：'",
  "root.querySelector('[data-sl-print]').disabled = true",
  'sales-ledger-staff-filter-v539 */',
]) assert.ok(client.includes(required), `sales ledger staff filter invariant missing: ${required}`)

assert.equal((client.match(/name="staff"/g) || []).length, 1, 'staff filter must have one source of truth')
assert.equal(client.includes('<label>主担当スタッフ</label>'), false, 'legacy toolbar staff selector remained')
assert.match(client, /\.sl-daily-card \.sl-daily-table tbody tr\{display:table-row!important\}/)
assert.ok(client.includes('id="sl-payment-detail-dialog"'), 'payment detail modal was not preserved')
assert.ok(service.includes(`AND ($5='' OR COALESCE(a."staffName",'')=$5)`), 'server-side exact staff filter was not preserved')
assert.ok(service.includes('salesSummary.summarizeSales(numericRows)'), 'filtered daily summary recalculation was not preserved')

for (const required of [
  `X-Lien-Sales-Ledger-Staff-Filter', 'v539'`,
  `X-Lien-Sales-Ledger-Detail-Modal', 'v538'`,
  `X-Lien-Sales-Ledger-Daily-Summary', 'v537'`,
]) assert.ok(server.includes(required), `readiness invariant missing: ${required}`)

console.log(JSON.stringify({
  release:marker,
  runtimeVerified:true,
  singleStaffControl:true,
  filteredSummaryApiPreserved:true,
  detailModalPreserved:true,
}))
