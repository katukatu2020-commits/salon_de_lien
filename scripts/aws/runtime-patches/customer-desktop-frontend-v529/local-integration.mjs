import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3135').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-desktop-frontend-v529-integration')
fs.mkdirSync(screenshotDir, { recursive: true })

const routes = [
  ['home', '/u/home'],
  ['appointments', '/u/appointments'],
  ['campaigns', '/u/campaigns'],
  ['profile', '/u/profile'],
  ['coupons', '/u/coupons'],
  ['stores', '/u/stores'],
  ['stamps', '/u/stamps'],
  ['community', '/u/community'],
  ['catalog', '/u/catalog'],
  ['reviews', '/u/reviews'],
  ['history', '/u/history'],
  ['chat', '/u/chat'],
  ['points', '/u/points'],
  ['menu', '/u/menu'],
  ['news', '/u/news'],
]
const screenshots = new Set(['home', 'appointments', 'campaigns', 'profile', 'catalog', 'chat'])
const ignoredReactError = /Minified React error #(418|423)/

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const login = await desktop.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' },
  })
  assert.equal(login.ok(), true, `customer login failed with ${login.status()}`)

  const results = []
  for (const [name, route] of routes) {
    const page = await desktop.newPage()
    const errors = []
    page.on('pageerror', error => {
      if (!ignoredReactError.test(error.message)) errors.push(error.message)
    })
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
    assert.equal(response?.ok(), true, `${route} returned ${response?.status()}`)
    await page.locator('#orimia-customer-desktop-nav-v529').waitFor({ timeout: 12_000 })
    await page.waitForTimeout(350)
    const state = await page.evaluate(() => {
      const sidebar = document.querySelector('#orimia-customer-desktop-nav-v529')
      const header = document.querySelector('#orimia-customer-desktop-header-v529')
      const brand = sidebar?.querySelector('.ocd-brand strong')
      const originalHeader = document.querySelector('.topbar,.customer-premium-topbar')
      const originalNav = document.querySelector('#customer-mobile-bottom-nav')
      const main = document.querySelector('main')
      return {
        shellCount: document.querySelectorAll('#orimia-customer-desktop-nav-v529').length,
        headerCount: document.querySelectorAll('#orimia-customer-desktop-header-v529').length,
        navLinks: sidebar?.querySelectorAll('.ocd-nav-link').length || 0,
        activeLinks: sidebar?.querySelectorAll('[aria-current="page"]').length || 0,
        overflow: document.documentElement.scrollWidth - innerWidth,
        brand: brand?.textContent || '',
        brandFits: Boolean(brand && brand.scrollWidth <= brand.clientWidth),
        sidebarWidth: Math.round(sidebar?.getBoundingClientRect().width || 0),
        rootLeft: Math.round(document.documentElement.getBoundingClientRect().left || 0),
        headerLeft: Math.round(header?.getBoundingClientRect().left || 0),
        mainLeft: Math.round(main?.getBoundingClientRect().left || 0),
        originalHeaderDisplay: originalHeader ? getComputedStyle(originalHeader).display : 'missing',
        originalNavDisplay: originalNav ? getComputedStyle(originalNav).display : 'missing',
        legacyChat: (() => {
          const portal = document.querySelector('.lien-chat-v294-portal')
          if (!portal) return null
          const rect = portal.getBoundingClientRect()
          return { display: getComputedStyle(portal).display, left: Math.round(rect.left), top: Math.round(rect.top) }
        })(),
      }
    })
    assert.equal(state.shellCount, 1)
    assert.equal(state.headerCount, 1)
    assert.equal(state.navLinks, 14)
    assert.equal(state.activeLinks, 1)
    assert.ok(state.overflow <= 0, `${route} overflows by ${state.overflow}px`)
    assert.equal(state.brand, 'ORIMIA for Salon')
    assert.equal(state.brandFits, true)
    assert.equal(state.sidebarWidth, 280)
    assert.equal(state.headerLeft, state.rootLeft + 280)
    assert.equal(state.mainLeft, state.rootLeft + 280)
    assert.equal(state.originalHeaderDisplay, 'none')
    assert.equal(state.originalNavDisplay, 'none')
    if (name === 'chat') {
      assert.equal(state.legacyChat?.display, 'block')
      assert.equal(state.legacyChat?.left, state.rootLeft + 280)
      assert.equal(state.legacyChat?.top, 82)
    }
    assert.deepEqual(errors, [], `${route} produced page errors`)
    if (screenshots.has(name)) await page.screenshot({ path: path.join(screenshotDir, `desktop-${name}.png`), fullPage: true })
    results.push(name)
    await page.close()
  }
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const mobileLogin = await mobile.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' },
  })
  assert.equal(mobileLogin.ok(), true, `mobile customer login failed with ${mobileLogin.status()}`)
  for (const [name, route] of [['home', '/u/home'], ['appointments', '/u/appointments'], ['profile', '/u/profile']]) {
    const page = await mobile.newPage()
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
    await page.waitForTimeout(800)
    const state = await page.evaluate(() => ({
      desktopShell: document.querySelectorAll('#orimia-customer-desktop-nav-v529').length,
      desktopStyle: document.querySelectorAll('#orimia-customer-desktop-style-v529').length,
      desktopFlag: document.documentElement.dataset.orimiaCustomerDesktop || '',
      originalHeaderVisible: Boolean(document.querySelector('.topbar,.customer-premium-topbar') && getComputedStyle(document.querySelector('.topbar,.customer-premium-topbar')).display !== 'none'),
      originalNavVisible: Boolean(document.querySelector('#customer-mobile-bottom-nav') && getComputedStyle(document.querySelector('#customer-mobile-bottom-nav')).display !== 'none'),
      overflow: document.documentElement.scrollWidth - innerWidth,
    }))
    assert.equal(state.desktopShell, 0)
    assert.equal(state.desktopStyle, 0)
    assert.equal(state.desktopFlag, '')
    assert.equal(state.originalHeaderVisible, true)
    assert.equal(state.originalNavVisible, true)
    assert.ok(state.overflow <= 0)
    await page.screenshot({ path: path.join(screenshotDir, `mobile-${name}.png`), fullPage: true })
    await page.close()
  }
  await mobile.close()

  console.log(JSON.stringify({ release: 'customer-desktop-frontend-v529', integrationVerified: true, desktopRoutes: results.length, mobileRoutes: 3, screenshotDir }))
} finally {
  await browser.close()
}
