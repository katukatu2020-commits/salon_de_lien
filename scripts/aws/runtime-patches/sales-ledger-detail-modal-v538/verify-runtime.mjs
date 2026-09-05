import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const client = read('sales-ledger-client-v318.js')
const service = read('sales-ledger-accounts-v318.js')
const server = read('server.js')
const marker = 'sales-ledger-detail-modal-v538'

for (const required of [
  `const VERSION = '${marker}'`,
  'id="sl-payment-detail-dialog"',
  'data-sl-detail-dialog',
  'data-sl-detail-close',
  'aria-haspopup="dialog"',
  'function openDetailDialog(root, saleDate)',
  'function openDetailEdit(root, row, bulk = false)',
  'state.reopenDetailAfterEdit',
  'detailDialog.showModal()',
  'detailDialog.addEventListener(\'close\'',
  'queueMicrotask(() =>',
  'sales-ledger-detail-modal-v538 */',
]) assert.ok(client.includes(required), `sales ledger detail modal invariant missing: ${required}`)

for (const removed of [
  'data-sl-detail-card',
  'data-sl-clear-day',
  'scrollIntoView({ behavior:\'smooth\'',
  '表示期間内の全決済',
]) assert.equal(client.includes(removed), false, `permanent sales detail invariant remained: ${removed}`)

assert.match(client, /\.sl-detail-dialog\{width:min\(1380px/)
assert.match(client, /\.sl-detail-dialog-body\{min-width:0;min-height:0;max-height:min\(580px,calc\(100dvh - 150px\)\);overflow:hidden\}/)
assert.match(client, /@media\(max-width:700px\)\{\.sl-detail-dialog/)
assert.ok(service.includes(`salesSummary.summarizeSales(numericRows)`), 'daily summary API was not preserved')

for (const required of [
  `X-Lien-Sales-Ledger-Detail-Modal', 'v538'`,
  `X-Lien-Sales-Ledger-Daily-Summary', 'v537'`,
  `X-Lien-Navigation-Loading-Experience', 'v536'`,
]) assert.ok(server.includes(required), `readiness invariant missing: ${required}`)

console.log(JSON.stringify({
  release: marker,
  runtimeVerified: true,
  permanentDetailRemoved: !client.includes('data-sl-detail-card'),
  editingPreserved: client.includes('function openEdit(root, row, bulk = false)'),
}))
