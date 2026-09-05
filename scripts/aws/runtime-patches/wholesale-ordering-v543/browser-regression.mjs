import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3119').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-wholesale-ordering-v543')
fs.mkdirSync(artifactRoot, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const errors = []
const knownHydrationNoise = /Minified React error #(418|423)/

function watch(page, label) {
  page.on('console', message => {
    if (message.type() === 'error' && !knownHydrationNoise.test(message.text())) errors.push(`${label}:console:${message.text()}`)
  })
  page.on('pageerror', error => {
    if (!knownHydrationNoise.test(String(error))) errors.push(`${label}:pageerror:${error}`)
  })
  page.on('requestfailed', request => {
    const pathname = new URL(request.url()).pathname
    if (pathname.includes('wholesale-ordering')) errors.push(`${label}:requestfailed:${pathname}:${request.failure()?.errorText}`)
  })
}

async function loginAdmin(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products' },
  })
  assert.ok(response.ok(), `admin login failed with ${response.status()}`)
}

async function json(response, label) {
  const body = await response.text()
  let payload = {}
  try { payload = body ? JSON.parse(body) : {} } catch {}
  assert.ok(response.ok(), `${label} failed with ${response.status()}: ${body.slice(0, 500)}`)
  return payload
}

async function createDealerAndOrder(adminContext) {
  const runId = Date.now().toString(36)
  const bootstrap = await json(await adminContext.request.get(`${baseUrl}/api/admin/wholesale/bootstrap`), 'admin bootstrap')
  assert.ok(bootstrap.products.length > 0)
  const loginId = `browser.v543.${runId}`
  const password = `Browser-V543-${runId}!`
  const invite = await json(await adminContext.request.post(`${baseUrl}/api/admin/wholesale/invites`, {
    headers: { Origin: baseUrl },
    data: { dealerName: `検証ディーラー ${runId}`, loginId, email: `${loginId}@example.test`, phone: '03-5555-3543' },
  }), 'create dealer invite')
  const setupUrl = new URL(invite.setupUrl)
  const setup = await adminContext.request.post(`${baseUrl}/api/dealer/auth/setup`, {
    headers: { Origin: baseUrl },
    form: { token: setupUrl.searchParams.get('token'), password, passwordConfirm: password },
  })
  assert.ok(setup.ok(), `dealer setup failed with ${setup.status()}`)
  const order = await json(await adminContext.request.post(`${baseUrl}/api/admin/wholesale/orders`, {
    headers: { Origin: baseUrl },
    data: { dealerId: invite.dealer.id, salonNote: '画面検証用注文', lines: [{ productId: bootstrap.products[0].id, quantity: 1 }] },
  }), 'create browser order')
  return { loginId, password, dealerId: invite.dealer.id, orderId: order.order.id }
}

try {
  const publicContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
  const loginPage = await publicContext.newPage()
  watch(loginPage, 'dealer-login')
  await loginPage.goto(`${baseUrl}/dealer/login`, { waitUntil: 'networkidle', timeout: 30_000 })
  await loginPage.getByRole('heading', { name: 'ディーラーログイン' }).waitFor({ state: 'visible' })
  assert.equal(await loginPage.locator('input[name="loginId"]').isVisible(), true)
  assert.equal(await loginPage.locator('input[name="password"]').isVisible(), true)
  assert.equal(await loginPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'dealer login overflows horizontally')
  await loginPage.screenshot({ path: path.join(artifactRoot, 'dealer-login-desktop.png'), fullPage: true })

  const adminDesktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  await loginAdmin(adminDesktop)
  const fixture = await createDealerAndOrder(adminDesktop)
  const productPage = await adminDesktop.newPage()
  watch(productPage, 'product-desktop')
  await productPage.goto(`${baseUrl}/admin/products`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const entry = productPage.locator('[data-wholesale-entry-v543]')
  await entry.waitFor({ state: 'visible', timeout: 15_000 })
  await productPage.screenshot({ path: path.join(artifactRoot, 'product-shelf-entry-desktop.png'), fullPage: false })
  assert.equal(await entry.getAttribute('href'), '/admin/products/orders')

  await productPage.goto(`${baseUrl}/admin/settings`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await productPage.locator('[data-ca-store-settings]').waitFor({ state: 'attached', timeout: 15_000 })
  await productPage.waitForTimeout(500)
  assert.equal(await productPage.locator('input[name^="stockQuantity:"]').count(), 0, 'legacy inventory inputs remain in settings')
  assert.equal(await productPage.locator('section').filter({ hasText: '商品在庫' }).count(), 0, 'legacy inventory section remains in settings')

  const salonPage = await adminDesktop.newPage()
  watch(salonPage, 'salon-desktop')
  await salonPage.goto(`${baseUrl}/admin/products/orders`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await salonPage.locator('.wo-workspace').waitFor({ state: 'visible', timeout: 15_000 })
  await salonPage.locator('.wo-product-row').first().waitFor({ state: 'visible', timeout: 15_000 })
  assert.equal(await salonPage.locator('text=在庫管理・発注').first().isVisible(), true)
  assert.equal(await salonPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'desktop salon page overflows horizontally')
  await salonPage.screenshot({ path: path.join(artifactRoot, 'salon-ordering-desktop.png'), fullPage: true })
  await salonPage.getByRole('tab', { name: '棚卸し' }).click()
  await salonPage.locator('.wo-inventory-row').first().waitFor({ state: 'visible' })
  await salonPage.screenshot({ path: path.join(artifactRoot, 'salon-inventory-desktop.png'), fullPage: false })
  await salonPage.getByRole('tab', { name: '発注履歴' }).click()
  await salonPage.locator('.wo-order-history').waitFor({ state: 'visible' })

  const adminMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await loginAdmin(adminMobile)
  const salonMobile = await adminMobile.newPage()
  watch(salonMobile, 'salon-mobile')
  await salonMobile.goto(`${baseUrl}/admin/products/orders`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await salonMobile.locator('.wo-product-row').first().waitFor({ state: 'visible', timeout: 15_000 })
  assert.equal(await salonMobile.locator('.wo-mobile-nav').isVisible(), true)
  assert.equal(await salonMobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'mobile salon page overflows horizontally')
  await salonMobile.screenshot({ path: path.join(artifactRoot, 'salon-ordering-mobile.png'), fullPage: true })

  const dealerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const login = await dealerContext.request.post(`${baseUrl}/api/dealer/auth/login`, {
    headers: { Origin: baseUrl },
    form: { loginId: fixture.loginId, password: fixture.password, next: '/dealer/orders' },
  })
  assert.ok(login.ok(), `dealer login failed with ${login.status()}`)
  const dealerPage = await dealerContext.newPage()
  watch(dealerPage, 'dealer-desktop')
  await dealerPage.goto(`${baseUrl}/dealer/orders`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await dealerPage.locator(`[data-action="open-order"][data-id="${fixture.orderId}"]`).waitFor({ state: 'visible', timeout: 15_000 })
  assert.equal(await dealerPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'dealer page overflows horizontally')
  await dealerPage.screenshot({ path: path.join(artifactRoot, 'dealer-orders-desktop.png'), fullPage: true })
  await dealerPage.locator(`[data-action="open-order"][data-id="${fixture.orderId}"]`).click()
  await dealerPage.locator('.wo-detail-line').waitFor({ state: 'visible', timeout: 15_000 })
  await dealerPage.screenshot({ path: path.join(artifactRoot, 'dealer-order-detail-desktop.png'), fullPage: false })
  const notePage = await dealerContext.newPage()
  watch(notePage, 'delivery-note')
  await notePage.goto(`${baseUrl}/dealer/orders/${encodeURIComponent(fixture.orderId)}/delivery-note`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await notePage.locator('.wo-delivery-note').waitFor({ state: 'visible' })
  await notePage.screenshot({ path: path.join(artifactRoot, 'delivery-note-a4.png'), fullPage: true })

  for (const file of fs.readdirSync(artifactRoot).filter(name => name.endsWith('.png'))) {
    assert.ok(fs.statSync(path.join(artifactRoot, file)).size > 15_000, `${file} appears blank`)
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ release: 'wholesale-ordering-v543', browserVerified: true, screenshots: artifactRoot, files: fs.readdirSync(artifactRoot).sort() }))
} finally {
  await browser.close()
}
