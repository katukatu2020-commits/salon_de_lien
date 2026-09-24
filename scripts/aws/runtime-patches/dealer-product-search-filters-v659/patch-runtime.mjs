import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const release = 'dealer-product-search-filters-v659'
const here = path.dirname(fileURLToPath(import.meta.url))
const serverPath = path.join(root, 'server.js')
const dealerServicePath = path.join(root, 'wholesale-ordering-v543.js')
const dealerClientPath = path.join(root, 'wholesale-ordering-client-v543.js')
const dealerCssPath = path.join(root, 'wholesale-ordering-v543.css')

let server = fs.readFileSync(serverPath, 'utf8')
let dealerService = fs.readFileSync(dealerServicePath, 'utf8')
let dealerClient = fs.readFileSync(dealerClientPath, 'utf8')
let dealerCss = fs.readFileSync(dealerCssPath, 'utf8')

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: target was not found`)
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: target was not unique`)
  return source.slice(0, first) + after + source.slice(first + before.length)
}

function replaceBetween(source, start, end, fragmentName, label) {
  const from = source.indexOf(start)
  if (from < 0 || source.indexOf(start, from + start.length) >= 0) throw new Error(`${label}: start boundary was not unique`)
  const to = source.indexOf(end, from + start.length)
  if (to < 0 || source.indexOf(end, to + end.length) >= 0) throw new Error(`${label}: end boundary was not unique`)
  const fragment = fs.readFileSync(path.join(here, fragmentName), 'utf8').trimEnd() + '\n\n'
  return source.slice(0, from) + fragment + source.slice(to)
}

dealerService = replaceOnce(
  dealerService,
  '/wholesale-ordering-v543.css?v=656-order-documents1',
  '/wholesale-ordering-v543.css?v=659-product-search-filters1',
  'dealer stylesheet cache key',
)

dealerService = replaceOnce(
  dealerService,
  '/wholesale-ordering-client-v543.js?v=658-calendar1',
  '/wholesale-ordering-client-v543.js?v=659-product-search-filters1',
  'dealer client cache key',
)

dealerService = replaceBetween(
  dealerService,
  '  async function dealerBootstrap(session, url) {\n',
  '  async function updateContractProductPricing(session, contractId, payload) {\n',
  'dealer-bootstrap-v659.fragment.js',
  'normalized product search and server filters',
)

dealerClient = replaceOnce(
  dealerClient,
  `    productSearchComposing: false, /* search-input-stability-v641 */
    pricingQuery: dealerProductLocationV628.get('pricingSearch') || '',`,
  `    productSearchComposing: false, /* search-input-stability-v641 */
    productManufacturer: dealerProductLocationV628.get('productManufacturer') || '',
    productCategory: dealerProductLocationV628.get('productCategory') || '',
    pricingQuery: dealerProductLocationV628.get('pricingSearch') || '',`,
  'product filter state',
)

dealerClient = replaceOnce(
  dealerClient,
  `    pricingSearchComposing: false, /* dealer-pricing-ime-search-v638 */
    pricingContractId: dealerProductLocationV628.get('contractId') || '',
    pricingBulkRate: '20',
    pricingDraft: new Map(),`,
  `    pricingSearchComposing: false, /* dealer-pricing-ime-search-v638 */
    pricingManufacturer: dealerProductLocationV628.get('pricingManufacturer') || '',
    pricingCategory: dealerProductLocationV628.get('pricingCategory') || '',
    pricingContractId: dealerProductLocationV628.get('contractId') || '',
    pricingBulkRate: '20',
    pricingDraft: new Map(),
    pricingSelection: new Set(), /* ${release} */`,
  'pricing filter and bulk-selection state',
)

dealerClient = replaceBetween(
  dealerClient,
  '  function syncDealerProductUrl() {\n',
  '  function activeDealerContracts() {\n',
  'dealer-products-v659.fragment.js',
  'product management filters',
)

dealerClient = replaceBetween(
  dealerClient,
  '  function activeDealerContracts() {\n',
  '  function filteredDealerOrders() {\n',
  'dealer-pricing-v659.fragment.js',
  'pricing filters and independent selection controls',
)

dealerClient = replaceBetween(
  dealerClient,
  '  function applyBulkPricing() {\n',
  '  async function saveContractPricing(button) {\n',
  'dealer-bulk-pricing-v659.fragment.js',
  'stable bulk pricing operation',
)

dealerClient = replaceOnce(
  dealerClient,
  `      dealer.pricingDraft.clear()
      notify(result.configuredCount + '商品の取扱・割引設定を保存しました。')`,
  `      dealer.pricingDraft.clear()
      dealer.pricingSelection.clear()
      notify(result.configuredCount + '商品の取扱・割引設定を保存しました。')`,
  'clear bulk selection after save',
)

dealerClient = replaceOnce(
  dealerClient,
  `      if (dealer.productQuery) bootstrapParams.set('productSearch', dealer.productQuery)
      productRequestId = ++dealer.productLoadId`,
  `      if (dealer.productQuery) bootstrapParams.set('productSearch', dealer.productQuery)
      if (dealer.productManufacturer) bootstrapParams.set('productManufacturer', dealer.productManufacturer)
      if (dealer.productCategory) bootstrapParams.set('productCategory', dealer.productCategory)
      productRequestId = ++dealer.productLoadId`,
  'send product filters',
)

dealerClient = replaceOnce(
  dealerClient,
  `      if (dealer.pricingQuery) bootstrapParams.set('pricingSearch', dealer.pricingQuery)
      if (dealer.pricingContractId) bootstrapParams.set('contractId', dealer.pricingContractId)`,
  `      if (dealer.pricingQuery) bootstrapParams.set('pricingSearch', dealer.pricingQuery)
      if (dealer.pricingManufacturer) bootstrapParams.set('pricingManufacturer', dealer.pricingManufacturer)
      if (dealer.pricingCategory) bootstrapParams.set('pricingCategory', dealer.pricingCategory)
      if (dealer.pricingContractId) bootstrapParams.set('contractId', dealer.pricingContractId)`,
  'send pricing filters',
)

dealerClient = replaceOnce(
  dealerClient,
  `      dealer.productQuery = String(dealer.data.productPagination.query || '')
      syncDealerProductUrl()`,
  `      dealer.productQuery = String(dealer.data.productPagination.query || '')
      dealer.productManufacturer = String(dealer.data.productPagination.manufacturer || '')
      dealer.productCategory = String(dealer.data.productPagination.category || '')
      syncDealerProductUrl()`,
  'apply returned product filters',
)

dealerClient = replaceOnce(
  dealerClient,
  `      dealer.pricingQuery = String(dealer.data.pricingPagination.query || '')
      dealer.pricingContractId = String(dealer.data.pricingPagination.contractId || contracts[0]?.id || '')`,
  `      dealer.pricingQuery = String(dealer.data.pricingPagination.query || '')
      dealer.pricingManufacturer = String(dealer.data.pricingPagination.manufacturer || '')
      dealer.pricingCategory = String(dealer.data.pricingPagination.category || '')
      dealer.pricingContractId = String(dealer.data.pricingPagination.contractId || contracts[0]?.id || '')`,
  'apply returned pricing filters',
)

dealerClient = replaceOnce(
  dealerClient,
  `      else if (target.dataset.action === 'dealer-status-filter') { dealer.status = target.dataset.status; renderDealer() }`,
  `      else if (target.dataset.action === 'reset-product-filters') {
        dealer.productQuery = ''
        dealer.productManufacturer = ''
        dealer.productCategory = ''
        dealer.productPage = 1
        dealer.productLoadId += 1
        clearTimeout(dealer.productSearchTimer)
        syncDealerProductUrl()
        await reloadDealer()
      }
      else if (target.dataset.action === 'reset-pricing-filters') {
        dealer.pricingQuery = ''
        dealer.pricingManufacturer = ''
        dealer.pricingCategory = ''
        dealer.pricingPage = 1
        dealer.pricingLoadId += 1
        clearTimeout(dealer.pricingSearchTimer)
        syncDealerPricingUrl()
        await reloadDealer()
      }
      else if (target.dataset.action === 'select-visible-pricing') {
        dealer.data.products.forEach(function (product) { dealer.pricingSelection.add(product.id) })
        renderDealer()
      }
      else if (target.dataset.action === 'clear-pricing-selection') {
        dealer.pricingSelection.clear()
        renderDealer()
      }
      else if (target.dataset.action === 'dealer-status-filter') { dealer.status = target.dataset.status; renderDealer() }`,
  'filter reset and explicit bulk-selection actions',
)

dealerClient = replaceBetween(
  dealerClient,
  "    root.addEventListener('change', async function (event) {\n      if (event.target.id === 'dealer-billing-agreement') {\n",
  "    root.addEventListener('submit', async function (event) {\n",
  'dealer-change-v659.fragment.js',
  'filter and selection change handlers',
)

const readinessAnchor = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Monthly-Calendar', 'v658') /* dealer-monthly-calendar-v658-ready */`
server = replaceOnce(
  server,
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Product-Search-Filters', 'v659') /* ${release}-ready */`,
  'v659 readiness header',
)

const cssAddition = fs.readFileSync(path.join(here, 'dealer-product-search-filters-v659.css'), 'utf8').trim()
if (dealerCss.includes('dealer-product-search-filters-v659')) throw new Error('dealer stylesheet already contains v659')
dealerCss = `${dealerCss.trimEnd()}\n\n${cssAddition}\n`

server += `\n/* ${release} */\n`
dealerService += `\n/* ${release} */\n`
dealerClient += `\n/* ${release} */\n`

fs.writeFileSync(serverPath, server)
fs.writeFileSync(dealerServicePath, dealerService)
fs.writeFileSync(dealerClientPath, dealerClient)
fs.writeFileSync(dealerCssPath, dealerCss)

console.log(JSON.stringify({ release, patched: true, searchVariants: true, productFilters: true, pricingBulkSelection: true }))
