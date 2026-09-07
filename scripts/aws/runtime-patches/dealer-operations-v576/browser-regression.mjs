import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3153').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-dealer-operations-v576')
const runId = Date.now().toString(36)
const errors = []
fs.mkdirSync(artifactRoot, { recursive:true })

function watch(page, label) {
  page.on('console', message => {
    if (message.type() === 'error' && !/Minified React error #(329|418|423)/.test(message.text())) errors.push(`${label}:console:${message.text()}`)
  })
  page.on('pageerror', error => {
    if (!/Minified React error #(329|418|423)/.test(String(error))) errors.push(`${label}:pageerror:${error}`)
  })
  page.on('requestfailed', request => {
    if (/wholesale-ordering|inventory-orders-common-layout/.test(request.url())) errors.push(`${label}:requestfailed:${request.url()}:${request.failure()?.errorText}`)
  })
}

async function json(response, label) {
  const text = await response.text()
  let payload = {}
  try { payload = text ? JSON.parse(text) : {} } catch {}
  assert.ok(response.ok(), `${label} failed with ${response.status()}: ${text.slice(0, 300)}`)
  return payload
}

async function loginAdmin(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' },
    maxRedirects:0,
  })
  assert.ok([302, 303].includes(response.status()))
}

async function createFixture(adminContext) {
  const salon = await json(await adminContext.request.get(`${baseUrl}/api/admin/wholesale/bootstrap`), 'salon bootstrap')
  const loginId = `dealer.browser.v576.${runId}`
  const password = `Dealer-Browser-V576-${runId}!`
  const invite = await json(await adminContext.request.post(`${baseUrl}/api/admin/wholesale/invites`, {
    headers:{ Origin:baseUrl },
    data:{ dealerName:`V576画面検証 ${runId}`, loginId, email:`${loginId}@example.test`, phone:'03-5555-5760' },
  }), 'dealer invite')
  const setupUrl = new URL(invite.setupUrl)
  const setup = await adminContext.request.post(`${baseUrl}/api/dealer/auth/setup`, {
    headers:{ Origin:baseUrl },
    form:{ token:setupUrl.searchParams.get('token'), password, passwordConfirm:password },
    maxRedirects:0,
  })
  assert.equal(setup.status(), 303)
  return { salon, invite, loginId, password }
}

async function loginDealer(context, fixture) {
  const response = await context.request.post(`${baseUrl}/api/dealer/auth/login`, {
    headers:{ Origin:baseUrl },
    form:{ loginId:fixture.loginId, password:fixture.password, next:'/dealer/orders' },
    maxRedirects:0,
  })
  assert.equal(response.status(), 303)
}

async function noOverflow(page, label) {
  const state = await page.evaluate(() => ({
    document:document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body:document.body.scrollWidth - document.body.clientWidth,
  }))
  assert.ok(state.document <= 1 && state.body <= 1, `${label} has horizontal overflow: ${JSON.stringify(state)}`)
}

const browser = await chromium.launch({ executablePath, headless:true })
let dealerContext
let adminContext

try {
  adminContext = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await loginAdmin(adminContext)
  const fixture = await createFixture(adminContext)

  dealerContext = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await loginDealer(dealerContext, fixture)
  const dealerPage = await dealerContext.newPage()
  watch(dealerPage, 'dealer-desktop')

  await dealerPage.goto(`${baseUrl}/dealer/products`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await dealerPage.locator('.wo-dealer-code-band code').waitFor({ state:'visible', timeout:15_000 })
  await dealerPage.locator('#dealer-product-form').waitFor({ state:'visible' })
  assert.match((await dealerPage.locator('.wo-dealer-code-band code').textContent()).trim(), /^DLR-[A-F0-9]{10}$/)
  assert.equal(await dealerPage.locator('.wo-dealer-sidebar nav a').count(), 3)
  await noOverflow(dealerPage, 'dealer products desktop')

  const productName = `画面検証シャンプー ${runId}`
  const productCode = `B576-${runId}`.toUpperCase()
  const form = dealerPage.locator('#dealer-product-form')
  await form.getByLabel('メーカー名').fill('ORIMIA PROFESSIONAL')
  await form.getByLabel('商品名').fill(productName)
  await form.getByLabel('カテゴリ').fill('シャンプー')
  await form.getByLabel('商品コード').fill(productCode)
  await form.getByLabel('JANコード').fill('4901234567894')
  await form.getByLabel('卸価格（税抜）').fill('2100')
  await form.getByLabel('参考店販価格').fill('3850')
  await form.getByLabel('発注単位').fill('1')
  await form.getByRole('button', { name:/商品を登録/ }).click()
  await dealerPage.getByText(productName, { exact:true }).waitFor({ state:'visible', timeout:15_000 })
  await dealerPage.screenshot({ path:path.join(artifactRoot, 'dealer-products-desktop.png'), fullPage:true })

  const dealerData = await json(await dealerContext.request.get(`${baseUrl}/api/dealer/bootstrap`), 'dealer product refresh')
  const dealerProduct = dealerData.products.find(item => item.productCode === productCode && item.active)
  assert.ok(dealerProduct)

  const salonData = await json(await adminContext.request.get(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(fixture.invite.dealer.id)}`), 'linked salon catalog')
  assert.ok(salonData.catalogProducts.some(item => item.dealerProductId === dealerProduct.id))
  const order = await json(await adminContext.request.post(`${baseUrl}/api/admin/wholesale/orders`, {
    headers:{ Origin:baseUrl },
    data:{ dealerId:fixture.invite.dealer.id, salonNote:'画面検証注文', lines:[{ dealerProductId:dealerProduct.id, quantity:1 }] },
  }), 'browser order')

  await dealerPage.goto(`${baseUrl}/dealer/orders`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await dealerPage.locator('.wo-dealer-orders').waitFor({ state:'visible', timeout:15_000 })
  const orderRow = dealerPage.locator(`.wo-dealer-order-row:has-text("${order.order.orderNo}")`)
  await orderRow.waitFor({ state:'visible' })
  assert.equal(await orderRow.locator('.wo-order-note-link').count(), 1)
  await dealerPage.screenshot({ path:path.join(artifactRoot, 'dealer-orders-desktop.png'), fullPage:true })

  await dealerPage.goto(`${baseUrl}/dealer/salons`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await dealerPage.locator('#dealer-salon-form').waitFor({ state:'visible', timeout:15_000 })
  assert.equal(await dealerPage.getByText(fixture.salon.organization.name, { exact:true }).count(), 1)
  await noOverflow(dealerPage, 'dealer salons desktop')
  await dealerPage.screenshot({ path:path.join(artifactRoot, 'dealer-salons-desktop.png'), fullPage:true })

  const notePage = await dealerContext.newPage()
  watch(notePage, 'delivery-note')
  await notePage.goto(`${baseUrl}/dealer/orders/${encodeURIComponent(order.order.id)}/delivery-note`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await notePage.getByRole('heading', { name:'納品書' }).waitFor({ state:'visible' })
  assert.equal(await notePage.getByText(productName, { exact:true }).count(), 1)
  await notePage.emulateMedia({ media:'print' })
  assert.equal(await notePage.locator('.wo-note-actions').evaluate(node => getComputedStyle(node).display), 'none')
  await notePage.screenshot({ path:path.join(artifactRoot, 'delivery-note-print.png'), fullPage:true })
  await notePage.close()

  const adminPage = await adminContext.newPage()
  watch(adminPage, 'salon-desktop')
  await adminPage.goto(`${baseUrl}/admin/products/orders`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await adminPage.locator('.wo-tabs').waitFor({ state:'visible', timeout:15_000 })
  await adminPage.waitForFunction(() => {
    const main = document.querySelector('.admin-main-content')
    return main && getComputedStyle(main).visibility === 'visible' && !document.documentElement.classList.contains('orimia-inventory-orders-pending-v572')
  }, null, { timeout:15_000 })
  await adminPage.waitForTimeout(800)
  assert.equal(await adminPage.locator('#dealer-code-form').count(), 1)
  assert.equal(await adminPage.locator('.wo-admin-layout,.wo-admin-sidebar,.wo-admin-topbar').count(), 0)
  assert.equal(await adminPage.locator('[data-orimia-admin-workspace-host-v572="inventory-orders"]').count(), 1)
  await noOverflow(adminPage, 'salon inventory desktop')
  await adminPage.screenshot({ path:path.join(artifactRoot, 'salon-code-link-desktop.png'), fullPage:true })
  await adminPage.close()

  const mobileContext = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  await loginDealer(mobileContext, fixture)
  const mobilePage = await mobileContext.newPage()
  watch(mobilePage, 'dealer-mobile')
  await mobilePage.goto(`${baseUrl}/dealer/products`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await mobilePage.locator('.wo-dealer-mobile-nav').waitFor({ state:'visible', timeout:15_000 })
  await mobilePage.locator('.wo-dealer-code-band').waitFor({ state:'visible' })
  assert.equal(await mobilePage.locator('.wo-dealer-mobile-nav a').count(), 3)
  await noOverflow(mobilePage, 'dealer products mobile')
  await mobilePage.screenshot({ path:path.join(artifactRoot, 'dealer-products-mobile.png'), fullPage:false })
  await mobilePage.goto(`${baseUrl}/dealer/salons`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await mobilePage.locator('#dealer-salon-form').waitFor({ state:'visible', timeout:15_000 })
  await noOverflow(mobilePage, 'dealer salons mobile')
  await mobilePage.screenshot({ path:path.join(artifactRoot, 'dealer-salons-mobile.png'), fullPage:false })
  await mobilePage.goto(`${baseUrl}/dealer/orders`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await mobilePage.locator('.wo-dealer-order-row').first().waitFor({ state:'visible', timeout:15_000 })
  await noOverflow(mobilePage, 'dealer orders mobile')
  await mobilePage.screenshot({ path:path.join(artifactRoot, 'dealer-orders-mobile.png'), fullPage:false })
  await mobileContext.close()

  const productArticle = dealerPage.locator(`.wo-catalog-table article:has-text("${productName}")`)
  const productTrash = productArticle.locator('[data-action="remove-product"]')
  await dealerPage.goto(`${baseUrl}/dealer/products`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await dealerPage.getByText(productName, { exact:true }).waitFor({ state:'visible' })
  await productTrash.click()
  const removeDialog = dealerPage.locator('#wo-manage-dialog')
  await removeDialog.waitFor({ state:'visible' })
  assert.equal(await removeDialog.getByRole('button', { name:'削除する' }).isDisabled(), true)
  await removeDialog.getByLabel('内容を確認しました').check()
  await removeDialog.getByRole('button', { name:'削除する' }).click()
  await productArticle.waitFor({ state:'detached', timeout:15_000 })

  const finalDealer = await json(await dealerContext.request.get(`${baseUrl}/api/dealer/bootstrap`), 'cleanup bootstrap')
  const contract = finalDealer.contracts.find(item => item.organizationId === fixture.salon.organization.id && item.status !== 'SUSPENDED')
  if (contract) {
    await json(await dealerContext.request.post(`${baseUrl}/api/dealer/contracts/${encodeURIComponent(contract.id)}/remove`, {
      headers:{ Origin:baseUrl }, data:{ confirmed:true },
    }), 'cleanup contract')
  }

  for (const filename of fs.readdirSync(artifactRoot).filter(name => name.endsWith('.png'))) {
    assert.ok(fs.statSync(path.join(artifactRoot, filename)).size > 12_000, `${filename} appears blank`)
  }
  assert.deepEqual(errors, [], errors.join('\n'))
  console.log(JSON.stringify({
    release:'dealer-operations-v576',
    browserVerified:true,
    dealerViews:['orders', 'salons', 'products'],
    salonSharedLayout:true,
    mobile:true,
    deliveryNotePrint:true,
    deleteConfirmation:true,
    artifacts:artifactRoot,
  }))
} finally {
  await dealerContext?.close()
  await adminContext?.close()
  await browser.close()
}
