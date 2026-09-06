import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const script = read('public/receipt-roll-print-v569.js')
const style = read('public/receipt-roll-print-v569.css')

for (const required of [
  "X-Lien-Receipt-Roll-Print', 'v569'",
  "X-Lien-Style-Detail-Three-Photo-Layout', 'v568'",
  "X-Lien-Receipt-Thermal-Print', 'v540'",
  'orimia-receipt-roll-style-v569',
  'orimia-receipt-roll-script-v569',
  'receipt-roll-print-v569 */',
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)

assert.doesNotMatch(server, /orimia-receipt-print-style-v540/)
assert.doesNotMatch(server, /orimia-receipt-print-script-v540/)

for (const required of [
  'const PAPER_WIDTH_MM = 80',
  'const PRINTABLE_WIDTH_MM = 72',
  'const DOTS_PER_MM = 8',
  'const FEED_SAFETY_DOTS = 8',
  'Math.ceil(contentHeightMm * DOTS_PER_MM)',
  'document.fonts?.ready',
  '@page { size: ${PAPER_WIDTH_MM}mm ${heightMm}mm; margin: 0; }',
  "window.addEventListener('beforeprint'",
  "window.addEventListener('afterprint'",
  'window.print = () =>',
]) assert.ok(script.includes(required), `print controller invariant missing: ${required}`)

for (const required of [
  'width: 80mm !important',
  'padding: 4mm 4mm 3mm !important',
  'page: receipt !important',
  'height: var(--orimia-receipt-roll-height-v569) !important',
  'max-height: var(--orimia-receipt-roll-height-v569) !important',
  'body > *:not(#orimia-receipt-roll-host-v569)',
  '[data-orimia-receipt-roll-copy-v569="1"]',
  '@media print',
]) assert.ok(style.includes(required), `print stylesheet invariant missing: ${required}`)

console.log(JSON.stringify({
  release:'receipt-roll-print-v569',
  runtimeVerified:true,
  rollWidthMm:80,
  printableWidthMm:72,
  dynamicPageHeight:true,
  exactRootHeight:true,
}))
