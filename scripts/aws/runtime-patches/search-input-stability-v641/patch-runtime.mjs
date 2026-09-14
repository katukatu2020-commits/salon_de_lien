import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'search-input-stability-v641'
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
  '/wholesale-ordering-client-v543.js?v=638-ime-safe-search1',
  '/wholesale-ordering-client-v543.js?v=641-search-input-stability1',
  1,
  'bust the dealer client cache',
)

replaceExact(
  'wholesale-ordering-v543.js',
  '/wholesale-ordering-client-v543.js?v=576',
  '/wholesale-ordering-client-v543.js?v=641-search-input-stability1',
  1,
  'bust the salon wholesale client cache',
)

replaceExact(
  'public/inventory-orders-common-layout-v572.js',
  '/wholesale-ordering-client-v543.js?v=622-auto-split1',
  '/wholesale-ordering-client-v543.js?v=641-search-input-stability1',
  1,
  'bust the shared salon inventory client cache',
)

replaceExact(
  'server.js',
  '/inventory-orders-common-layout-v572.js?v=622-auto-split1',
  '/inventory-orders-common-layout-v572.js?v=641-search-input-stability1',
  1,
  'bust the shared salon inventory loader cache',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    inventoryReason: '',
    busy: false,`,
  `    inventoryReason: '',
    searchComposing: false, /* ${marker} */
    busy: false,`,
  1,
  'track salon product-search composition',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `<input id="product-search" value="' + esc(salon.query) + '" placeholder="商品名・メーカー・JANコードで検索">`,
  `<input id="product-search" value="' + esc(salon.query) + '" placeholder="商品名・メーカー・JANコードで検索" autocomplete="off" enterkeyhint="search">`,
  1,
  'identify the salon field as a search input',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `  function renderSalon() {
`,
  `  function renderSalonSearchResults() {
    const selector = salon.view === 'inventory' ? '.wo-inventory-list' : '.wo-product-list'
    const currentResults = root.querySelector(selector)
    const shell = document.createElement('div')
    shell.innerHTML = salon.view === 'inventory' ? inventoryView() : orderView()
    const nextResults = shell.querySelector(selector)
    if (!currentResults || !nextResults) { renderSalon(); return }
    currentResults.replaceWith(nextResults)
  }

  function renderSalon() {
`,
  1,
  'add non-destructive salon result rendering',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    root.addEventListener('input', function (event) {
      if (event.target.id === 'product-search') {
        salon.query = event.target.value
        const cursor = event.target.selectionStart
        renderSalon()
        const input = document.getElementById('product-search')
        input.focus(); input.setSelectionRange(cursor, cursor)
      } else if (event.target.dataset.action === 'quantity-input') {`,
  `    root.addEventListener('compositionstart', function (event) {
      if (event.target.id !== 'product-search') return
      salon.searchComposing = true
    })
    root.addEventListener('compositionend', function (event) {
      if (event.target.id !== 'product-search') return
      salon.searchComposing = false
      salon.query = event.target.value
      renderSalonSearchResults()
    })
    root.addEventListener('input', function (event) {
      if (event.target.id === 'product-search') {
        salon.query = event.target.value
        if (!salon.searchComposing) renderSalonSearchResults()
      } else if (event.target.dataset.action === 'quantity-input') {`,
  1,
  'keep the salon search field mounted during input',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    productSearchTimer: 0,
    pricingQuery:`,
  `    productSearchTimer: 0,
    productSearchComposing: false, /* ${marker} */
    pricingQuery:`,
  1,
  'track dealer product-search composition',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `<input id="dealer-contract-search" value="' + esc(dealer.contractQuery) + '" placeholder="美容室名・店舗コードで検索">`,
  `<input id="dealer-contract-search" value="' + esc(dealer.contractQuery) + '" placeholder="美容室名・店舗コードで検索" autocomplete="off" enterkeyhint="search">`,
  1,
  'identify the contract field as a search input',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `      '<div class="wo-contract-toolbar"><label class="wo-search">' + icon('search') + '<input id="dealer-contract-search" value="' + esc(dealer.contractQuery) + '" placeholder="美容室名・店舗コードで検索" autocomplete="off" enterkeyhint="search"></label></div>' +
      (visible.length ?`,
  `      '<div class="wo-contract-toolbar"><label class="wo-search">' + icon('search') + '<input id="dealer-contract-search" value="' + esc(dealer.contractQuery) + '" placeholder="美容室名・店舗コードで検索" autocomplete="off" enterkeyhint="search"></label></div><div class="wo-contract-results-v641">' +
      (visible.length ?`,
  1,
  'wrap contract search results',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `emptyState('users', '契約美容室はありません', '店舗コードを入力して、取引先の美容室を登録してください。')) + '</section>'`,
  `emptyState('users', '契約美容室はありません', '店舗コードを入力して、取引先の美容室を登録してください。')) + '</div></section>'`,
  1,
  'close the contract result wrapper',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `autocomplete="off"></label><span class="wo-product-result-v628" role="status">' + resultSummary + '</span></div>' +
      (products.length ?`,
  `autocomplete="off" enterkeyhint="search"></label><span class="wo-product-result-v628" role="status">' + resultSummary + '</span></div><div class="wo-product-results-v641">' +
      (products.length ?`,
  1,
  'wrap dealer product results and identify the search input',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `+ pager + '</section>'`,
  `+ pager + '</div></section>'`,
  1,
  'close the dealer product result wrapper',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    return dealerStats() + '<section class="wo-workspace"><header class="wo-workspace-head">`,
  `    return dealerStats() + '<section class="wo-workspace wo-order-management-v641"><header class="wo-workspace-head">`,
  1,
  'identify the dealer order workspace',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `<input id="dealer-order-search" value="' + esc(dealer.query) + '" placeholder="美容室名・発注番号で検索">`,
  `<input id="dealer-order-search" value="' + esc(dealer.query) + '" placeholder="美容室名・発注番号で検索" autocomplete="off" enterkeyhint="search">`,
  1,
  'identify the order field as a search input',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `</label></div>' +
      (orders.length ? '<div class="wo-dealer-orders">`,
  `</label></div><div class="wo-order-results-v641">' +
      (orders.length ? '<div class="wo-dealer-orders">`,
  1,
  'wrap dealer order results',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `emptyState('clipboard', '該当する注文はありません', '条件を変更して確認してください。')) + '</section>'`,
  `emptyState('clipboard', '該当する注文はありません', '条件を変更して確認してください。')) + '</div></section>'`,
  1,
  'close the dealer order result wrapper',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `  function renderDealerPricingResults() {
`,
  `  function renderDealerProductResults() {
    const currentSection = root.querySelector('.wo-product-management')
    if (!currentSection) { renderDealer(); return }

    const shell = document.createElement('div')
    shell.innerHTML = dealerProducts()
    const nextSection = shell.firstElementChild
    const currentResults = currentSection.querySelector('.wo-product-results-v641')
    const nextResults = nextSection?.querySelector('.wo-product-results-v641')
    const currentResult = currentSection.querySelector('.wo-product-result-v628')
    const nextResult = nextSection?.querySelector('.wo-product-result-v628')
    const currentCount = currentSection.querySelector('.wo-count-chip')
    const nextCount = nextSection?.querySelector('.wo-count-chip')

    if (!nextSection || !currentResults || !nextResults || !currentResult || !nextResult) {
      renderDealer()
      return
    }

    currentResults.replaceWith(nextResults)
    currentResult.replaceWith(nextResult)
    if (currentCount && nextCount) currentCount.textContent = nextCount.textContent
    currentSection.removeAttribute('aria-busy')
  }

  function renderDealerLocalSearchResults(kind) {
    const contracts = kind === 'contracts'
    const sectionSelector = contracts ? '.wo-contract-management' : '.wo-order-management-v641'
    const resultsSelector = contracts ? '.wo-contract-results-v641' : '.wo-order-results-v641'
    const currentSection = root.querySelector(sectionSelector)
    const shell = document.createElement('div')
    shell.innerHTML = contracts ? dealerContracts() : dealerOrders()
    const nextSection = shell.querySelector(sectionSelector)
    const currentResults = currentSection?.querySelector(resultsSelector)
    const nextResults = nextSection?.querySelector(resultsSelector)

    if (!currentSection || !nextSection || !currentResults || !nextResults) {
      renderDealer()
      return
    }

    currentResults.replaceWith(nextResults)
    if (contracts) {
      const currentCount = currentSection.querySelector('.wo-count-chip')
      const nextCount = nextSection.querySelector('.wo-count-chip')
      if (currentCount && nextCount) currentCount.textContent = nextCount.textContent
    }
  }

  function renderDealerPricingResults() {
`,
  1,
  'add stable dealer result renderers',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `    if (renderMode === 'pricing-results' && dealer.view === 'pricing') renderDealerPricingResults()
    else renderDealer()`,
  `    if (renderMode === 'pricing-results' && dealer.view === 'pricing') renderDealerPricingResults()
    else if (renderMode === 'product-results' && dealer.view === 'products') renderDealerProductResults()
    else renderDealer()`,
  1,
  'select the product-only renderer after search',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `  function scheduleDealerPricingSearch(input) {
`,
  `  function scheduleDealerProductSearch(input) {
    dealer.productQuery = input.value
    dealer.productPage = 1
    dealer.productLoadId += 1
    syncDealerProductUrl()
    clearTimeout(dealer.productSearchTimer)
    if (dealer.productSearchComposing) return

    const requestedQuery = dealer.productQuery
    dealer.productSearchTimer = setTimeout(async function () {
      if (requestedQuery !== dealer.productQuery || dealer.productSearchComposing) return
      const section = root.querySelector('.wo-product-management')
      const result = section?.querySelector('.wo-product-result-v628')
      const previousResult = result?.textContent || ''
      if (section) section.setAttribute('aria-busy', 'true')
      if (result) result.textContent = '検索中…'
      try {
        await reloadDealer(false, 'product-results')
      } catch (error) {
        section?.removeAttribute('aria-busy')
        if (result?.isConnected) result.textContent = previousResult
        notify(error.message, 'error')
      }
    }, 360)
  }

  function scheduleDealerPricingSearch(input) {
`,
  1,
  'queue an IME-safe dealer product search',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
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
    })`,
  `    root.addEventListener('compositionstart', function (event) {
      if (event.target.id === 'dealer-pricing-search') {
        dealer.pricingSearchComposing = true
        dealer.pricingLoadId += 1
        clearTimeout(dealer.pricingSearchTimer)
      } else if (event.target.id === 'dealer-product-search') {
        dealer.productSearchComposing = true
        dealer.productLoadId += 1
        clearTimeout(dealer.productSearchTimer)
      }
    })
    root.addEventListener('compositionend', function (event) {
      if (event.target.id === 'dealer-pricing-search') {
        dealer.pricingSearchComposing = false
        scheduleDealerPricingSearch(event.target)
      } else if (event.target.id === 'dealer-product-search') {
        dealer.productSearchComposing = false
        scheduleDealerProductSearch(event.target)
      }
    })`,
  1,
  'respect the product and pricing IME lifecycle',
)

const oldProductSearch = `      if (event.target.id === 'dealer-product-search') {
        dealer.productQuery = event.target.value
        dealer.productPage = 1
        dealer.productLoadId += 1
        syncDealerProductUrl()
        const requestedQuery = dealer.productQuery
        const cursor = event.target.selectionStart
        clearTimeout(dealer.productSearchTimer)
        dealer.productSearchTimer = setTimeout(async function () {
          if (requestedQuery !== dealer.productQuery) return
          root.querySelector('.wo-product-management')?.classList.add('is-page-loading-v628')
          try {
            await reloadDealer()
            const input = document.getElementById('dealer-product-search')
            if (input && requestedQuery === dealer.productQuery) {
              input.focus({ preventScroll: true })
              input.setSelectionRange(cursor, cursor)
            }
          } catch (error) {
            root.querySelector('.wo-product-management')?.classList.remove('is-page-loading-v628')
            notify(error.message, 'error')
          }
        }, 260)
        return
      }
`

replaceExact(
  'wholesale-ordering-client-v543.js',
  oldProductSearch,
  `      if (event.target.id === 'dealer-product-search') {
        scheduleDealerProductSearch(event.target)
        return
      }
`,
  1,
  'replace destructive dealer product searching',
)

replaceExact(
  'wholesale-ordering-client-v543.js',
  `      if (searchState) {
        dealer[searchState[0]] = event.target.value
        const cursor = event.target.selectionStart
        renderDealer()
        const input = document.getElementById(searchState[1])
        if (input) { input.focus(); input.setSelectionRange(cursor, cursor) }
      }`,
  `      if (searchState) {
        dealer[searchState[0]] = event.target.value
        renderDealerLocalSearchResults(searchState[1] === 'dealer-order-search' ? 'orders' : 'contracts')
      }`,
  1,
  'keep local dealer search fields mounted',
)

const readinessAnchor = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Style-List-Performance', 'v640') /* style-list-performance-v640-ready */"
replaceExact(
  'server.js',
  readinessAnchor,
  `${readinessAnchor}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Search-Input-Stability', 'v641') /* ${marker}-ready */`,
  1,
  'publish the search input stability readiness marker',
)

fs.writeFileSync('/tmp/search-input-stability-v641-changes.json', JSON.stringify(changes))
console.log(JSON.stringify({ release: marker, modified: [...new Set(changes.map(change => change.file))] }))
