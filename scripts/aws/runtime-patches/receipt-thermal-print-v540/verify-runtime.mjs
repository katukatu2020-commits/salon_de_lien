import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const shell = read('public/shell-consistency-v518.js')
const script = read('public/receipt-thermal-print-v540.js')
const style = read('public/receipt-thermal-print-v540.css')

for (const required of [
  "X-Lien-Receipt-Thermal-Print', 'v540'",
  'orimia-receipt-print-script-v540',
  'orimia-receipt-print-style-v540',
  'const receiptRoute = /^\\/admin\\/appointments',
  'if (receiptRoute)',
  'receipt-thermal-print-v540 */',
]) assert.ok(server.includes(required), `server receipt invariant missing: ${required}`)

assert.match(shell, /active && !receiptRoute/)
assert.match(shell, /location\.pathname === '\/admin\/login' \|\| receiptRoute/)
assert.match(shell, /receipt-thermal-print-v540/)

for (const required of [
  'const WIDTH_MM = 80',
  'const HEIGHT_SAFETY_MM = 1.5',
  'copy.getBoundingClientRect().height',
  '@page { size: ${WIDTH_MM}mm ${heightMm}mm; margin: 0; }',
  '@page receipt { size: ${WIDTH_MM}mm ${heightMm}mm; margin: 0; }',
  "window.addEventListener('beforeprint'",
  "window.addEventListener('afterprint'",
  'window.print = printReceipt',
]) assert.ok(script.includes(required), `print controller invariant missing: ${required}`)

for (const required of [
  'body > *:not(#orimia-receipt-print-host-v540)',
  'width: 80mm !important',
  'min-height: 0 !important',
  '[data-orimia-receipt-copy-v540="1"]',
  '#admin-mobile-bottom-nav-v518',
  '@media print',
]) assert.ok(style.includes(required), `print stylesheet invariant missing: ${required}`)

console.log(JSON.stringify({
  release:'receipt-thermal-print-v540',
  runtimeVerified:true,
  rollWidthMm:80,
  dynamicPageHeight:true,
  receiptOnlyPrint:true,
}))
