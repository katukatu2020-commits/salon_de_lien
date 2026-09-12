import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const here = path.dirname(fileURLToPath(import.meta.url))
const marker = 'list-pagination-performance-v628'
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
  if (startCount !== 1 || endCount !== 1) {
    throw new Error(`${label}: expected unique boundaries, found ${startCount}/${endCount}`)
  }
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
  "const DEALER_PLAN_KEY = 'dealer'\n",
  "const DEALER_PLAN_KEY = 'dealer'\nconst DEALER_PRODUCT_PAGE_SIZE = 30 /* list-pagination-performance-v628 */\n",
  1,
  'dealer product page size',
)

replaceBetween(
  'wholesale-ordering-v543.js',
  '  async function dealerBootstrap(session) {\n',
  '  async function updateContractProductPricing(session, contractId, payload) {\n',
  'dealer-bootstrap-v628.fragment.js',
  'server-side dealer product pagination',
)

replaceExact(
  'wholesale-ordering-v543.js',
  "if (pathname === '/api/dealer/bootstrap' && req.method === 'GET') { json(res, 200, { ok: true, ...(await dealerBootstrap(session)) }); return true }",
  "if (pathname === '/api/dealer/bootstrap' && req.method === 'GET') { json(res, 200, { ok: true, ...(await dealerBootstrap(session, url)) }); return true } /* list-pagination-performance-v628 */",
  1,
  'pass dealer product pagination parameters',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-v543.css?v=622-auto-split1',
  '/wholesale-ordering-v543.css?v=628-pagination1',
  1,
  'dealer stylesheet cache key',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-client-v543.js?v=622-auto-split1',
  '/wholesale-ordering-client-v543.js?v=628-pagination1',
  1,
  'dealer client cache key',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  '  const dealer = {\n',
  "  const dealerProductLocationV628 = new URLSearchParams(location.search)\n  const dealer = {\n",
  1,
  'dealer product URL state',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  "    productQuery: '',\n",
  "    productQuery: dealerProductLocationV628.get('productSearch') || '',\n    productPage: Math.max(1, Number.parseInt(dealerProductLocationV628.get('productPage') || '1', 10) || 1),\n    productLoadId: 0,\n    productSearchTimer: 0,\n",
  1,
  'dealer product list state',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  '  function dealerProducts() {\n',
  '  function activeDealerContracts() {\n',
  'dealer-products-v628.fragment.js',
  'dealer product paginated renderer',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    dealer.data = await api('/api/dealer/bootstrap')
    const contracts = activeDealerContracts()
    if (!contracts.some(function (contract) { return contract.id === dealer.pricingContractId })) dealer.pricingContractId = contracts[0]?.id || ''
    dealer.pricingDraft.clear()
    renderDealer()
`,
  `    const bootstrapParams = new URLSearchParams()
    let productRequestId = 0
    if (dealer.view === 'products') {
      bootstrapParams.set('view', 'products')
      bootstrapParams.set('productPage', String(dealer.productPage))
      if (dealer.productQuery) bootstrapParams.set('productSearch', dealer.productQuery)
      productRequestId = ++dealer.productLoadId
    }
    const bootstrapQuery = bootstrapParams.toString()
    const nextData = await api('/api/dealer/bootstrap' + (bootstrapQuery ? '?' + bootstrapQuery : ''))
    if (productRequestId && productRequestId !== dealer.productLoadId) return false
    dealer.data = nextData
    if (dealer.view === 'products' && dealer.data.productPagination) {
      dealer.productPage = Number(dealer.data.productPagination.page || 1)
      dealer.productQuery = String(dealer.data.productPagination.query || '')
      syncDealerProductUrl()
    }
    const contracts = activeDealerContracts()
    if (!contracts.some(function (contract) { return contract.id === dealer.pricingContractId })) dealer.pricingContractId = contracts[0]?.id || ''
    dealer.pricingDraft.clear()
    renderDealer()
    return true
`,
  1,
  'load only the requested dealer product page',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  "      if (target.dataset.action === 'dealer-status-filter') { dealer.status = target.dataset.status; renderDealer() }",
  `      if (target.dataset.action === 'dealer-product-page') {
        const nextPage = Number.parseInt(target.dataset.page || '1', 10)
        if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage === dealer.productPage) return
        const previousPage = dealer.productPage
        dealer.productPage = nextPage
        syncDealerProductUrl()
        target.disabled = true
        root.querySelector('.wo-product-management')?.classList.add('is-page-loading-v628')
        try {
          const rendered = await reloadDealer()
          if (rendered !== false) root.querySelector('.wo-product-toolbar')?.scrollIntoView({ block: 'start', behavior: 'auto' })
        } catch (error) {
          dealer.productPage = previousPage
          syncDealerProductUrl()
          root.querySelector('.wo-product-management')?.classList.remove('is-page-loading-v628')
          notify(error.message, 'error')
          target.disabled = false
        }
      }
      else if (target.dataset.action === 'dealer-status-filter') { dealer.status = target.dataset.status; renderDealer() }`,
  1,
  'dealer product page controls',
)

replaceBetween(
  'wholesale-ordering-client-v543.js',
  "      const searchState = event.target.id === 'dealer-order-search'\n",
  "      if (event.target.closest('.wo-detail-line') && (event.target.dataset.field === 'unitPrice' || event.target.dataset.field === 'deliveredQuantity')) {\n",
  'dealer-search-v628.fragment.js',
  'debounced server-side dealer product search',
)

appendCss('wholesale-ordering-v543.css', 'dealer-pagination-v628.css', 'dealer pagination styles')

replaceExact(
  'style-admin-controls-v618.js',
  'const PAGE_SIZE = 50\n',
  'const PAGE_SIZE = 20 /* list-pagination-performance-v628 */\n',
  1,
  'style list page size',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  '  let listRequest = 0\n',
  '  let listRequest = 0\n  let listAbortController = null /* list-pagination-performance-v628 */\n',
  1,
  'style list request cancellation state',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  "    const lazy = index > 5 ? ' loading=\"lazy\"' : ''",
  "    const lazy = index > 3 ? ' loading=\"lazy\" fetchpriority=\"low\"' : ' fetchpriority=\"high\"'",
  1,
  'defer below-fold style images',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  "        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',",
  "        behavior: 'auto',",
  1,
  'avoid animated long-list page jumps',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `    const requestId = ++listRequest
    const filters = readListFilters()
    listRoot.classList.add('is-loading-v618')
`,
  `    const requestId = ++listRequest
    if (listAbortController) listAbortController.abort()
    const controller = new AbortController()
    listAbortController = controller
    const filters = readListFilters()
    listRoot.classList.add('is-loading-v618')
`,
  1,
  'cancel superseded style list requests',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  "      const payload = await request('/api/lien-style-admin-v618?' + params)",
  "      const payload = await request('/api/lien-style-admin-v618?' + params, { signal: controller.signal })",
  1,
  'attach style list abort signal',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `    } catch (error) {
      if (requestId !== listRequest || !listRoot || !listRoot.isConnected) return
`,
  `    } catch (error) {
      if (error && error.name === 'AbortError') return
      if (requestId !== listRequest || !listRoot || !listRoot.isConnected) return
`,
  1,
  'ignore cancelled style list requests',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `    } finally {
      if (requestId === listRequest && listRoot) listRoot.classList.remove('is-loading-v618')
    }
`,
  `    } finally {
      if (controller === listAbortController) listAbortController = null
      if (requestId === listRequest && listRoot) listRoot.classList.remove('is-loading-v618')
    }
`,
  1,
  'release style list request controller',
)

replaceExact(
  'public/style-admin-controls-v618.js',
  `  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(activateList, 3000), { once: true })
  } else {
    setTimeout(activateList, 3000)
  }
`,
  `  const activateAfterHydrationV628 = () => requestAnimationFrame(() => requestAnimationFrame(activateList))
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activateAfterHydrationV628, { once: true })
  } else {
    activateAfterHydrationV628()
  }
`,
  1,
  'remove the three-second legacy style list delay',
)

appendCss('public/style-admin-controls-v618.css', 'style-pagination-v628.css', 'style pagination performance styles')

replaceExact(
  'server.js',
  '/style-admin-controls-v618.css?v=625-post-controls1',
  '/style-admin-controls-v618.css?v=628-pagination1',
  1,
  'style pagination stylesheet cache key',
)

replaceExact(
  'server.js',
  '/style-admin-controls-v618.js?v=626-detail-cleanup1',
  '/style-admin-controls-v618.js?v=628-pagination1',
  1,
  'style pagination client cache key',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Password-Visibility', 'v627') /* password-visibility-v627-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-List-Pagination', 'v628') /* ${marker}-ready */`,
  1,
  'list pagination readiness marker',
)

fs.writeFileSync('/tmp/list-pagination-performance-v628-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
