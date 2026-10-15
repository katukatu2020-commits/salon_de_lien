'use strict'
const fs = require('node:fs'), path = require('node:path')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const write = (file, value) => fs.writeFileSync(path.join(root, file), value)
function replace(source, from, to) {
  if (source.split(from).length !== 2) throw Error('Unexpected anchor: ' + from.slice(0, 150))
  return source.replace(from, to)
}
let orders = read('public/dealer-orders-v713.js')
orders = replace(orders, '  function orderDetailDialog() {', `  function canEditDealerOrderLines(detail) {
    return Boolean(detail.cutoffOpen && (detail.order.status === 'ORDERED' || detail.order.status === 'ACCEPTED'))
  }

  function orderDetailDialog() {`)
orders = replace(orders,
  "const editable = detail.cutoffOpen && (order.status === 'ORDERED' || order.status === 'ACCEPTED')",
  'const editable = canEditDealerOrderLines(detail)')
orders = replace(orders,
  "      await post('/api/dealer/orders/' + encodeURIComponent(dealer.detail.order.id) + '/status', { status: status, dealerNote: document.getElementById('dealer-note') ? document.getElementById('dealer-note').value : '', lines: detailLinesPayload() })",
  `      const payload = { status: status, dealerNote: document.getElementById('dealer-note') ? document.getElementById('dealer-note').value : '' }
      // Status-only actions must not resubmit immutable shipment lines.
      if (canEditDealerOrderLines(dealer.detail)) payload.lines = detailLinesPayload()
      await post('/api/dealer/orders/' + encodeURIComponent(dealer.detail.order.id) + '/status', payload)`)
write('public/dealer-orders-v715.js', orders)
let shell = read('dealer-workspace-v714.js')
shell = replace(shell, "'/dealer-orders-v713.js'", "'/dealer-orders-v715.js'")
write('dealer-workspace-v715.js', shell)
let service = read('wholesale-ordering-v543.js')
service = replace(service, "require('./dealer-workspace-v714.js').render", "require('./dealer-workspace-v715.js').render")
write('wholesale-ordering-v543.js', service)
let server = read('server.js')
const ready = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Salon-Picker', 'v714')"
server = replace(server, ready + '\n', "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Delivery', 'v715')\n" + ready + '\n')
write('server.js', server)
// Run the existing picker assertions against the active shell, not the retained old asset.
const pickerTest = '/tmp/lien-v714/verify-runtime.mjs'
const test = fs.readFileSync(pickerTest, 'utf8')
if (test.split('dealer-workspace-v714.js').length !== 4) throw Error('Unexpected v714 shell assertions')
fs.writeFileSync(pickerTest, test.replaceAll('dealer-workspace-v714.js', 'dealer-workspace-v715.js'))
console.log('v715 applied: status-only delivery completion; server mutation guards unchanged')
