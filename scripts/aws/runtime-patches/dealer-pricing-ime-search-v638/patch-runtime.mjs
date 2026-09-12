import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'dealer-pricing-ime-search-v638'
const changes = []

function replaceExact(file, before, after, expected, label) {
  const target = path.join(root, file)
  const source = fs.readFileSync(target, 'utf8')
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  fs.writeFileSync(target, source.split(before).join(after))
  changes.push({ file, label, count })
}

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-client-v543.js?v=631-pricing-pagination1',
  '/wholesale-ordering-client-v543.js?v=638-ime-safe-search1',
  1,
  'bust the dealer client cache',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  '    pricingSearchTimer: 0,\n    pricingContractId:',
  '    pricingSearchTimer: 0,\n    pricingSearchComposing: false, /* dealer-pricing-ime-search-v638 */\n    pricingContractId:',
  1,
  'track Japanese IME composition',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `<input id="dealer-pricing-search" value="' + esc(dealer.pricingQuery) + '" placeholder="商品名・メーカー・商品コードで検索" autocomplete="off">`,
  `<input id="dealer-pricing-search" value="' + esc(dealer.pricingQuery) + '" placeholder="商品名・メーカー・商品コードで検索" autocomplete="off" enterkeyhint="search">`,
  1,
  'identify the pricing field as a search input',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  '  async function reloadDealer(refreshBilling) {\n',
  `  function renderDealerPricingResults() {
    const currentSection = root.querySelector('.wo-pricing-management')
    if (!currentSection) { renderDealer(); return }

    const shell = document.createElement('div')
    shell.innerHTML = dealerPricing()
    const nextSection = shell.firstElementChild
    const currentForm = currentSection.querySelector('#dealer-pricing-form')
    const nextForm = nextSection?.querySelector('#dealer-pricing-form')
    const currentResult = currentSection.querySelector('.wo-product-result-v628')
    const nextResult = nextSection?.querySelector('.wo-product-result-v628')
    const currentConfigured = currentSection.querySelector('.wo-pricing-salon small')
    const nextConfigured = nextSection?.querySelector('.wo-pricing-salon small')

    if (!nextSection || !currentForm || !nextForm || !currentResult || !nextResult) {
      renderDealer()
      return
    }

    if (currentConfigured && nextConfigured) currentConfigured.textContent = nextConfigured.textContent
    currentResult.replaceWith(nextResult)
    currentForm.replaceWith(nextForm)
    currentSection.removeAttribute('aria-busy')
  }

  async function reloadDealer(refreshBilling, renderMode) {
`,
  1,
  'add a pricing-only result renderer',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    renderDealer()
    return true
  }

  function orderDetailDialog() {`,
  `    if (renderMode === 'pricing-results' && dealer.view === 'pricing') renderDealerPricingResults()
    else renderDealer()
    return true
  }

  function orderDetailDialog() {`,
  1,
  'keep the active pricing search field mounted',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  '  function bindDealer() {\n',
  `  function scheduleDealerPricingSearch(input) {
    dealer.pricingQuery = input.value
    dealer.pricingPage = 1
    dealer.pricingLoadId += 1
    syncDealerPricingUrl()
    clearTimeout(dealer.pricingSearchTimer)
    if (dealer.pricingSearchComposing) return

    const requestedQuery = dealer.pricingQuery
    dealer.pricingSearchTimer = setTimeout(async function () {
      if (requestedQuery !== dealer.pricingQuery || dealer.pricingSearchComposing) return
      const section = root.querySelector('.wo-pricing-management')
      const result = section?.querySelector('.wo-product-result-v628')
      const previousResult = result?.textContent || ''
      if (section) section.setAttribute('aria-busy', 'true')
      if (result) result.textContent = '検索中…'
      try {
        await reloadDealer(false, 'pricing-results')
      } catch (error) {
        section?.removeAttribute('aria-busy')
        if (result?.isConnected) result.textContent = previousResult
        notify(error.message, 'error')
      }
    }, 360)
  }

  function bindDealer() {
`,
  1,
  'queue an IME-safe pricing search',
)

const oldPricingSearch = `      if (event.target.id === 'dealer-pricing-search') {
        dealer.pricingQuery = event.target.value
        dealer.pricingPage = 1
        dealer.pricingLoadId += 1
        syncDealerPricingUrl()
        const requestedQuery = dealer.pricingQuery
        const cursor = event.target.selectionStart
        clearTimeout(dealer.pricingSearchTimer)
        dealer.pricingSearchTimer = setTimeout(async function () {
          if (requestedQuery !== dealer.pricingQuery) return
          root.querySelector('.wo-pricing-management')?.classList.add('is-page-loading-v631')
          try {
            await reloadDealer()
            const input = document.getElementById('dealer-pricing-search')
            if (input && requestedQuery === dealer.pricingQuery) {
              input.focus({ preventScroll: true })
              input.setSelectionRange(cursor, cursor)
            }
          } catch (error) {
            root.querySelector('.wo-pricing-management')?.classList.remove('is-page-loading-v631')
            notify(error.message, 'error')
          }
        }, 260)
        return
      }
`

replaceExact(
  'wholesale-ordering-client-v543.js',
  oldPricingSearch,
  `      if (event.target.id === 'dealer-pricing-search') {
        scheduleDealerPricingSearch(event.target)
        return
      }
`,
  1,
  'replace destructive pricing search rendering',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    root.addEventListener('input', function (event) {
      if (event.target.id === 'dealer-product-search') {`,
  `    root.addEventListener('compositionstart', function (event) {
      if (event.target.id !== 'dealer-pricing-search') return
      dealer.pricingSearchComposing = true
      dealer.pricingLoadId += 1
      clearTimeout(dealer.pricingSearchTimer)
    })
    root.addEventListener('compositionend', function (event) {
      if (event.target.id !== 'dealer-pricing-search') return
      dealer.pricingSearchComposing = false
      scheduleDealerPricingSearch(event.target)
    })
    root.addEventListener('input', function (event) {
      if (event.target.id === 'dealer-product-search') {`,
  1,
  'respect the Japanese IME composition lifecycle',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Business-Inquiries', 'v637') /* business-inquiries-v637-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Pricing-Ime-Search', 'v638') /* ${marker}-ready */`,
  1,
  'publish the pricing IME search readiness marker',
)

fs.writeFileSync('/tmp/dealer-pricing-ime-search-v638-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
