import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3621').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const screenshotDir = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'all-dealer-order-filter-v621')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    headers: { Origin: baseUrl },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products/orders' },
  })
  assert.ok(response.ok(), `admin login failed with ${response.status()}`)
}

function sortedUnique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ja'))
}

async function selectDealer(page, value) {
  const responsePromise = page.waitForResponse(response => (
    response.url().includes('/api/admin/wholesale/bootstrap') &&
    new URL(response.url()).searchParams.get('dealerId') === value
  ))
  await page.locator('#dealer-select').selectOption(value)
  const response = await responsePromise
  assert.ok(response.ok(), `dealer filter request failed with ${response.status()}`)
  await page.locator('.wo-contract-product-row').first().waitFor({ state: 'visible', timeout: 15_000 })
}

async function verifyViewport(label, viewport) {
  const context = await browser.newContext({ viewport })
  await login(context)

  const allResponse = await context.request.get(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=all`)
  assert.ok(allResponse.ok(), `all dealer bootstrap failed with ${allResponse.status()}`)
  const allData = await allResponse.json()
  const activeContracts = (allData.contracts || []).filter(contract => contract.status === 'ACTIVE')
  const productDealerIds = sortedUnique((allData.catalogProducts || []).map(product => product.dealerId))
  assert.equal(allData.selectedDealerId, 'all')
  assert.ok(activeContracts.length >= 2, 'at least two active dealers are required')
  assert.ok(productDealerIds.length >= 2, 'all dealer catalog must include at least two dealers')

  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => {
    if (!/Minified React error #(329|418|423)/.test(String(error))) pageErrors.push(String(error))
  })
  await page.goto(`${baseUrl}/admin/products/orders?ui=v621-${label}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  await page.locator('#dealer-select').waitFor({ state: 'visible', timeout: 20_000 })

  await selectDealer(page, 'all')
  assert.equal(await page.locator('.wo-contract-product-row').count(), allData.catalogProducts.length)
  assert.deepEqual(
    await page.locator('#dealer-select option').allTextContents(),
    ['すべての発注先', ...activeContracts.map(contract => contract.dealerName)],
  )
  assert.deepEqual(
    await page.locator('#manufacturer-filter option').allTextContents(),
    ['すべてのメーカー', ...sortedUnique(allData.catalogProducts.map(product => product.manufacturerName))],
  )
  assert.equal(
    new Set(await page.locator('.wo-contract-dealer strong').allTextContents()).size,
    productDealerIds.length,
  )

  const manufacturer = sortedUnique(allData.catalogProducts.map(product => product.manufacturerName))[0]
  await page.locator('#manufacturer-filter').selectOption({ label: manufacturer })
  const expectedManufacturerCount = allData.catalogProducts.filter(product => product.manufacturerName === manufacturer).length
  assert.equal(await page.locator('.wo-contract-product-row').count(), expectedManufacturerCount)
  await page.locator('#manufacturer-filter').selectOption('')

  const firstProduct = allData.catalogProducts[0]
  const secondProduct = allData.catalogProducts.find(product => product.dealerId !== firstProduct.dealerId)
  assert.ok(secondProduct, 'a product from another dealer is required')
  const firstRow = page.locator(`.wo-contract-product-row[data-product-id="${firstProduct.id}"]`)
  const secondRow = page.locator(`.wo-contract-product-row[data-product-id="${secondProduct.id}"]`)
  await firstRow.locator('[data-action="quantity-plus"]').click()
  assert.equal(Number(await firstRow.locator('[data-action="quantity-input"]').inputValue()), Number(firstProduct.orderUnit || 1))
  assert.equal(await page.locator('[data-action="confirm-order"]').isEnabled(), true)
  await secondRow.locator('[data-action="quantity-plus"]').click()
  await page.locator('.wo-toast.error').getByText('発注先ごとに注文を分けてください。').waitFor({ state: 'visible' })
  assert.equal(Number(await secondRow.locator('[data-action="quantity-input"]').inputValue()), 0)

  await selectDealer(page, firstProduct.dealerId)
  const resetQuantities = await page.locator('[data-action="quantity-input"]').evaluateAll(inputs => inputs.map(input => input.value))
  assert.ok(resetQuantities.every(value => Number(value) === 0))
  await selectDealer(page, 'all')

  const layout = await page.locator('.wo-workspace').last().evaluate(element => ({
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    workspaceWidth: element.getBoundingClientRect().width,
    viewportWidth: document.documentElement.clientWidth,
  }))
  assert.equal(layout.documentOverflow, false)
  await page.screenshot({ path: path.join(screenshotDir, `all-dealers-${label}.png`), fullPage: true })
  assert.deepEqual(pageErrors, [])
  await context.close()

  return {
    activeDealers: activeContracts.length,
    products: allData.catalogProducts.length,
    productDealers: productDealerIds.length,
    manufacturers: sortedUnique(allData.catalogProducts.map(product => product.manufacturerName)).length,
    ...layout,
  }
}

try {
  const desktop = await verifyViewport('desktop', { width: 1440, height: 900 })
  const mobile = await verifyViewport('mobile', { width: 390, height: 844 })
  console.log(JSON.stringify({
    release: 'all-dealer-order-filter-v621',
    allDealerOption: true,
    allManufacturerOption: true,
    mixedDealerOrderBlocked: true,
    desktop,
    mobile,
    screenshots: screenshotDir,
  }))
} finally {
  await browser.close()
}
