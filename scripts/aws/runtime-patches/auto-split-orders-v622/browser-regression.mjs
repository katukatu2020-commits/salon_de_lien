import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3622').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const screenshotDir = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'auto-split-orders-v622')
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
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right, 'ja'))
}

async function selectAllDealers(page) {
  const responsePromise = page.waitForResponse(response => (
    response.url().includes('/api/admin/wholesale/bootstrap') &&
    new URL(response.url()).searchParams.get('dealerId') === 'all'
  ))
  await page.locator('#dealer-select').selectOption('all')
  const response = await responsePromise
  assert.ok(response.ok(), `all dealer filter request failed with ${response.status()}`)
  await page.locator('.wo-contract-product-row').first().waitFor({ state: 'visible', timeout: 15_000 })
}

async function verifyViewport(label, viewport) {
  const context = await browser.newContext({ viewport })
  await login(context)
  const allResponse = await context.request.get(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=all`)
  assert.ok(allResponse.ok(), `all dealer bootstrap failed with ${allResponse.status()}`)
  const allData = await allResponse.json()
  const activeContracts = (allData.contracts || []).filter(contract => contract.status === 'ACTIVE')
  const firstProduct = allData.catalogProducts[0]
  const secondProduct = allData.catalogProducts.find(product => product.dealerId !== firstProduct.dealerId)
  assert.ok(firstProduct && secondProduct, 'products from two dealers are required')

  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => {
    if (!/Minified React error #(329|418|423)/.test(String(error))) pageErrors.push(String(error))
  })
  await page.goto(`${baseUrl}/admin/products/orders?ui=v622-${label}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  await page.locator('#dealer-select').waitFor({ state: 'visible', timeout: 20_000 })
  await selectAllDealers(page)

  assert.deepEqual(
    await page.locator('#dealer-select option').allTextContents(),
    ['すべての発注先', ...activeContracts.map(contract => contract.dealerName)],
  )
  assert.deepEqual(
    await page.locator('#manufacturer-filter option').allTextContents(),
    ['すべてのメーカー', ...sortedUnique(allData.catalogProducts.map(product => product.manufacturerName))],
  )

  const firstRow = page.locator(`.wo-contract-product-row[data-product-id="${firstProduct.id}"]`)
  const secondRow = page.locator(`.wo-contract-product-row[data-product-id="${secondProduct.id}"]`)
  await firstRow.locator('[data-action="quantity-plus"]').click()
  await secondRow.locator('[data-action="quantity-plus"]').click()
  assert.equal(Number(await firstRow.locator('[data-action="quantity-input"]').inputValue()), Number(firstProduct.orderUnit || 1))
  assert.equal(Number(await secondRow.locator('[data-action="quantity-input"]').inputValue()), Number(secondProduct.orderUnit || 1))
  assert.equal(await page.locator('[data-action="confirm-order"]').isEnabled(), true)
  await page.getByText('2件の注文に自動分割', { exact: true }).waitFor({ state: 'visible' })

  const layout = await page.locator('.wo-workspace').last().evaluate(element => ({
    documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    workspaceWidth: element.getBoundingClientRect().width,
    viewportWidth: document.documentElement.clientWidth,
  }))
  assert.equal(layout.documentOverflow, false)
  await page.screenshot({ path: path.join(screenshotDir, `selection-${label}.png`), fullPage: true })

  await page.locator('[data-action="confirm-order"]').click()
  const dialog = page.locator('#wo-dialog')
  await dialog.waitFor({ state: 'visible' })
  assert.equal(await dialog.locator('.wo-confirm-group').count(), 2)
  assert.deepEqual(
    sortedUnique(await dialog.locator('.wo-confirm-destination strong').allTextContents()),
    sortedUnique([firstProduct.dealerName, secondProduct.dealerName]),
  )
  await dialog.getByText('2件の注文として送信します', { exact: true }).waitFor({ state: 'visible' })
  await dialog.getByText('2件に分けて注文を確定', { exact: true }).waitFor({ state: 'visible' })
  const dialogLayout = await dialog.evaluate(element => ({
    horizontalOverflow: element.scrollWidth > element.clientWidth + 1,
    width: element.getBoundingClientRect().width,
  }))
  assert.equal(dialogLayout.horizontalOverflow, false)
  await page.screenshot({ path: path.join(screenshotDir, `confirmation-${label}.png`), fullPage: false })

  let submittedPayload = null
  await page.route('**/api/admin/wholesale/orders', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    submittedPayload = route.request().postDataJSON()
    const orders = submittedPayload.orders.map(function (order, index) {
      return { id: `browser-v622-${label}-${index}`, orderNo: `TEST-${index + 1}`, status: 'ORDERED', dealerId: order.dealerId }
    })
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, order: orders[0], orders }) })
  })
  await dialog.locator('[data-action="submit-order"]').click()
  await page.locator('.wo-toast').getByText('2件の注文を発注先ごとに送信しました。', { exact: true }).waitFor({ state: 'visible' })
  assert.ok(submittedPayload)
  assert.equal(submittedPayload.orders.length, 2)
  assert.equal(new Set(submittedPayload.orders.map(order => order.dealerId)).size, 2)
  assert.ok(submittedPayload.orders.every(order => order.lines.length === 1 && order.lines[0].quantity > 0))
  assert.deepEqual(pageErrors, [])
  await context.close()

  return {
    activeDealers: activeContracts.length,
    products: allData.catalogProducts.length,
    submittedOrders: submittedPayload.orders.length,
    ...layout,
    dialogWidth: dialogLayout.width,
  }
}

try {
  const desktop = await verifyViewport('desktop', { width: 1440, height: 900 })
  const mobile = await verifyViewport('mobile', { width: 390, height: 844 })
  console.log(JSON.stringify({
    release: 'auto-split-orders-v622',
    mixedDealerSelection: true,
    groupedConfirmation: true,
    splitPayload: true,
    productionOrdersCreated: false,
    desktop,
    mobile,
    screenshots: screenshotDir,
  }))
} finally {
  await browser.close()
}
