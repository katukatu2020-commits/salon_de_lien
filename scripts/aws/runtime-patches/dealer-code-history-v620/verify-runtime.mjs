import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function section(source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  assert.ok(from >= 0 && to > from, `section not found: ${start}`)
  return source.slice(from, to)
}

const server = read('server.js')
const service = read('wholesale-ordering-v543.js')
const client = read('wholesale-ordering-client-v543.js')
const loader = read('public/inventory-orders-common-layout-v572.js')
const stylesheet = read('wholesale-ordering-v543.css')

assert.match(server, /X-Lien-Dealer-Code-History', 'v620'/)
assert.match(server, /wholesale-ordering-v543\.css\?v=620-dealer-code1/)
assert.match(server, /inventory-orders-common-layout-v572\.js\?v=620-dealer-code1/)
assert.match(service, /d\."id" AS "dealerId",d\."dealerCode",d\."name" AS "dealerName"/)
assert.match(service, /wholesale-ordering-client-v543\.js\?v=620-dealer-code1/)
assert.match(loader, /wholesale-ordering-client-v543\.js\?v=620-dealer-code1/)

const contractPanel = section(client, '  function contractPanel()', '  function productFilters')
assert.match(contractPanel, /ディーラー固有コード/)
assert.match(contractPanel, /contract\.dealerCode/)
assert.doesNotMatch(contractPanel, /contract\.customerCode|得意先コード/)

const salonHistory = section(client, '  function historyView()', '  function renderSalon()')
assert.match(salonHistory, /発注番号 \/ 発注日.*発注先.*内容.*金額.*状態/s)
assert.doesNotMatch(salonHistory, /納品書|delivery-note|icon\('printer'\)/)

const dealerOrders = section(client, '  function dealerOrders()', '  function renderDealer()')
assert.match(dealerOrders, /納品書/)
assert.match(dealerOrders, /delivery-note/)
assert.match(dealerOrders, /icon\('printer'\)/)

const deliveryRoute = section(service, '  async function renderDeliveryNote', '  async function handle')
assert.match(deliveryRoute, /if \(admin\) return redirect\(res, '\/admin\/products\/orders\?view=history', 302\)/)
assert.match(deliveryRoute, /const where = 'o\."dealerId"=\$2'/)
assert.doesNotMatch(deliveryRoute, /o\."organizationId"=\$2|actorType|\? 'dealer' : 'admin'/)

assert.match(stylesheet, /grid-template-columns: 1\.35fr 1fr \.75fr \.9fr \.8fr; min-width: 820px/)
assert.doesNotMatch(stylesheet, /\.wo-order-history article > div:nth-child\(6\)/)

const protectedReceiptHashes = {
  'public/receipt-pos-direct-v582.js': 'd3eacecb92f5bbacb65d6622b63e5749985b94f867899acdce96fa94862b91ae',
  'public/receipt-physical-roll-v579.js': 'b07d73d1f8d7d27a5233765d012772ba61f2a1cbcab4cee5e43989b1d66e0412',
  'public/receipt-physical-roll-v579.css': '9492bb95f4d1af6a7d8de8b64dfd3e45506160dde532493b26c5d2bcc24685f7',
  'public/receipt-roll-print-v569.js': '3dc07615d8c88137eaddefd9b9cc7c468125b5ddbf8af6c67760e3834b5a57a1',
  'public/receipt-roll-print-v569.css': '808e60d04ae2661402e2c38b188a33bb53d64e40a65384e9496e6a9ca9580c6a',
  'public/receipt-thermal-print-v540.js': '170acf2d681fddeaf9e80676f9215d3f6afe100b3bfaac544a04c744d547319a',
  'public/receipt-thermal-print-v540.css': '55aec360d38a7a9f67006a7b311cc8c9920ce01dcbf746ae061bcda9e6236c16',
}
for (const [file, expected] of Object.entries(protectedReceiptHashes)) {
  const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')
  assert.equal(actual, expected, `${file} changed unexpectedly`)
}

console.log(JSON.stringify({
  release: 'dealer-code-history-v620',
  dealerCodeProjected: true,
  salonDeliveryNoteRemoved: true,
  dealerDeliveryNotePreserved: true,
  receiptPrintingUnchanged: true,
}))
