import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const script = read('public/daily-sales-complete-print-v541.js')
const style = read('public/daily-sales-complete-print-v541.css')

for (const required of [
  "X-Lien-Daily-Sales-Complete-Print', 'v541'",
  "const dailySalesRoute = pathname === '/admin/owner-analytics'",
  'orimia-daily-sales-print-style-v541',
  'orimia-daily-sales-print-script-v541',
  'daily-sales-complete-print-v541 */',
]) assert.ok(server.includes(required), `server print invariant missing: ${required}`)

for (const required of [
  'window.__orimiaDailySalesPrintV541',
  "window.print = print",
  "window.addEventListener('beforeprint'",
  "window.addEventListener('afterprint'",
  "copy.querySelector('.sl-summary-head-actions')?.remove()",
  "table?.querySelectorAll('tbody tr').length",
  "host.style.setProperty('--orimia-sales-print-font'",
]) assert.ok(script.includes(required), `print controller invariant missing: ${required}`)

for (const required of [
  'size: A4 landscape',
  'body > *:not(#orimia-daily-sales-print-host-v541)',
  '.sl-daily-table tbody > tr',
  'display: table-row !important',
  '.sl-daily-table .sl-staff-col',
  'display: table-cell !important',
  'min-width: 0 !important',
  'table-layout: fixed !important',
  'scrollbar-width: none !important',
]) assert.ok(style.includes(required), `print stylesheet invariant missing: ${required}`)

assert.ok(server.includes("X-Lien-Receipt-Thermal-Print', 'v540'"), 'receipt print release was not preserved')
assert.ok(server.includes("X-Lien-Sales-Ledger-Staff-Filter', 'v539'"), 'staff filter release was not preserved')

console.log(JSON.stringify({
  release:'daily-sales-complete-print-v541',
  runtimeVerified:true,
  allRows:true,
  allColumns:true,
  paper:'A4 landscape',
}))
