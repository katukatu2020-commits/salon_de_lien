import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchDir = path.dirname(fileURLToPath(import.meta.url))
const marker = 'auto-split-orders-v622'
const changes = []

function fragment(file) {
  return fs.readFileSync(path.join(patchDir, file), 'utf8').trimEnd()
}

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${marker}: ${label} expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

function replaceSection(file, start, end, replacement, required, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const from = source.indexOf(start)
  const duplicate = source.indexOf(start, from + start.length)
  const to = source.indexOf(end, from + start.length)
  if (from < 0 || duplicate >= 0 || to <= from) throw new Error(`${marker}: ${label} section boundary mismatch`)
  const current = source.slice(from, to)
  for (const expected of required) {
    if (!current.includes(expected)) throw new Error(`${marker}: ${label} is missing expected parent marker: ${expected}`)
  }
  fs.writeFileSync(target, source.slice(0, from) + replacement.trimEnd() + '\n\n' + source.slice(to))
  changes.push({ file, label, count: 1 })
}

replaceExact(
  'server.js',
  'inventory-orders-common-layout-v572.js?v=621-all-dealers1',
  'inventory-orders-common-layout-v572.js?v=622-auto-split1',
  1,
  'salon wholesale loader cache key',
)

replaceExact(
  'server.js',
  'wholesale-ordering-v543.css?v=620-dealer-code1',
  'wholesale-ordering-v543.css?v=622-auto-split1',
  1,
  'salon wholesale stylesheet cache key',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-All-Dealer-Order-Filter', 'v621') /* all-dealer-order-filter-v621-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  readinessAnchor + `\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Auto-Split-Orders', 'v622') /* ${marker}-ready */`,
  1,
  'readiness header',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-client-v543.js?v=621-all-dealers1',
  '/wholesale-ordering-client-v543.js?v=622-auto-split1',
  1,
  'wholesale client cache key',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-v543.css?v=620-dealer-code1',
  '/wholesale-ordering-v543.css?v=622-auto-split1',
  1,
  'wholesale stylesheet cache key',
)

replaceExact(
  'public/inventory-orders-common-layout-v572.js',
  '/wholesale-ordering-client-v543.js?v=621-all-dealers1',
  '/wholesale-ordering-client-v543.js?v=622-auto-split1',
  1,
  'salon wholesale client cache key',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '  async function dealerBootstrap(session) {',
  fragment('server-batch-function.js') + '\n\n  async function dealerBootstrap(session) {',
  1,
  'atomic split order service',
)

replaceExact(
  'wholesale-ordering-v543.js',
  "        if (pathname === '/api/admin/wholesale/orders') { json(res, 201, { ok: true, order: await createOrder(session, payload) }); return true }",
  "        if (pathname === '/api/admin/wholesale/orders') { const orders = Array.isArray(payload.orders) ? await createSplitOrders(session, payload) : [await createOrder(session, payload)]; json(res, 201, { ok: true, order: orders[0], orders }); return true }",
  1,
  'split order api response',
)

replaceSection(
  'wholesale-ordering-client-v543.js',
  '  function orderDealerId() {',
  '  function orderView() {',
  fragment('client-selection-summary.js'),
  ['dealerIds.length === 1', '発注先ごとに注文を確定します。'],
  'selection grouping and summary',
)

replaceSection(
  'wholesale-ordering-client-v543.js',
  '  function showOrderDialog() {',
  '  async function saveInventory(button) {',
  fragment('client-dialog-submit.js'),
  ['const dealerId = orderDealerId()', 'dealerId: dealerId', '発注先ごとに商品を選択してください。'],
  'grouped confirmation and submission',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `        const product = salonOrderProducts().find(function (item) { return item.id === id })
        const currentDealerId = orderDealerId()
        if (next > 0 && product && currentDealerId && product.dealerId !== currentDealerId) {
          notify('発注先ごとに注文を分けてください。', 'error')
          return
        }
        salon.quantities.set(id, next)`,
  '        salon.quantities.set(id, next)',
  1,
  'allow mixed dealer stepper selection',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `        const product = salonOrderProducts().find(function (item) { return item.id === stepper.dataset.productId })
        const currentDealerId = orderDealerId()
        if (value > 0 && product && currentDealerId && product.dealerId !== currentDealerId) {
          event.target.value = salon.quantities.get(stepper.dataset.productId) || 0
          notify('発注先ごとに注文を分けてください。', 'error')
          return
        }
        salon.quantities.set(stepper.dataset.productId, value)`,
  '        salon.quantities.set(stepper.dataset.productId, value)',
  1,
  'allow mixed dealer quantity input',
)

replaceExact(
  'wholesale-ordering-v543.css',
  '.wo-toast {',
  fragment('auto-split-orders.css') + '\n\n.wo-toast {',
  1,
  'split confirmation styles',
)

fs.writeFileSync('/tmp/auto-split-orders-v622-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
