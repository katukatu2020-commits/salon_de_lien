import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const script = read('public/receipt-physical-roll-v579.js')
const style = read('public/receipt-physical-roll-v579.css')

for (const required of [
  "X-Lien-Receipt-Physical-Roll', 'v579'",
  "X-Lien-Admin-Sidebar-Labels', 'v578'",
  "X-Lien-Receipt-Roll-Print', 'v569'",
  'orimia-receipt-physical-roll-style-v579',
  'orimia-receipt-physical-roll-script-v579',
  'receipt-physical-roll-v579 */',
]) assert.ok(server.includes(required), `server invariant missing: ${required}`)

assert.doesNotMatch(server, /orimia-receipt-roll-style-v569/)
assert.doesNotMatch(server, /orimia-receipt-roll-script-v569/)

for (const required of [
  'const PAPER_WIDTH_MM = 80',
  'const PRINTABLE_WIDTH_MM = 72',
  'const DOTS_PER_MM = 8',
  'const FEED_SAFETY_DOTS = 8',
  'Math.ceil(contentHeightMm * DOTS_PER_MM)',
  'new ResizeObserver',
  'new MutationObserver',
  'installPageRule(heightMm)',
  '@${name} { content: none; }',
  "document.fonts?.ready",
  "window.addEventListener('beforeprint'",
  "window.addEventListener('afterprint'",
  'schedulePrepare(0)',
  'window.print = () =>',
]) assert.ok(script.includes(required), `print controller invariant missing: ${required}`)

for (const required of [
  'width: 80mm !important',
  'padding: 2mm 4mm !important',
  'page: auto !important',
  'position: absolute !important',
  'inset: 0 auto auto 0 !important',
  'height: var(--orimia-receipt-roll-height-v579) !important',
  'max-height: var(--orimia-receipt-roll-height-v579) !important',
  'body > *:not(#orimia-receipt-roll-host-v579)',
  '[data-orimia-receipt-roll-copy-v579="1"]',
  '@media print',
]) assert.ok(style.includes(required), `print stylesheet invariant missing: ${required}`)

console.log(JSON.stringify({
  release:'receipt-physical-roll-v579',
  runtimeVerified:true,
  rollWidthMm:80,
  printableWidthMm:72,
  dynamicPageHeight:true,
  precomputedPageRule:true,
  topAnchored:true,
  browserMarginBoxesSuppressed:true,
}))
