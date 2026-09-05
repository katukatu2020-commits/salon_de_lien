import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3123').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v546')
fs.mkdirSync(screenshotRoot, { recursive: true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' },
  })
  assert.equal(response.ok(), true, `customer login failed with ${response.status()}`)
}

async function waitForCustomerContent(page) {
  await page.waitForFunction(() => {
    const text = document.body?.innerText || ''
    return Boolean(document.querySelector('.customer-premium-topbar,.topbar,.app-header'))
      && !text.includes('ページを移動しています')
      && !text.includes('画面を準備しています')
  }, null, { timeout: 15_000 })
}

async function primeHistory(page) {
  await page.goto(`${baseUrl}/u/home`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
  await page.waitForFunction(() => typeof window.__orimiaCustomerNavigateBackV546 === 'function')
  await page.evaluate(() => sessionStorage.removeItem('orimia:customer-path-stack:v518'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => typeof window.__orimiaCustomerNavigateBackV546 === 'function')
  await page.goto(`${baseUrl}/u/community?sort=latest`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
  await page.waitForFunction(() => typeof window.__orimiaCustomerNavigateBackV546 === 'function')
  await page.evaluate(() => {
    history.pushState({}, '', '/u/community?sort=oldest&page=2')
    const mutation = document.createElement('span')
    mutation.hidden = true
    mutation.dataset.navigationTest = 'v546'
    document.body.appendChild(mutation)
  })
  await page.waitForFunction(() => {
    const routes = JSON.parse(sessionStorage.getItem('orimia:customer-path-stack:v518') || '[]')
    return routes.at(-1) === '/u/community?sort=oldest&page=2'
  })
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const mobile = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
  await login(mobile)
  const mobilePage = await mobile.newPage()
  const mobileErrors = []
  mobilePage.on('pageerror', error => mobileErrors.push(error.message))
  await primeHistory(mobilePage)
  const mobileBack = mobilePage.locator('[data-customer-shell-back-v518]')
  await mobileBack.waitFor({ state: 'visible' })
  await mobileBack.click()
  await mobilePage.waitForURL(url => url.pathname === '/u/home', { timeout: 10_000 })
  await waitForCustomerContent(mobilePage)
  assert.equal(new URL(mobilePage.url()).pathname, '/u/home')

  await mobilePage.goto(`${baseUrl}/u/community`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
  const detailLink = mobilePage.locator('a[href^="/u/community/"]').first()
  if (await detailLink.count()) {
    await detailLink.click()
    await mobilePage.waitForURL(/\/u\/community\/[^/?#]+/)
    await mobilePage.locator('.community-detail-page article').waitFor({ state: 'visible', timeout: 15_000 })
    await waitForCustomerContent(mobilePage)
    assert.equal(await mobilePage.getByText('公開中', { exact: true }).count(), 0)
  }
  const mobileScreenshot = path.join(screenshotRoot, 'customer-navigation-privacy-v546-mobile.png')
  await mobilePage.screenshot({ path: mobileScreenshot, fullPage: true })
  assert.deepEqual(mobileErrors.filter(message => !/Minified React error #(418|423)/.test(message)), [])
  await mobile.close()

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await login(desktop)
  const desktopPage = await desktop.newPage()
  const desktopErrors = []
  desktopPage.on('pageerror', error => desktopErrors.push(error.message))
  await primeHistory(desktopPage)
  const desktopBack = desktopPage.locator('[data-ocd-back]')
  await desktopBack.waitFor({ state: 'visible' })
  await desktopBack.click()
  await desktopPage.waitForURL(url => url.pathname === '/u/home', { timeout: 10_000 })
  await waitForCustomerContent(desktopPage)
  assert.equal(new URL(desktopPage.url()).pathname, '/u/home')
  const desktopScreenshot = path.join(screenshotRoot, 'customer-navigation-privacy-v546-desktop.png')
  await desktopPage.screenshot({ path: desktopScreenshot, fullPage: true })
  assert.deepEqual(desktopErrors.filter(message => !/Minified React error #(418|423)/.test(message)), [])
  await desktop.close()

  console.log(JSON.stringify({
    release: 'customer-navigation-privacy-v546',
    browserVerified: true,
    mobileBack: true,
    desktopBack: true,
    customerStatusHidden: true,
    mobileScreenshot,
    desktopScreenshot,
  }, null, 2))
} finally {
  await browser.close()
}
