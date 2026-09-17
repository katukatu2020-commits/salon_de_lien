import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const service = read('wholesale-ordering-v543.js')
const client = read('wholesale-ordering-client-v543.js')
const css = read('wholesale-ordering-v543.css')
const server = read('server.js')

assert.match(server, /X-Lien-Sales-Ledger-Product-Names', 'v655'/)
assert.match(server, /X-Lien-Dealer-Password-Common-Layout', 'v653'/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Dealer-Order-Documents/)
  assert.doesNotMatch(service, /function invoicePage/)
  assert.doesNotMatch(service, /\/export\\\.csv/)
  assert.doesNotMatch(client, /wo-order-document-actions-v656/)
  console.log(JSON.stringify({ snapshot: true, parent: 'v655' }))
  process.exit(0)
}

for (const required of [
  `function orderDocumentTotals(order, lines)`,
  `function deliveryNotePage(order, lines)`,
  `function invoicePage(order, lines)`,
  `function orderCsv(order, lines)`,
  `class="wo-note-discount"`,
  `値引き合計`,
  `<th>定価</th>`,
  `/invoice$/`,
  `/export\\.csv$/`,
  `csvDownload(res, orderNo + '-order.csv'`,
  `dealerOrderForDocuments`,
]) {
  const normalized = required === 'dealerOrderForDocuments' ? 'loadDealerOrderDocument' : required
  assert.ok(service.includes(normalized), `order document service invariant missing: ${normalized}`)
}

for (const required of [
  `receipt:`,
  `download:`,
  `function orderDocumentActions(order)`,
  `wo-order-document-actions-v656`,
  `/delivery-note`,
  `/invoice`,
  `/export.csv`,
  `wo-dialog-document-actions-v656`,
  `納品書・請求書の印刷、注文単位のCSV出力`,
]) assert.ok(client.includes(required), `order document client invariant missing: ${required}`)

for (const required of [
  `/* dealer-order-documents-v656 */`,
  `.wo-order-document-actions-v656`,
  `.wo-dialog-document-actions-v656`,
  `.wo-note-discount`,
]) assert.ok(css.includes(required), `order document CSS invariant missing: ${required}`)

assert.match(server, /X-Lien-Dealer-Order-Documents', 'v656'/)
assert.doesNotMatch(client, /class="wo-icon-link wo-order-note-link"/)

const require = createRequire(path.join(root, 'package.json'))
const { orderDocumentTotals, deliveryNotePage, invoicePage, orderCsv } = require(path.join(root, 'wholesale-ordering-v543.js'))
const order = {
  orderNo: 'PO-20260917-V656',
  deliveryNo: 'DN-20260917-V656',
  status: 'SHIPPED',
  taxRate: 10,
  subtotalYen: 10250,
  taxYen: 1025,
  totalYen: 11275,
  orderedAt: '2026-09-17T01:00:00.000Z',
  shippedAt: '2026-09-17T03:00:00.000Z',
  organizationName: 'Salon de Lien',
  dealerName: 'スーパーヤマモト',
  dealerInvoiceRegistrationNumber: 'T1234567890123',
  salonNote: '午前中希望',
}
const lines = [
  { manufacturerName: 'ミルボン', productName: 'オージュア', productCode: 'MIL-001', janCode: '4900000000001', category: 'ヘアケア', quantity: 2, deliveredQuantity: 2, listPrice: 5000, unitPrice: 4000, lineTotal: 8000, discountRate: 20 },
  { manufacturerName: 'サンコール', productName: '=CSV TEST', productCode: 'SUN-002', janCode: '4900000000002', category: 'カラー', quantity: 1, deliveredQuantity: 1, listPrice: 3000, unitPrice: 2250, lineTotal: 2250, discountRate: 25 },
]

const totals = orderDocumentTotals(order, lines)
assert.equal(totals.listSubtotal, 13000)
assert.equal(totals.discountYen, 2750)
assert.equal(totals.billedSubtotal, 10250)
assert.equal(totals.billedTotalYen, 11275)

const invoice = invoicePage(order, lines)
assert.match(invoice, /値引き合計/)
assert.match(invoice, /-2,750円/)
assert.match(invoice, /税抜請求額[\s\S]*10,250円/)
assert.match(invoice, /請求金額[\s\S]*11,275円/)
assert.doesNotMatch(invoice, /割引率|20%|25%|discountRate/)

const delivery = deliveryNotePage(order, lines)
assert.match(delivery, /<th>定価<\/th>/)
assert.match(delivery, /定価小計（税抜）[\s\S]*13,000円/)
assert.doesNotMatch(delivery, /8,000円|2,250円|値引き合計|割引率/)

const csv = orderCsv(order, lines)
assert.match(csv, /^"発注番号","受注日","希望納品日","美容室","ディーラー名"/)
assert.match(csv, /"商品コード","JANコード","受注数量","納品数量"/)
assert.match(csv, /"'=CSV TEST"/)
assert.match(csv, /"MIL-001"/)
assert.doesNotMatch(csv, /割引率|discountRate|20%|25%/)

console.log(JSON.stringify({
  release: 'dealer-order-documents-v656',
  runtimeVerified: true,
  deliveryUsesListPrices: true,
  invoiceAggregateDiscount: totals.discountYen,
  invoiceHidesLineDiscountRates: true,
  perOrderCsv: true,
}))
