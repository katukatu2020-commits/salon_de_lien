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

assert.match(server, /X-Lien-All-Dealer-Order-Filter', 'v621'/)
assert.match(server, /X-Lien-Dealer-Code-History', 'v620'/)
assert.match(server, /inventory-orders-common-layout-v572\.js\?v=621-all-dealers1/)
assert.match(service, /const showingAllDealers = requestedDealerId === 'all'/)
assert.match(service, /selectedDealerId: showingAllDealers \? 'all' : dealerId/)
assert.match(service, /\(\$2::text IS NULL OR c\."dealerId"=\$2\)/)
assert.match(service, /\(\$2::text IS NULL OR o\."dealerId"=\$2\)/)
assert.match(service, /wholesale-ordering-client-v543\.js\?v=621-all-dealers1/)
assert.match(loader, /wholesale-ordering-client-v543\.js\?v=621-all-dealers1/)

const orderView = section(client, '  function orderView()', '  function inventoryView()')
assert.match(orderView, /value="all"/)
assert.match(orderView, /すべての発注先/)

const filters = section(client, '  function productFilters', '  function productThumb')
assert.match(filters, /すべてのメーカー/)

const selection = section(client, '  function selectedOrder()', '  function orderSummary()')
assert.match(selection, /function orderDealerId/)
assert.match(selection, /dealerIds\.length === 1/)

const interaction = section(client, '  function bindSalon()', '  const dealer =')
assert.match(interaction, /発注先ごとに注文を分けてください/)
assert.match(interaction, /salon\.quantities\.clear\(\)/)

const submit = section(client, '  async function submitOrder', '  async function saveInventory')
assert.match(submit, /dealerId: dealerId/)
assert.doesNotMatch(submit, /dealerId: salon\.data\.selectedDealerId/)

const history = section(client, '  function historyView()', '  function renderSalon()')
assert.doesNotMatch(history, /納品書|delivery-note/)
assert.match(client, /ディーラー固有コード ' \+ esc\(contract\.dealerCode\)/)

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
  release: 'all-dealer-order-filter-v621',
  allDealerCatalog: true,
  allManufacturerFilter: true,
  mixedDealerOrderBlocked: true,
  v620Preserved: true,
  receiptPrintingUnchanged: true,
}))
