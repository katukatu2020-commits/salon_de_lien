import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3153').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-dealer-company-billing-v584')
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

async function createFixture(context) {
  const loginId = `dealer.browser.v584.${runId}`
  const password = `Dealer-Browser-V584-${runId}!`
  const email = `${loginId}@example.test`
  const invite = await json(await context.request.post(`${baseUrl}/api/admin/wholesale/invites`, {
    headers:{ Origin:baseUrl },
    data:{ dealerName:`V584 Browser Dealer ${runId}`, loginId, email, phone:'086-555-2584' },
  }), 'dealer invite')
  const setupUrl = new URL(invite.setupUrl)
  const setup = await context.request.post(`${baseUrl}/api/dealer/auth/setup`, {
    headers:{ Origin:baseUrl },
    form:{ token:setupUrl.searchParams.get('token'), password, passwordConfirm:password },
    maxRedirects:0,
  })
  assert.equal(setup.status(), 303, 'dealer setup failed')
  return { invite, loginId, password, email }
}

async function loginDealer(context, fixture) {
  const response = await context.request.post(`${baseUrl}/api/dealer/auth/login`, {
    headers:{ Origin:baseUrl },
    form:{ loginId:fixture.loginId, password:fixture.password, next:'/dealer/products' },
    maxRedirects:0,
  })
  assert.equal(response.status(), 303, 'dealer login failed')
  assert.equal(new URL(response.headers().location, baseUrl).pathname, '/dealer/billing')
  const profile = await json(await context.request.get(`${baseUrl}/api/dealer/profile`), 'dealer profile')
  fixture.dealerCode = profile.profile.dealerCode
  assert.match(fixture.dealerCode, /^DLR-[A-F0-9]{10}$/)
}

async function noOverflow(page, label) {
  const state = await page.evaluate(() => ({
    document:document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body:document.body.scrollWidth - document.body.clientWidth,
  }))
  assert.ok(state.document <= 1 && state.body <= 1, `${label} has horizontal overflow: ${JSON.stringify(state)}`)
}

async function openBilling(page, label) {
  await page.goto(`${baseUrl}/dealer/billing`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.wo-billing-workspace').waitFor({ state:'visible', timeout:15_000 })
  assert.equal(await page.locator('.wo-dealer-sidebar nav a').count(), 6)
  await page.getByRole('heading', { name:'システム利用料', exact:true }).last().waitFor({ state:'visible' })
  const checkout = page.locator('[data-action="start-billing-checkout"]')
  await checkout.waitFor({ state:'visible' })
  assert.equal(await checkout.isDisabled(), true)
  await page.locator('#dealer-billing-agreement').check()
  assert.equal(await checkout.isEnabled(), true, `${label}: checkout did not enable after agreement`)
  await noOverflow(page, `${label} billing`)
  await page.evaluate(() => window.scrollTo(0, 0))
}

async function openCompany(page, fixture, label) {
  await page.goto(`${baseUrl}/dealer/company`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('#dealer-company-form').waitFor({ state:'visible', timeout:15_000 })
  await page.locator('input[name="companyName"]').fill(`ORIMIA Partner Browser ${runId}`)
  await page.locator('input[name="storeName"]').fill('岡山営業所')
  await page.locator('input[name="representativeName"]').fill('山田 花子')
  await page.locator('input[name="invoiceRegistrationNumber"]').fill('T1234567890123')
  await page.locator('input[name="prefecture"]').fill('岡山県')
  await page.locator('input[name="city"]').fill('岡山市北区')
  await page.locator('input[name="addressLine1"]').fill('柳町1-5-25')
  await page.locator('input[name="websiteUrl"]').fill('https://example.test/dealer')
  await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/dealer/profile') && response.request().method() === 'POST' && response.status() === 200),
    page.getByRole('button', { name:/会社・店舗情報を保存/ }).click(),
  ])
  await page.locator('#wo-toast').getByText('会社・店舗情報を保存しました。').waitFor({ state:'visible' })
  assert.equal(await page.locator('input[name="storeName"]').inputValue(), '岡山営業所')
  assert.equal(await page.locator('input[name="email"]').inputValue(), fixture.email)
  assert.equal((await page.locator('.wo-company-account').textContent()).includes(fixture.dealerCode), true)
  await noOverflow(page, `${label} company`)
  await page.evaluate(() => window.scrollTo(0, 0))
}

const browser = await chromium.launch({ executablePath, headless:true })
try {
  const adminContext = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await loginAdmin(adminContext)
  const fixture = await createFixture(adminContext)

  const desktop = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await loginDealer(desktop, fixture)
  const desktopPage = await desktop.newPage()
  watch(desktopPage, 'dealer-desktop')

  await openBilling(desktopPage, 'desktop')
  await desktopPage.screenshot({ path:path.join(artifactRoot, 'dealer-billing-desktop.png'), fullPage:true })

  await desktopPage.goto(`${baseUrl}/dealer/products`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await desktopPage.locator('.wo-billing-workspace').waitFor({ state:'visible', timeout:15_000 })
  assert.equal(new URL(desktopPage.url()).pathname, '/dealer/billing')
  assert.equal(new URL(desktopPage.url()).searchParams.get('required'), '1')

  await openCompany(desktopPage, fixture, 'desktop')
  await desktopPage.screenshot({ path:path.join(artifactRoot, 'dealer-company-desktop.png'), fullPage:true })
  await desktop.close()

  const mobile = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  await loginDealer(mobile, fixture)
  const mobilePage = await mobile.newPage()
  watch(mobilePage, 'dealer-mobile')
  await openBilling(mobilePage, 'mobile')
  assert.equal(await mobilePage.locator('.wo-dealer-mobile-nav a').count(), 6)
  await mobilePage.screenshot({ path:path.join(artifactRoot, 'dealer-billing-mobile.png'), fullPage:true })
  await openCompany(mobilePage, fixture, 'mobile')
  await mobilePage.screenshot({ path:path.join(artifactRoot, 'dealer-company-mobile.png'), fullPage:true })
  await mobile.close()
  await adminContext.close()

  assert.deepEqual(errors, [])
  console.log(JSON.stringify({
    release:'dealer-company-billing-v584',
    desktop:true,
    mobile:true,
    companyProfile:true,
    paymentAgreement:true,
    unpaidRedirect:true,
    sixItemNavigation:true,
    noHorizontalOverflow:true,
    screenshots:artifactRoot,
  }))
} finally {
  await browser.close()
}
