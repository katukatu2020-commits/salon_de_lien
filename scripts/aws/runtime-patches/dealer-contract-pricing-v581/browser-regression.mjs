import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3153').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-dealer-contract-pricing-v581')
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
  assert.ok(response.ok(), `${label} failed with ${response.status()}: ${text.slice(0, 500)}`)
  return payload
}

async function loginAdmin(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    headers:{ Origin:baseUrl },
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' },
    maxRedirects:0,
  })
  assert.ok([302, 303].includes(response.status()), `admin login failed with ${response.status()}`)
}

async function createFixture(adminContext) {
  const salon = await json(await adminContext.request.get(`${baseUrl}/api/admin/wholesale/bootstrap`), 'salon bootstrap')
  const loginId = `dealer.browser.v581.${runId}`
  const password = `Dealer-Browser-V581-${runId}!`
  const invite = await json(await adminContext.request.post(`${baseUrl}/api/admin/wholesale/invites`, {
    headers:{ Origin:baseUrl },
    data:{ dealerName:`V581 画面検証ディーラー ${runId}`, loginId, email:`${loginId}@example.test`, phone:'03-5555-5810' },
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
    form:{ loginId:fixture.loginId, password:fixture.password, next:'/dealer/pricing' },
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

async function waitForSalonWorkspace(page) {
  await page.locator('.wo-tabs').waitFor({ state:'visible', timeout:15_000 })
  await page.waitForFunction(() => {
    const main = document.querySelector('.admin-main-content')
    return main && getComputedStyle(main).visibility === 'visible' && !document.documentElement.classList.contains('orimia-inventory-orders-pending-v572')
  }, null, { timeout:15_000 })
}

async function selectDealer(page, dealerId) {
  const select = page.locator('#dealer-select')
  if (await select.count()) await select.selectOption(dealerId)
}

const browser = await chromium.launch({ executablePath, headless:true })
let adminContext
let dealerContext
let fixture
let product

try {
  adminContext = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await loginAdmin(adminContext)
  fixture = await createFixture(adminContext)

  dealerContext = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await loginDealer(dealerContext, fixture)
  const dealerData = await json(await dealerContext.request.get(`${baseUrl}/api/dealer/bootstrap`), 'dealer bootstrap')
  const contract = dealerData.contracts.find(item => item.organizationId === fixture.salon.organization.id && item.status === 'ACTIVE')
  assert.ok(contract)
  const productName = `契約価格UI検証シャンプー ${runId}`
  product = (await json(await dealerContext.request.post(`${baseUrl}/api/dealer/products`, {
    headers:{ Origin:baseUrl },
    data:{
      manufacturerName:'ORIMIA PROFESSIONAL', name:productName, category:'シャンプー',
      productCode:`B581-${runId}`.toUpperCase(), janCode:'4901234567896',
      suggestedRetailPrice:4000, orderUnit:2, description:'ブラウザー検証商品',
    },
  }), 'create dealer product')).product

  const dealerPage = await dealerContext.newPage()
  watch(dealerPage, 'dealer-desktop')
  await dealerPage.goto(`${baseUrl}/dealer/pricing?contractId=${encodeURIComponent(contract.id)}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await dealerPage.locator('.wo-pricing-management').waitFor({ state:'visible', timeout:15_000 })
  assert.equal(await dealerPage.locator('.wo-dealer-sidebar nav a').count(), 4)
  assert.equal((await dealerPage.locator('#dealer-pricing-salon').inputValue()), contract.id)
  let pricingRow = dealerPage.locator('.wo-pricing-row', { hasText:productName })
  await pricingRow.waitFor({ state:'visible' })
  await pricingRow.locator('[data-pricing-enabled]').check()
  pricingRow = dealerPage.locator('.wo-pricing-row', { hasText:productName })
  await pricingRow.locator('[data-pricing-rate]').fill('27.5')
  await Promise.all([
    dealerPage.waitForResponse(response => response.url().includes(`/api/dealer/contracts/${contract.id}/product-pricing`) && response.status() === 200),
    dealerPage.getByRole('button', { name:/取扱・割引設定を保存/ }).click(),
  ])
  pricingRow = dealerPage.locator('.wo-pricing-row', { hasText:productName })
  await pricingRow.getByText('美容室に公開', { exact:true }).waitFor({ state:'visible' })
  assert.match(await pricingRow.textContent(), /4,000円/)
  assert.match(await pricingRow.textContent(), /2,900円/)
  await noOverflow(dealerPage, 'dealer pricing desktop')
  await dealerPage.screenshot({ path:path.join(artifactRoot, 'dealer-pricing-desktop.png'), fullPage:true })

  const salonPage = await adminContext.newPage()
  watch(salonPage, 'salon-desktop')
  await salonPage.goto(`${baseUrl}/admin/products/orders`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await waitForSalonWorkspace(salonPage)
  await selectDealer(salonPage, fixture.invite.dealer.id)
  const salonRow = salonPage.locator('.wo-contract-product-row', { hasText:productName })
  await salonRow.waitFor({ state:'visible', timeout:15_000 })
  assert.equal(await salonPage.locator('.wo-contract-product-head > span').count(), 7)
  const salonText = await salonRow.textContent()
  assert.match(salonText, new RegExp(fixture.invite.dealer.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(salonText, /4,000円/)
  assert.match(salonText, /27\.5%/)
  assert.match(salonText, /2,900円/)
  assert.equal(await salonPage.locator('[data-orimia-admin-workspace-host-v572="inventory-orders"]').count(), 1)
  await noOverflow(salonPage, 'salon ordering desktop')
  await salonPage.screenshot({ path:path.join(artifactRoot, 'salon-contract-products-desktop.png'), fullPage:true })

  const dealerMobile = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  await loginDealer(dealerMobile, fixture)
  const dealerMobilePage = await dealerMobile.newPage()
  watch(dealerMobilePage, 'dealer-mobile')
  await dealerMobilePage.goto(`${baseUrl}/dealer/pricing?contractId=${encodeURIComponent(contract.id)}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await dealerMobilePage.locator('.wo-pricing-management').waitFor({ state:'visible', timeout:15_000 })
  assert.equal(await dealerMobilePage.locator('.wo-dealer-mobile-nav a').count(), 4)
  await dealerMobilePage.locator('.wo-pricing-row', { hasText:productName }).waitFor({ state:'visible' })
  await noOverflow(dealerMobilePage, 'dealer pricing mobile')
  await dealerMobilePage.screenshot({ path:path.join(artifactRoot, 'dealer-pricing-mobile.png'), fullPage:true })
  await dealerMobile.close()

  const salonMobile = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  await loginAdmin(salonMobile)
  const salonMobilePage = await salonMobile.newPage()
  watch(salonMobilePage, 'salon-mobile')
  await salonMobilePage.goto(`${baseUrl}/admin/products/orders`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await waitForSalonWorkspace(salonMobilePage)
  await selectDealer(salonMobilePage, fixture.invite.dealer.id)
  await salonMobilePage.locator('.wo-contract-product-row', { hasText:productName }).waitFor({ state:'visible', timeout:15_000 })
  await noOverflow(salonMobilePage, 'salon ordering mobile')
  await salonMobilePage.screenshot({ path:path.join(artifactRoot, 'salon-contract-products-mobile.png'), fullPage:true })
  await salonMobile.close()

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    release:'dealer-contract-pricing-v581',
    desktop:true,
    mobile:true,
    dealerBulkPricing:true,
    salonContractTable:true,
    sharedSalonLayout:true,
    noHorizontalOverflow:true,
    screenshots:artifactRoot,
  }))
} finally {
  if (dealerContext && product) {
    await dealerContext.request.post(`${baseUrl}/api/dealer/products/${encodeURIComponent(product.id)}/remove`, { headers:{ Origin:baseUrl }, data:{ confirmed:true } }).catch(() => {})
  }
  if (dealerContext && fixture) {
    const data = await dealerContext.request.get(`${baseUrl}/api/dealer/bootstrap`).then(response => response.json()).catch(() => null)
    const contract = data?.contracts?.find(item => item.organizationId === fixture.salon.organization.id && item.status === 'ACTIVE')
    if (contract) await dealerContext.request.post(`${baseUrl}/api/dealer/contracts/${encodeURIComponent(contract.id)}/remove`, { headers:{ Origin:baseUrl }, data:{ confirmed:true } }).catch(() => {})
  }
  await browser.close()
}
