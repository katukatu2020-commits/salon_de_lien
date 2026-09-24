import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'dealer-product-search-filters-v659')
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/chromium')
const client = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-client-v543.js'), 'utf8')
const baseCss = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-v543.css'), 'utf8')
const mobileCss = fs.readFileSync(path.join(runtimeRoot, 'public', 'mobile-workspaces-v657.css'), 'utf8')
const calendarCss = fs.readFileSync(path.join(runtimeRoot, 'public', 'dealer-monthly-calendar-v658.css'), 'utf8')
fs.mkdirSync(output, { recursive:true })

const products = Array.from({ length:36 }, (_, index) => {
  const number = index + 1
  return {
    id:'product-' + String(number).padStart(3, '0'),
    manufacturerName:number <= 20 ? 'ミルボン' : 'サンコール',
    name:number === 1 ? 'ｵﾙﾃﾞｨｰﾌﾞ ｱﾃﾞｨｸｼｰ 5-GrayPearl' : number === 2 ? 'オルディーブ ボーテ 7-NB' : '検証商品 ' + String(number).padStart(3, '0'),
    category:number <= 12 ? 'カラー' : number <= 24 ? 'ヘアケア' : 'スタイリング',
    productCode:'V659-P' + String(number).padStart(4, '0'),
    janCode:String(6590000000000 + number),
    wholesalePrice:800 + number,
    suggestedRetailPrice:1200 + number,
    listPrice:1200 + number,
    orderUnit:1,
    description:'',
    active:true,
  }
})

const savedPricing = new Map(products.slice(0, 6).map((product, index) => [product.id, 10 + index]))

function normalizeSearch(value) {
  return String(value || '').normalize('NFKC').replace(/[\s　]+/g, ' ').trim().toLocaleLowerCase('ja')
}

function filteredProducts(url, kind) {
  const prefix = kind === 'products' ? 'product' : 'pricing'
  const search = normalizeSearch(url.searchParams.get(prefix + 'Search'))
  const manufacturer = url.searchParams.get(prefix + 'Manufacturer') || ''
  const category = url.searchParams.get(prefix + 'Category') || ''
  return products.filter(product => {
    const haystack = normalizeSearch([product.manufacturerName, product.name, product.category, product.productCode, product.janCode].join(' '))
    return (!search || haystack.includes(search)) && (!manufacturer || product.manufacturerName === manufacturer) && (!category || product.category === category)
  })
}

function bootstrapPayload(url) {
  const kind = url.searchParams.get('view') === 'products' ? 'products' : 'pricing'
  const pageParam = kind === 'products' ? 'productPage' : 'pricingPage'
  const searchParam = kind === 'products' ? 'productSearch' : 'pricingSearch'
  const manufacturerParam = kind === 'products' ? 'productManufacturer' : 'pricingManufacturer'
  const categoryParam = kind === 'products' ? 'productCategory' : 'pricingCategory'
  const filtered = filteredProducts(url, kind)
  const pageSize = 30
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const requestedPage = Math.max(1, Number.parseInt(url.searchParams.get(pageParam) || '1', 10) || 1)
  const page = Math.min(requestedPage, totalPages)
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const pagination = {
    page,
    pageSize,
    totalCount:filtered.length,
    totalPages,
    query:url.searchParams.get(searchParam) || '',
    manufacturer:url.searchParams.get(manufacturerParam) || '',
    category:url.searchParams.get(categoryParam) || '',
  }
  return {
    ok:true,
    dealer:{ id:'dealer-v659', name:'スーパーヤマモト', loginId:'yamamoto', dealerCode:'DLR-YAMAMOTO' },
    contracts:[{ id:'contract-v659', status:'ACTIVE', organizationId:'salon-v659', organizationName:'Salon de Lien', publicCode:'LIEN' }],
    products:visible,
    productPagination:kind === 'products' ? pagination : null,
    pricingPagination:kind === 'pricing' ? { ...pagination, totalProductCount:products.length, configuredCount:savedPricing.size, contractId:'contract-v659' } : null,
    productFilters:{ manufacturers:['ミルボン', 'サンコール'], categories:['カラー', 'スタイリング', 'ヘアケア'] },
    contractProductPrices:kind === 'pricing' ? visible.filter(product => savedPricing.has(product.id)).map(product => ({ id:'price-' + product.id, contractId:'contract-v659', dealerProductId:product.id, discountRate:savedPricing.get(product.id) })) : [],
    orders:[],
  }
}

function icon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/></svg>'
}

const nav = [
  ['calendar', '月次売上'], ['orders', '受注管理'], ['salons', '契約美容室'], ['products', '商品管理'],
  ['pricing', '契約価格'], ['company', '会社情報'], ['password-change', 'パスワード'],
]

function shell(view) {
  const labels = view === 'products'
    ? { title:'商品管理', eyebrow:'DEALER CATALOG', description:'美容室へ提供する商品、JANコード、定価、発注単位を管理します。' }
    : { title:'契約価格', eyebrow:'CONTRACT PRICING', description:'美容室ごとに、取扱商品と定価からの割引率を一括管理します。' }
  const navMarkup = nav.map(([route, label]) => '<a class="' + (route === view ? 'active' : '') + '" href="/dealer/' + route + '">' + icon() + '<span>' + label + '</span></a>').join('')
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/wholesale-ordering-v543.css"><link rel="stylesheet" href="/mobile-workspaces-v657.css"><link rel="stylesheet" href="/dealer-monthly-calendar-v658.css"></head><body class="wo-body wo-dealer-body" data-wholesale-page="dealer" data-dealer-view="' + view + '"><div class="wo-dealer-layout"><aside class="wo-dealer-sidebar"><a class="wo-brand" href="/dealer/' + view + '"><span><strong>ORIMIA Partner</strong><small>Dealer operations</small></span></a><nav>' + navMarkup + '</nav></aside><div class="wo-dealer-stage"><header class="wo-dealer-topbar"><div><small>DEALER PORTAL</small><strong>' + labels.title + '</strong></div><span>スーパーヤマモト</span></header><main class="wo-main"><section class="wo-page-head"><div><p class="wo-eyebrow">' + labels.eyebrow + '</p><h1>' + labels.title + '</h1><p>' + labels.description + '</p></div></section><div id="wholesale-app" class="wo-app-root"><div class="wo-loading"><span></span><p>管理情報を読み込んでいます</p></div></div></main></div></div><nav class="wo-dealer-mobile-nav">' + navMarkup + '</nav><script src="/wholesale-ordering-client-v543.js"></script></body></html>'
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const pageMatch = url.pathname.match(/^\/dealer\/(products|pricing)$/)
  if (pageMatch) {
    res.writeHead(200, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' })
    res.end(shell(pageMatch[1]))
    return
  }
  const assets = {
    '/wholesale-ordering-client-v543.js':['application/javascript; charset=utf-8', client],
    '/wholesale-ordering-v543.css':['text/css; charset=utf-8', baseCss],
    '/mobile-workspaces-v657.css':['text/css; charset=utf-8', mobileCss],
    '/dealer-monthly-calendar-v658.css':['text/css; charset=utf-8', calendarCss],
  }
  if (assets[url.pathname]) {
    res.writeHead(200, { 'content-type':assets[url.pathname][0] })
    res.end(assets[url.pathname][1])
    return
  }
  if (url.pathname === '/api/dealer/bootstrap') {
    res.writeHead(200, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' })
    res.end(JSON.stringify(bootstrapPayload(url)))
    return
  }
  if (url.pathname === '/api/dealer/contracts/contract-v659/product-pricing' && req.method === 'POST') {
    const body = await readJson(req)
    for (const item of body.items || []) {
      if (item.enabled) savedPricing.set(item.dealerProductId, Number(item.discountRate || 0))
      else savedPricing.delete(item.dealerProductId)
    }
    res.writeHead(200, { 'content-type':'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok:true, configuredCount:savedPricing.size }))
    return
  }
  res.writeHead(404)
  res.end('not found')
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})

const baseUrl = 'http://127.0.0.1:' + server.address().port
const browser = await chromium.launch({ executablePath, headless:true })
const results = []

function watchErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push('console: ' + message.text())
  })
  page.on('response', response => {
    if (response.status() >= 400) errors.push(response.status() + ' ' + new URL(response.url()).pathname)
  })
  return errors
}

async function assertNoOverflow(page, label) {
  const layout = await page.evaluate(() => ({ viewport:document.documentElement.clientWidth, documentWidth:document.documentElement.scrollWidth }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, label + ' has horizontal overflow')
  return layout
}

try {
  for (const viewport of [
    { name:'desktop', width:1440, height:960 },
    { name:'phone-390', width:390, height:844 },
  ]) {
    savedPricing.clear()
    products.slice(0, 6).forEach((product, index) => savedPricing.set(product.id, 10 + index))
    const context = await browser.newContext({ viewport:{ width:viewport.width, height:viewport.height }, deviceScaleFactor:1 })
    const page = await context.newPage()
    const errors = watchErrors(page)
    let documentRequests = 0
    const bootstrapRequests = []
    page.on('request', request => { if (request.resourceType() === 'document') documentRequests += 1 })
    page.on('request', request => {
      const requestUrl = new URL(request.url())
      if (requestUrl.pathname === '/api/dealer/bootstrap') bootstrapRequests.push(requestUrl.search)
    })

    await page.goto(baseUrl + '/dealer/products', { waitUntil:'networkidle' })
    await page.locator('.wo-product-management').waitFor({ state:'visible' })
    assert.equal(await page.locator('.wo-catalog-table article').count(), 30)
    assert.equal(await page.locator('#dealer-product-manufacturer-filter option').count(), 3)
    assert.equal(await page.locator('#dealer-product-category-filter option').count(), 4)

    const productSearchResponse = page.waitForResponse(response => {
      const requestUrl = new URL(response.url())
      return requestUrl.pathname === '/api/dealer/bootstrap' && requestUrl.searchParams.get('productSearch') === 'オルディーブ'
    })
    await page.locator('#dealer-product-search').fill('オルディーブ')
    await productSearchResponse
    await page.waitForFunction(() => document.querySelectorAll('.wo-catalog-table article').length === 2)
    assert.match(await page.locator('.wo-catalog-table').textContent(), /ｵﾙﾃﾞｨｰﾌﾞ/)

    const productFilterResponse = page.waitForResponse(response => {
      const requestUrl = new URL(response.url())
      return requestUrl.pathname === '/api/dealer/bootstrap' && requestUrl.searchParams.get('productManufacturer') === 'ミルボン' && requestUrl.searchParams.get('productCategory') === 'カラー'
    })
    await page.locator('#dealer-product-manufacturer-filter').selectOption('ミルボン')
    await page.locator('#dealer-product-category-filter').selectOption('カラー')
    await productFilterResponse
    assert.match(page.url(), /productManufacturer=/)
    assert.match(page.url(), /productCategory=/)
    assert.equal(documentRequests, 1, viewport.name + ': product filters caused document navigation')
    const productLayout = await assertNoOverflow(page, viewport.name + ' products')
    await page.screenshot({ path:path.join(output, viewport.name + '-products.png'), fullPage:viewport.width >= 768 })

    await page.goto(baseUrl + '/dealer/pricing', { waitUntil:'networkidle' })
    await page.locator('.wo-pricing-management').waitFor({ state:'visible' })
    assert.equal(await page.locator('[data-pricing-row]').count(), 30)
    assert.equal(await page.locator('[data-pricing-selected]').count(), 30)
    assert.equal(await page.locator('[data-pricing-enabled]').count(), 30)
    const initiallyPublished = await page.locator('[data-pricing-enabled]:checked').count()
    assert.equal(initiallyPublished, 6)

    await page.locator('[data-action="select-visible-pricing"]').click()
    assert.equal(await page.locator('[data-pricing-selected]:checked').count(), 30)
    assert.equal(await page.locator('[data-pricing-enabled]:checked').count(), initiallyPublished, 'bulk selection changed publication state')
    assert.match(await page.locator('.wo-pricing-selection-count-v659').textContent(), /30件/)

    const nextPricingButton = page.locator('[data-action="dealer-pricing-page"][data-page="2"]')
    const secondPageResponse = page.waitForResponse(response => {
      const requestUrl = new URL(response.url())
      return requestUrl.pathname === '/api/dealer/bootstrap' && requestUrl.searchParams.get('pricingPage') === '2'
    }, { timeout:15000 })
    try {
      await Promise.all([secondPageResponse, nextPricingButton.click()])
    } catch (error) {
      error.message += '\n' + viewport.name + ' bootstrap requests: ' + bootstrapRequests.join(' | ')
      throw error
    }
    await page.waitForFunction(() => document.querySelectorAll('[data-pricing-row]').length === 6)
    assert.match(await page.locator('.wo-pricing-selection-count-v659').textContent(), /30件/)
    await page.locator('[data-action="select-visible-pricing"]').click()
    assert.match(await page.locator('.wo-pricing-selection-count-v659').textContent(), /36件/)

    await page.locator('#dealer-pricing-bulk-rate').fill('25')
    await page.locator('[data-action="apply-bulk-rate"]').click()
    await page.waitForFunction(() => document.querySelector('.wo-pricing-save')?.textContent.includes('36件'))
    const saveRequestPromise = page.waitForRequest(request => request.url().includes('/product-pricing') && request.method() === 'POST')
    await page.locator('[data-action="save-contract-pricing"]').click()
    const saveRequest = await saveRequestPromise
    const submitted = saveRequest.postDataJSON()
    assert.equal(submitted.items.length, 36)
    assert.ok(submitted.items.every(item => item.enabled && Number(item.discountRate) === 25))
    await page.waitForFunction(() => document.querySelector('.wo-pricing-selection-count-v659')?.textContent.includes('0件'))

    const pricingSearchResponse = page.waitForResponse(response => {
      const requestUrl = new URL(response.url())
      return requestUrl.pathname === '/api/dealer/bootstrap' && requestUrl.searchParams.get('pricingSearch') === 'オルディーブ'
    })
    await page.locator('#dealer-pricing-search').fill('オルディーブ')
    await pricingSearchResponse
    await page.waitForFunction(() => document.querySelectorAll('[data-pricing-row]').length === 2)
    assert.match(await page.locator('.wo-pricing-table').textContent(), /ｵﾙﾃﾞｨｰﾌﾞ/)

    const pricingFilterResponse = page.waitForResponse(response => {
      const requestUrl = new URL(response.url())
      return requestUrl.pathname === '/api/dealer/bootstrap' && requestUrl.searchParams.get('pricingManufacturer') === 'ミルボン' && requestUrl.searchParams.get('pricingCategory') === 'カラー'
    })
    await page.locator('#dealer-pricing-manufacturer-filter').selectOption('ミルボン')
    await page.locator('#dealer-pricing-category-filter').selectOption('カラー')
    await pricingFilterResponse
    assert.equal(documentRequests, 2, viewport.name + ': pricing filters caused document navigation')
    const pricingLayout = await assertNoOverflow(page, viewport.name + ' pricing')
    await page.screenshot({ path:path.join(output, viewport.name + '-pricing.png'), fullPage:viewport.width >= 768 })

    assert.deepEqual(errors, [], viewport.name + ': ' + errors.join(' | '))
    results.push({ viewport:viewport.name, productLayout, pricingLayout, normalizedSearch:true, bulkSelection:36, documentRequests })
    await context.close()
  }
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}

console.log(JSON.stringify({ release:'dealer-product-search-filters-v659', passed:true, results, screenshots:output }, null, 2))
