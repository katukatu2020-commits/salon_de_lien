import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3628').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/list-pagination-performance-v628/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const dealerLoginId = 'dealer.pagination.v628'
const dealerPassword = 'DealerPaginationV628!'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => {
    if (!/Minified React error #(329|418|423)/.test(error.message)) errors.push('page: ' + error.message)
  })
  page.on('console', message => {
    if (message.type() === 'error' &&
        !message.text().includes('Failed to load resource: the server responded with a status of 404') &&
        !message.text().includes('net::ERR_NAME_NOT_RESOLVED')) errors.push('console: ' + message.text())
  })
  return errors
}

async function loginDealer(context) {
  const response = await context.request.post(base + '/api/dealer/auth/login', {
    headers: { Origin: base },
    form: { loginId: dealerLoginId, password: dealerPassword, next: '/dealer/products' },
    maxRedirects: 0,
  })
  assert.ok([302, 303].includes(response.status()), 'Dealer login failed with ' + response.status())
}

async function loginStaff(context) {
  const response = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(response.ok(), 'Staff login failed with ' + response.status())
}

async function verifyDealer(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await loginDealer(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  const bootstrapPayloads = []
  page.on('response', async response => {
    if (!response.url().includes('/api/dealer/bootstrap') || response.status() !== 200) return
    try { bootstrapPayloads.push({ url: response.url(), payload: await response.json() }) } catch {}
  })

  await page.goto(base + '/dealer/products?verify=v628-' + width, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const rows = page.locator('.wo-catalog-table article')
  await rows.first().waitFor({ state: 'visible', timeout: 20_000 })
  assert.equal(await rows.count(), 30, width + ': first product page did not render exactly 30 rows')
  assert.equal(await page.locator('[data-action="edit-product"]').count(), 30, width + ': edit controls disappeared')
  await page.waitForFunction(() => document.querySelector('.wo-product-result-v628')?.textContent.includes('全67件'))
  assert.ok(bootstrapPayloads.length >= 1, width + ': product bootstrap was not observed')
  const initial = bootstrapPayloads.at(-1)
  assert.equal(new URL(initial.url).searchParams.get('view'), 'products')
  assert.equal(initial.payload.products.length, 30)
  assert.equal(initial.payload.productPagination.pageSize, 30)
  assert.equal(initial.payload.productPagination.totalCount, 67)
  assert.equal(initial.payload.orders.length, 0, 'Product page received unused order rows')
  assert.equal(initial.payload.contractProductPrices.length, 0, 'Product page received unused pricing rows')
  const initialLayout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    productRows: document.querySelectorAll('.wo-catalog-table article').length,
    productSectionNodes: document.querySelector('.wo-product-management')?.querySelectorAll('*').length || 0,
  }))
  assert.equal(initialLayout.productRows, 30)
  assert.ok(initialLayout.documentWidth <= initialLayout.viewport + 2, width + ': initial dealer product page has horizontal overflow')
  assert.ok(initialLayout.productSectionNodes < 900, width + ': initial dealer product DOM is unexpectedly large ' + JSON.stringify(initialLayout))

  await page.evaluate(() => { window.__v628DocumentMarker = 'same-document' })
  const secondResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/dealer/bootstrap' && url.searchParams.get('productPage') === '2' && response.status() === 200
  })
  await page.locator('[data-action="dealer-product-page"][data-page="2"]').click()
  const secondPayload = await (await secondResponse).json()
  await page.waitForFunction(() => document.querySelector('.wo-list-pager-v628 strong')?.textContent.includes('2 / 3'))
  assert.equal(secondPayload.products.length, 30)
  assert.equal(await rows.count(), 30)
  assert.equal(await page.evaluate(() => window.__v628DocumentMarker), 'same-document', 'Pagination caused a document navigation')
  assert.equal(new URL(page.url()).searchParams.get('productPage'), '2')

  const thirdResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/dealer/bootstrap' && url.searchParams.get('productPage') === '3' && response.status() === 200
  })
  await page.locator('[data-action="dealer-product-page"][data-page="3"]').click()
  const thirdPayload = await (await thirdResponse).json()
  assert.equal(thirdPayload.products.length, 7)
  await page.waitForFunction(() => document.querySelectorAll('.wo-catalog-table article').length === 7)

  const searchResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/dealer/bootstrap' && url.searchParams.get('productSearch') === '商品 067' && response.status() === 200
  })
  await page.locator('#dealer-product-search').fill('商品 067')
  const searchPayload = await (await searchResponse).json()
  await page.waitForFunction(() => document.querySelectorAll('.wo-catalog-table article').length === 1)
  assert.equal(searchPayload.productPagination.totalCount, 1)
  assert.equal(searchPayload.products[0].productCode, 'V628-P0067')
  assert.equal(new URL(page.url()).searchParams.get('productSearch'), '商品 067')
  assert.equal(new URL(page.url()).searchParams.has('productPage'), false)

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    productRows: document.querySelectorAll('.wo-catalog-table article').length,
    productSectionNodes: document.querySelector('.wo-product-management')?.querySelectorAll('*').length || 0,
  }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, width + ': dealer product page has horizontal overflow')
  assert.ok(layout.productSectionNodes < 500, width + ': dealer product DOM is unexpectedly large')
  assert.deepEqual(errors, [], width + ': unexpected dealer browser errors')
  await page.screenshot({ path: path.join(output, 'dealer-products-' + width + '.png'), fullPage: true })
  results.push({ scope: 'dealer-' + width, initialLayout, filteredLayout: layout, pageSize: 30, totalCount: initial.payload.productPagination.totalCount })
  await context.close()
}

async function verifyStyles(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await loginStaff(context)
  await context.request.get(base + '/admin/community?warm=v628')
  const page = await context.newPage()
  const errors = collectErrors(page)
  const startedAt = Date.now()
  let latestPayload = null
  page.on('response', async response => {
    if (!response.url().includes('/api/lien-style-admin-v618') || response.status() !== 200) return
    try { latestPayload = await response.json() } catch {}
  })
  await page.goto(base + '/admin/community?verify=v628-' + width, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const root = page.locator('.orimia-style-admin-v618')
  await root.waitFor({ state: 'visible', timeout: 20_000 })
  const cards = root.locator('.orimia-admin-style-card-v618')
  await cards.first().waitFor({ state: 'visible', timeout: 20_000 })
  const mountedMs = Date.now() - startedAt
  assert.ok(mountedMs < 2800, width + ': paginated style list still waits for the legacy three-second delay (' + mountedMs + 'ms)')
  assert.ok(latestPayload, width + ': style API response was not observed')
  assert.equal(latestPayload.pageSize, 20)
  assert.equal(latestPayload.posts.length, 20)
  assert.equal(await cards.count(), 20, width + ': style list rendered more than one page')
  assert.ok(latestPayload.totalCount >= 47, width + ': style fixtures were not included')
  await page.waitForFunction(() => document.querySelectorAll('[data-orimia-style-visibility-v625]').length >= 20)
  assert.equal(await root.locator('[data-orimia-style-visibility-v625]').count(), 20, width + ': publication controls disappeared')
  assert.equal(await root.locator('[data-orimia-style-delete-v625]').count(), 20, width + ': delete controls disappeared')

  const imageLoading = await root.locator('.orimia-admin-style-card-v618 .orimia-admin-style-image-v618 > img').evaluateAll(images => images.map(image => ({
    loading: image.getAttribute('loading') || '',
    priority: image.getAttribute('fetchpriority') || '',
  })))
  assert.equal(imageLoading.length, 20, width + ': unexpected style image count ' + JSON.stringify(imageLoading))
  assert.ok(imageLoading.slice(0, 4).every(image => image.priority === 'high'), width + ': first image priorities ' + JSON.stringify(imageLoading))
  assert.ok(imageLoading.slice(4).every(image => image.loading === 'lazy' && image.priority === 'low'), width + ': deferred image attributes ' + JSON.stringify(imageLoading))

  if (latestPayload.totalPages > 1) {
    await page.evaluate(() => { window.__v628StyleDocumentMarker = 'same-document' })
    const nextResponse = page.waitForResponse(response => {
      const url = new URL(response.url())
      return url.pathname === '/api/lien-style-admin-v618' && url.searchParams.get('page') === '2' && response.status() === 200
    })
    await root.locator('[data-page-v618="2"]').click()
    const nextPayload = await (await nextResponse).json()
    await page.waitForFunction(() => document.querySelector('.orimia-admin-style-pager-v618')?.textContent.includes('2 / '))
    assert.ok(nextPayload.posts.length <= 20)
    assert.ok(await cards.count() <= 20)
    assert.equal(await page.evaluate(() => window.__v628StyleDocumentMarker), 'same-document', 'Style pagination caused a document navigation')
    assert.equal(new URL(page.url()).searchParams.get('page'), '2')
  }

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    visibleCards: document.querySelectorAll('.orimia-style-admin-v618 .orimia-admin-style-card-v618').length,
    listNodes: document.querySelector('.orimia-style-admin-v618')?.querySelectorAll('*').length || 0,
    legacyVisible: [...document.querySelectorAll('.orimia-style-admin-legacy-hidden-v618')].some(node => getComputedStyle(node).display !== 'none'),
  }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, width + ': style page has horizontal overflow')
  assert.ok(layout.visibleCards <= 20, width + ': style DOM contains more than one page')
  assert.ok(layout.listNodes < 900, width + ': paginated style DOM is unexpectedly large ' + JSON.stringify(layout))
  assert.equal(layout.legacyVisible, false, width + ': legacy style list is visible')
  assert.deepEqual(errors, [], width + ': unexpected style browser errors')
  await page.screenshot({ path: path.join(output, 'style-posts-' + width + '.png'), fullPage: true })
  results.push({ scope: 'styles-' + width, mountedMs, layout, pageSize: 20, totalCount: latestPayload.totalCount })
  await context.close()
}

try {
  await verifyDealer(390)
  await verifyDealer(1440)
  await verifyStyles(390)
  await verifyStyles(1440)
  console.log(JSON.stringify({ release: 'list-pagination-performance-v628', passed: true, results }, null, 2))
} finally {
  await browser.close()
}
