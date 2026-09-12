import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3631').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/dealer-pricing-pagination-v631/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const dealerLoginId = 'dealer.pricing.v631'
const dealerPassword = 'DealerPricingV631!'
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
    form: { loginId: dealerLoginId, password: dealerPassword, next: '/dealer/pricing' },
    maxRedirects: 0,
  })
  assert.ok([302, 303].includes(response.status()), 'Dealer login failed with ' + response.status())
}

async function verifyPricing(width, mutate) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await loginDealer(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  const bootstrapPayloads = []
  page.on('response', async response => {
    if (!response.url().includes('/api/dealer/bootstrap') || response.status() !== 200) return
    try { bootstrapPayloads.push({ url: response.url(), payload: await response.json() }) } catch {}
  })

  await page.goto(base + '/dealer/pricing?verify=v631-' + width, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const rows = page.locator('[data-pricing-row]')
  await rows.first().waitFor({ state: 'visible', timeout: 20_000 })
  assert.equal(await rows.count(), 30, width + ': first pricing page did not render exactly 30 rows')
  await page.waitForFunction(() => document.querySelector('.wo-pricing-pager-v631')?.textContent.includes('全67件'))
  assert.ok(bootstrapPayloads.length >= 1, width + ': pricing bootstrap was not observed')
  const initial = bootstrapPayloads.at(-1)
  const initialUrl = new URL(initial.url)
  assert.equal(initialUrl.searchParams.get('view'), 'pricing')
  assert.equal(initial.payload.products.length, 30)
  assert.equal(initial.payload.pricingPagination.pageSize, 30)
  assert.equal(initial.payload.pricingPagination.totalCount, 67)
  assert.equal(initial.payload.pricingPagination.totalProductCount, 67)
  assert.ok(initial.payload.pricingPagination.configuredCount >= 35)
  assert.equal(initial.payload.orders.length, 0, 'Pricing page received unused order rows')
  assert.ok(initial.payload.contractProductPrices.length <= 30, 'Pricing page received prices outside the current page')
  assert.ok(initial.payload.contractProductPrices.every(price => price.contractId === initial.payload.pricingPagination.contractId))

  const initialLayout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    rows: document.querySelectorAll('[data-pricing-row]').length,
    sectionNodes: document.querySelector('.wo-pricing-management')?.querySelectorAll('*').length || 0,
  }))
  assert.ok(initialLayout.documentWidth <= initialLayout.viewport + 2, width + ': initial pricing page has horizontal overflow')
  assert.ok(initialLayout.sectionNodes < 1_000, width + ': initial pricing DOM is unexpectedly large')

  await page.evaluate(() => { window.__v631DocumentMarker = 'same-document' })
  if (mutate) {
    const firstRate = rows.first().locator('[data-pricing-rate]')
    await firstRate.fill('17.5')
  }

  const secondResponsePromise = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/dealer/bootstrap' && url.searchParams.get('pricingPage') === '2' && response.status() === 200
  })
  await page.locator('[data-action="dealer-pricing-page"][data-page="2"]').click()
  const secondPayload = await (await secondResponsePromise).json()
  await page.waitForFunction(() => document.querySelector('.wo-pricing-pager-v631 strong')?.textContent.includes('2 / 3'))
  assert.equal(secondPayload.products.length, 30)
  assert.ok(secondPayload.contractProductPrices.length <= 30)
  assert.equal(await rows.count(), 30)
  assert.equal(await page.evaluate(() => window.__v631DocumentMarker), 'same-document', 'Pricing pagination caused a document navigation')
  assert.equal(new URL(page.url()).searchParams.get('pricingPage'), '2')

  if (mutate) {
    await page.waitForFunction(() => document.querySelector('.wo-pricing-save')?.textContent.includes('未保存の変更が1件'))
    const firstDisabled = rows.filter({ has: page.locator('[data-pricing-enabled]:not(:checked)') }).first()
    const disabledProductId = await firstDisabled.getAttribute('data-product-id')
    assert.ok(disabledProductId, 'A disabled pricing product was not found')
    await page.locator('[data-pricing-row][data-product-id="' + disabledProductId + '"] [data-pricing-enabled]').check()
    await page.waitForFunction(() => document.querySelector('.wo-pricing-save')?.textContent.includes('未保存の変更が2件'))

    const saveRequestPromise = page.waitForRequest(request => request.url().includes('/product-pricing') && request.method() === 'POST')
    const saveResponsePromise = page.waitForResponse(response => response.url().includes('/product-pricing') && response.status() === 200)
    await page.locator('[data-action="save-contract-pricing"]').click()
    const saveRequest = await saveRequestPromise
    const submitted = saveRequest.postDataJSON()
    assert.equal(submitted.items.length, 2, 'Save submitted unchanged products')
    assert.ok(submitted.items.some(item => Number(item.discountRate) === 17.5))
    await saveResponsePromise
    await page.waitForFunction(() => !document.querySelector('.wo-pricing-save')?.textContent.includes('未保存の変更'))
  }

  const firstPageResponsePromise = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/dealer/bootstrap' && url.searchParams.get('pricingPage') === '1' && response.status() === 200
  })
  await page.locator('[data-action="dealer-pricing-page"][data-page="1"]').click()
  await firstPageResponsePromise
  if (mutate) assert.equal(await rows.first().locator('[data-pricing-rate]').inputValue(), '17.5', 'Saved page-one draft was lost')

  const searchResponsePromise = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/dealer/bootstrap' && url.searchParams.get('pricingSearch') === '商品 067' && response.status() === 200
  })
  await page.locator('#dealer-pricing-search').fill('商品 067')
  const searchPayload = await (await searchResponsePromise).json()
  await page.waitForFunction(() => document.querySelectorAll('[data-pricing-row]').length === 1)
  assert.equal(searchPayload.pricingPagination.totalCount, 1)
  assert.equal(searchPayload.products[0].productCode, 'V631-P0067')
  assert.equal(new URL(page.url()).searchParams.get('pricingSearch'), '商品 067')
  assert.equal(new URL(page.url()).searchParams.has('pricingPage'), false)

  const filteredLayout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    rows: document.querySelectorAll('[data-pricing-row]').length,
    sectionNodes: document.querySelector('.wo-pricing-management')?.querySelectorAll('*').length || 0,
  }))
  assert.ok(filteredLayout.documentWidth <= filteredLayout.viewport + 2, width + ': filtered pricing page has horizontal overflow')
  assert.ok(filteredLayout.sectionNodes < 500, width + ': filtered pricing DOM is unexpectedly large')
  assert.deepEqual(errors, [], width + ': unexpected dealer browser errors')
  await page.screenshot({ path: path.join(output, 'dealer-pricing-' + width + '.png'), fullPage: true })
  results.push({ width, initialLayout, filteredLayout, pageSize: 30, totalCount: 67, changedRowsOnlySave: mutate })
  await context.close()
}

try {
  await verifyPricing(390, true)
  await verifyPricing(1440, false)
  console.log(JSON.stringify({ release: 'dealer-pricing-pagination-v631', passed: true, results }, null, 2))
} finally {
  await browser.close()
}
