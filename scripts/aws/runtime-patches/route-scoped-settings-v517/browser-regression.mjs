import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3122').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || os.tmpdir()
const panelSelector = '#lien-external-integrations-v492'

const browser = await chromium.launch({ executablePath, headless: true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: {
      email: 'demo.owner',
      password: 'LienDemo2026!',
      next: '/admin/settings',
    },
  })
  assert.ok(response.ok(), `admin login failed with ${response.status()}`)
}

async function waitForCurrentUi(page) {
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout: 8000 })
}

async function openExternalIntegrations(page) {
  await page.goto(`${baseUrl}/admin/settings?verify=v517`)
  await waitForCurrentUi(page)
  const tab = page.locator('[data-settings-panel="line"]').first()
  await tab.click()
  await page.locator(panelSelector).waitFor({ state: 'visible', timeout: 5000 })
  assert.equal(await page.locator(panelSelector).count(), 1)
  assert.match(await page.locator(panelSelector).innerText(), /外部アプリ連携/)
}

async function leaveSettings(page, href, expectedPath, label) {
  const links = page.locator(`a[href="${href}"]`)
  assert.ok(await links.count(), `${label}: navigation link ${href} was not found`)
  await links.evaluateAll(nodes => {
    const target = nodes.find(node => node instanceof HTMLElement && node.offsetParent !== null) || nodes[0]
    target.click()
  })
  await page.waitForFunction(pathname => location.pathname === pathname, expectedPath, { timeout: 8000 })
  await waitForCurrentUi(page)
  await page.waitForTimeout(250)

  const state = await page.evaluate(selector => ({
    pathname: location.pathname,
    panelCount: document.querySelectorAll(selector).length,
    mainText: document.querySelector('main')?.innerText || '',
    overflow: document.body.scrollWidth - innerWidth,
  }), panelSelector)
  assert.equal(state.panelCount, 0, `${label}: settings-only panel remained on ${state.pathname}`)
  assert.doesNotMatch(state.mainText.slice(0, 800), /外部アプリ連携|Hotpepper予約受信用メール/)
  return state
}

async function returnToExternalIntegrations(page) {
  await page.goBack({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => location.pathname === '/admin/settings', null, { timeout: 8000 })
  await waitForCurrentUi(page)
  await page.locator('[data-settings-panel="line"]').first().click()
  await page.locator(panelSelector).waitFor({ state: 'visible', timeout: 5000 })
  assert.equal(await page.locator(panelSelector).count(), 1, 'settings return: external panel was not recreated')
  assert.equal(await page.locator(`${panelSelector} #lien-line-settings-v436`).count(), 1, 'settings return: LINE card was not recreated')
  assert.equal(await page.locator(`${panelSelector} #lien-hotpepper-settings-v492`).count(), 1, 'settings return: Hotpepper card was not recreated')
}

const results = {}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await login(desktop)
  const desktopPage = await desktop.newPage()

  await openExternalIntegrations(desktopPage)
  results.appointments = await leaveSettings(
    desktopPage,
    '/admin/appointments',
    '/admin/appointments',
    'appointments transition',
  )
  await desktopPage.screenshot({
    path: path.join(screenshotRoot, 'orimia-v517-settings-to-appointments-desktop.png'),
    fullPage: false,
  })

  await returnToExternalIntegrations(desktopPage)
  results.settingsReturn = {
    panelCount: await desktopPage.locator(panelSelector).count(),
    lineCardCount: await desktopPage.locator(`${panelSelector} #lien-line-settings-v436`).count(),
  }
  await desktopPage.screenshot({
    path: path.join(screenshotRoot, 'orimia-v517-appointments-back-to-settings-desktop.png'),
    fullPage: false,
  })

  await openExternalIntegrations(desktopPage)
  results.products = await leaveSettings(
    desktopPage,
    '/admin/products?section=menus',
    '/admin/products',
    'products transition',
  )
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await login(mobile)
  const mobilePage = await mobile.newPage()
  await openExternalIntegrations(mobilePage)
  results.mobileAppointments = await leaveSettings(
    mobilePage,
    '/admin/appointments',
    '/admin/appointments',
    'mobile appointments transition',
  )
  assert.ok(results.mobileAppointments.overflow <= 1, `mobile page overflowed by ${results.mobileAppointments.overflow}px`)
  await mobilePage.screenshot({
    path: path.join(screenshotRoot, 'orimia-v517-settings-to-appointments-mobile.png'),
    fullPage: false,
  })
  await mobile.close()

  console.log(JSON.stringify({ release: 'route-scoped-settings-v517', verified: true, results }, null, 2))
} finally {
  await browser.close()
}
