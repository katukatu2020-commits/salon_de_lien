import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const marker = 'dealer-pricing-pagination-v631'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

function replaceBetween(file, start, end, fragmentName, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const startCount = source.split(start).length - 1
  const endCount = source.split(end).length - 1
  if (startCount !== 1 || endCount !== 1) throw new Error(`${label}: expected unique boundaries, found ${startCount}/${endCount}`)
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  if (to < 0) throw new Error(`${label}: end boundary precedes start boundary`)
  const fragment = fs.readFileSync(path.join(here, fragmentName), 'utf8').trimEnd() + '\n\n'
  fs.writeFileSync(target, source.slice(0, from) + fragment + source.slice(to))
  changes.push({ file, label, count: 1 })
}

function appendCss(file, sourceName, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  if (source.includes(marker)) throw new Error(`${label}: marker already exists`)
  const addition = fs.readFileSync(path.join(here, sourceName), 'utf8').trim()
  fs.writeFileSync(target, `${source.trimEnd()}\n\n${addition}\n`)
  changes.push({ file, label, count: 1 })
}

replaceExact(
  'wholesale-ordering-v543.js',
  "const DEALER_PRODUCT_PAGE_SIZE = 30 /* list-pagination-performance-v628 */\n",
  "const DEALER_PRODUCT_PAGE_SIZE = 30 /* list-pagination-performance-v628 */\nconst DEALER_PRICING_PAGE_SIZE = 30 /* dealer-pricing-pagination-v631 */\n",
  1,
  'dealer pricing page size',
)

replaceBetween(
  'wholesale-ordering-v543.js',
  '  async function dealerBootstrap(session, url) {\n',
  '  async function updateContractProductPricing(session, contractId, payload) {\n',
  'dealer-bootstrap-v631.fragment.js',
  'server-side dealer pricing pagination',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-v543.css?v=628-pagination1',
  '/wholesale-ordering-v543.css?v=631-pricing-pagination1',
  1,
  'dealer stylesheet cache key',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-client-v543.js?v=628-pagination1',
  '/wholesale-ordering-client-v543.js?v=631-pricing-pagination1',
  1,
  'dealer client cache key',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    pricingQuery: '',
    pricingContractId: new URLSearchParams(location.search).get('contractId') || '',
    pricingBulkRate: '20',
`,
  `    pricingQuery: dealerProductLocationV628.get('pricingSearch') || '',
    pricingPage: Math.max(1, Number.parseInt(dealerProductLocationV628.get('pricingPage') || '1', 10) || 1),
    pricingLoadId: 0,
    pricingSearchTimer: 0,
    pricingContractId: dealerProductLocationV628.get('contractId') || '',
    pricingBulkRate: '20',
`,
  1,
  'dealer pricing URL and request state',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  '  function activeDealerContracts() {\n',
  '  function filteredDealerOrders() {\n',
  'dealer-pricing-v631.fragment.js',
  'paginated contract pricing renderer',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  '  async function reloadDealer(refreshBilling) {\n',
  '  function orderDetailDialog() {\n',
  'reload-dealer-v631.fragment.js',
  'page-aware dealer bootstrap client',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  '  async function saveContractPricing(button) {\n',
  '  async function removeDealerItem(button) {\n',
  'save-pricing-v631.fragment.js',
  'save only changed pricing rows',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  "      if (target.dataset.action === 'dealer-product-page') {\n",
  "      else if (target.dataset.action === 'dealer-status-filter') { dealer.status = target.dataset.status; renderDealer() }",
  'dealer-page-click-v631.fragment.js',
  'dealer pricing page controls',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  "      if (event.target.id === 'dealer-product-search') {\n",
  "      if (event.target.closest('.wo-detail-line') && (event.target.dataset.field === 'unitPrice' || event.target.dataset.field === 'deliveredQuantity')) {\n",
  'dealer-search-v631.fragment.js',
  'debounced server-side pricing search',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  "    root.addEventListener('change', function (event) {\n",
  "    root.addEventListener('submit', async function (event) {\n      if (event.target.id === 'dealer-company-form') {\n",
  'dealer-change-v631.fragment.js',
  'asynchronous salon pricing selection',
)

appendCss('wholesale-ordering-v543.css', 'dealer-pricing-v631.css', 'dealer pricing pagination styles')

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-List-Pagination', 'v628') /* list-pagination-performance-v628-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Pricing-Pagination', 'v631') /* ${marker}-ready */`,
  1,
  'dealer pricing pagination readiness marker',
)

fs.writeFileSync('/tmp/dealer-pricing-pagination-v631-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
