import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/search-input-stability-v641/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const client = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-v543.css'), 'utf8')
fs.mkdirSync(output, { recursive: true })

const contractId = 'contract-v641'
const catalog = [
  { id:'product-aujua', active:true, manufacturerName:'ミルボン', name:'オージュア リペアリティ トリートメント', category:'ヘアケア', productCode:'AUA-001', janCode:'4954835111111', wholesalePrice:4000, suggestedRetailPrice:5000, listPrice:5000, orderUnit:1, description:'' },
  { id:'product-orimia', active:true, manufacturerName:'オリミア', name:'スカルプ シャンプー', category:'シャンプー', productCode:'ORI-002', janCode:'4954835222222', wholesalePrice:2500, suggestedRetailPrice:3200, listPrice:3200, orderUnit:1, description:'' },
  { id:'product-suncall', active:true, manufacturerName:'サンコール', name:'キートス ヘアクリーム', category:'スタイリング', productCode:'SUN-003', janCode:'4954835333333', wholesalePrice:2100, suggestedRetailPrice:2800, listPrice:2800, orderUnit:1, description:'' },
]
const contracts = [
  { id:contractId, dealerId:'dealer-v641', dealerName:'検証ディーラー', dealerCode:'DLR-V641', status:'ACTIVE', organizationName:'サロン ド リアン', publicCode:'LIEN-V641', customerCode:'CUSTOMER-V641', phone:'086-111-2222', prefecture:'岡山県', city:'岡山市' },
  { id:'contract-blue', dealerId:'dealer-v641', dealerName:'検証ディーラー', dealerCode:'DLR-V641', status:'ACTIVE', organizationName:'青空美容室', publicCode:'AOZORA-V641', customerCode:'CUSTOMER-BLUE', phone:'086-333-4444', prefecture:'岡山県', city:'倉敷市' },
]
const orders = [
  { id:'order-lien', orderNo:'PO-V641-001', organizationName:'サロン ド リアン', deliveryNo:'DN-V641-001', status:'ORDERED', orderedAt:'2026-09-14T01:00:00.000Z', totalYen:5500, lineCount:2, totalQuantity:2 },
  { id:'order-blue', orderNo:'PO-V641-002', organizationName:'青空美容室', deliveryNo:'DN-V641-002', status:'SHIPPED', orderedAt:'2026-09-14T02:00:00.000Z', totalYen:2800, lineCount:1, totalQuantity:1 },
]
const requests = []

function matches(product, query) {
  const needle = query.trim().toLocaleLowerCase('ja')
  return !needle || [product.manufacturerName, product.name, product.category, product.productCode, product.janCode]
    .join(' ').toLocaleLowerCase('ja').includes(needle)
}

function dealerBootstrap(url) {
  const view = url.searchParams.get('view') || ''
  const productQuery = url.searchParams.get('productSearch') || ''
  const pricingQuery = url.searchParams.get('pricingSearch') || ''
  const query = view === 'products' ? productQuery : view === 'pricing' ? pricingQuery : ''
  const products = catalog.filter(product => matches(product, query))
  const productPagination = view === 'products'
    ? { page:1, pageSize:30, totalCount:products.length, totalPages:1, query:productQuery }
    : null
  const pricingPagination = view === 'pricing'
    ? { page:1, pageSize:30, totalCount:products.length, totalPages:1, totalProductCount:catalog.length, configuredCount:catalog.length, query:pricingQuery, contractId }
    : null
  return {
    ok:true,
    dealer:{ id:'dealer-v641', name:'検証ディーラー', dealerCode:'DLR-V641' },
    contracts,
    products,
    contractProductPrices:catalog.map(product => ({ contractId, dealerProductId:product.id, discountRate:20 })),
    orders,
    productPagination,
    pricingPagination,
  }
}

function salonBootstrap() {
  const catalogProducts = catalog.map(product => ({
    ...product,
    dealerId:'dealer-v641',
    dealerName:'検証ディーラー',
    dealerProductId:product.id,
    discountRate:20,
    unitPrice:Math.round(product.listPrice * 0.8),
    stockQuantity:5,
  }))
  return {
    ok:true,
    actor:{ role:'ADMIN', displayName:'検証スタッフ' },
    organization:{ id:'salon-v641', name:'サロン ド リアン', taxRate:10 },
    contracts:[contracts[0]],
    products:catalogProducts,
    catalogProducts,
    orders:[],
    selectedDealerId:'all',
  }
}

function html(kind, view) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wholesale-ordering-v543.css"></head><body class="wo-body ${kind === 'dealer' ? 'wo-dealer-body' : 'wo-admin-body'}" data-wholesale-page="${kind}" ${kind === 'dealer' ? `data-dealer-view="${view}"` : ''}><main class="wo-main"><div id="wholesale-app" class="wo-app-root"></div></main><script src="/wholesale-ordering-client-v543.js"></script></body></html>`
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const dealerRoute = { '/dealer/products':'products', '/dealer/orders':'orders', '/dealer/salons':'salons', '/dealer/pricing':'pricing' }[url.pathname]
  if (dealerRoute) {
    res.writeHead(200, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' })
    res.end(html('dealer', dealerRoute))
    return
  }
  if (url.pathname === '/admin/inventory-orders') {
    res.writeHead(200, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' })
    res.end(html('salon', ''))
    return
  }
  if (url.pathname === '/wholesale-ordering-client-v543.js') {
    res.writeHead(200, { 'content-type':'application/javascript; charset=utf-8' })
    res.end(client)
    return
  }
  if (url.pathname === '/wholesale-ordering-v543.css') {
    res.writeHead(200, { 'content-type':'text/css; charset=utf-8' })
    res.end(css)
    return
  }
  if (url.pathname === '/api/dealer/bootstrap') {
    const view = url.searchParams.get('view') || 'local'
    const query = url.searchParams.get('productSearch') || url.searchParams.get('pricingSearch') || ''
    requests.push({ scope:view, query, at:Date.now() })
    const payload = JSON.stringify(dealerBootstrap(url))
    const delay = query === 'ミルボン' ? 900 : query ? 60 : 10
    setTimeout(() => {
      res.writeHead(200, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' })
      res.end(payload)
    }, delay)
    return
  }
  if (url.pathname === '/api/admin/wholesale/bootstrap') {
    requests.push({ scope:'salon', query:'', at:Date.now() })
    res.writeHead(200, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' })
    res.end(JSON.stringify(salonBootstrap()))
    return
  }
  res.writeHead(404)
  res.end('not found')
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const address = server.address()
const base = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch({ executablePath, headless:true })
const results = []

function watch(page) {
  const errors = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('404')) errors.push('console: ' + message.text())
  })
  return errors
}

async function beginComposition(page, selector, interim) {
  await page.evaluate(({ selector, interim }) => {
    const field = document.querySelector(selector)
    window.__v641Input = field
    window.__v641Section = field.closest('.wo-workspace')
    field.focus()
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles:true, data:'' }))
    field.value = interim
    field.dispatchEvent(new InputEvent('input', { bubbles:true, data:interim, inputType:'insertCompositionText', isComposing:true }))
  }, { selector, interim })
}

async function endComposition(page, selector, value) {
  await page.evaluate(({ selector, value }) => {
    const field = document.querySelector(selector)
    field.value = value
    field.dispatchEvent(new CompositionEvent('compositionend', { bubbles:true, data:value }))
    field.dispatchEvent(new InputEvent('input', { bubbles:true, data:value, inputType:'insertText', isComposing:false }))
  }, { selector, value })
}

async function stableState(page, selector) {
  return page.evaluate(selector => {
    const field = document.querySelector(selector)
    return {
      value:field?.value,
      sameInput:window.__v641Input === field,
      sameSection:window.__v641Section === field?.closest('.wo-workspace'),
      focused:document.activeElement === field,
      viewport:document.documentElement.clientWidth,
      documentWidth:document.documentElement.scrollWidth,
    }
  }, selector)
}

async function verifyProductSearch(width) {
  const context = await browser.newContext({ viewport:{ width, height:900 }, deviceScaleFactor:1 })
  const page = await context.newPage()
  const errors = watch(page)
  await page.goto(base + '/dealer/products', { waitUntil:'domcontentloaded' })
  const input = page.locator('#dealer-product-search')
  await input.waitFor({ state:'visible' })
  await page.locator('.wo-catalog-table article').first().waitFor({ state:'visible' })
  const initialRequests = requests.filter(item => item.scope === 'products').length

  await beginComposition(page, '#dealer-product-search', 'お')
  await page.waitForTimeout(650)
  assert.equal(requests.filter(item => item.scope === 'products').length, initialRequests, width + ': product search ran during composition')
  assert.deepEqual(await stableState(page, '#dealer-product-search'), {
    value:'お', sameInput:true, sameSection:true, focused:true, viewport:width, documentWidth:width,
  })

  const katakanaResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/dealer/bootstrap' && url.searchParams.get('productSearch') === 'オージュア'
  })
  await endComposition(page, '#dealer-product-search', 'オージュア')
  await katakanaResponse
  await page.waitForFunction(() => document.querySelectorAll('.wo-catalog-table article').length === 1)
  let state = await stableState(page, '#dealer-product-search')
  assert.equal(state.value, 'オージュア')
  assert.equal(state.sameInput, true)
  assert.equal(state.sameSection, true)
  assert.equal(state.focused, true)
  assert.ok(state.documentWidth <= state.viewport + 2)
  assert.match(await page.locator('.wo-catalog-table').textContent(), /オージュア/)
  assert.equal(requests.slice(initialRequests).filter(item => item.scope === 'products' && item.query === 'オージュア').length, 1)

  const slowRequest = page.waitForRequest(request => new URL(request.url()).searchParams.get('productSearch') === 'ミルボン')
  await input.fill('ミルボン')
  await slowRequest
  const fastResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('productSearch') === 'サンコール')
  await input.fill('サンコール')
  await fastResponse
  await page.waitForFunction(() => document.querySelector('.wo-catalog-table')?.textContent.includes('キートス'))
  await page.waitForTimeout(750)
  state = await stableState(page, '#dealer-product-search')
  assert.equal(state.value, 'サンコール')
  assert.match(await page.locator('.wo-catalog-table').textContent(), /キートス/)
  assert.doesNotMatch(await page.locator('.wo-catalog-table').textContent(), /オージュア/)
  assert.equal(state.sameInput, true)
  assert.deepEqual(errors, [])
  await page.screenshot({ path:path.join(output, 'dealer-products-' + width + '.png'), fullPage:true })
  results.push({ scope:'dealer-products', width, katakana:true, sameInput:true, staleResponseRejected:true })
  await context.close()
}

async function verifyLocalSearch(width, config) {
  const context = await browser.newContext({ viewport:{ width, height:900 }, deviceScaleFactor:1 })
  const page = await context.newPage()
  const errors = watch(page)
  const requestsBefore = requests.length
  await page.goto(base + config.pathname, { waitUntil:'domcontentloaded' })
  await page.locator(config.selector).waitFor({ state:'visible' })
  const requestsAfterLoad = requests.length
  assert.ok(requestsAfterLoad > requestsBefore)
  await beginComposition(page, config.selector, config.interim)
  await endComposition(page, config.selector, config.query)
  await page.waitForFunction(({ resultSelector, expected }) => {
    const result = document.querySelector(resultSelector)
    return result && result.textContent.includes(expected)
  }, { resultSelector:config.resultSelector, expected:config.expected })
  const state = await stableState(page, config.selector)
  assert.equal(state.value, config.query)
  assert.equal(state.sameInput, true, config.scope + ': input was replaced')
  assert.equal(state.sameSection, true, config.scope + ': workspace was replaced')
  assert.equal(state.focused, true, config.scope + ': input lost focus')
  assert.ok(state.documentWidth <= state.viewport + 2, config.scope + ': horizontal overflow')
  assert.equal(await page.locator(config.rowSelector).count(), 1)
  assert.equal(requests.length, requestsAfterLoad, config.scope + ': local search unexpectedly requested the server')
  assert.deepEqual(errors, [])
  results.push({ scope:config.scope, width, sameInput:true, rows:1 })
  await context.close()
}

async function verifyPricingSearch(width) {
  const context = await browser.newContext({ viewport:{ width, height:900 }, deviceScaleFactor:1 })
  const page = await context.newPage()
  const errors = watch(page)
  await page.goto(base + '/dealer/pricing', { waitUntil:'domcontentloaded' })
  await page.locator('#dealer-pricing-search').waitFor({ state:'visible' })
  const initialRequests = requests.filter(item => item.scope === 'pricing').length
  await beginComposition(page, '#dealer-pricing-search', 'お')
  await page.waitForTimeout(650)
  assert.equal(requests.filter(item => item.scope === 'pricing').length, initialRequests)
  const response = page.waitForResponse(candidate => new URL(candidate.url()).searchParams.get('pricingSearch') === 'オージュア')
  await endComposition(page, '#dealer-pricing-search', 'オージュア')
  await response
  await page.waitForFunction(() => document.querySelectorAll('[data-pricing-row]').length === 1)
  const state = await stableState(page, '#dealer-pricing-search')
  assert.equal(state.value, 'オージュア')
  assert.equal(state.sameInput, true)
  assert.equal(state.sameSection, true)
  assert.equal(state.focused, true)
  assert.deepEqual(errors, [])
  results.push({ scope:'dealer-pricing', width, previousFixPreserved:true })
  await context.close()
}

try {
  for (const width of [390, 1440]) {
    await verifyProductSearch(width)
    await verifyPricingSearch(width)
    await verifyLocalSearch(width, {
      scope:'dealer-orders', pathname:'/dealer/orders', selector:'#dealer-order-search', interim:'さ', query:'サロン ド リアン',
      resultSelector:'.wo-order-results-v641', rowSelector:'.wo-dealer-order-row', expected:'PO-V641-001',
    })
    await verifyLocalSearch(width, {
      scope:'dealer-contracts', pathname:'/dealer/salons', selector:'#dealer-contract-search', interim:'さ', query:'サロン ド リアン',
      resultSelector:'.wo-contract-results-v641', rowSelector:'.wo-contract-table article', expected:'LIEN-V641',
    })
    await verifyLocalSearch(width, {
      scope:'salon-order-products', pathname:'/admin/inventory-orders', selector:'#product-search', interim:'お', query:'オージュア',
      resultSelector:'.wo-product-list', rowSelector:'.wo-product-list article', expected:'オージュア',
    })
    await verifyLocalSearch(width, {
      scope:'salon-inventory-products', pathname:'/admin/inventory-orders?view=inventory', selector:'#product-search', interim:'さ', query:'サンコール',
      resultSelector:'.wo-inventory-list', rowSelector:'.wo-inventory-row', expected:'キートス',
    })
  }
  console.log(JSON.stringify({ release:'search-input-stability-v641', browserVerified:true, results }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
