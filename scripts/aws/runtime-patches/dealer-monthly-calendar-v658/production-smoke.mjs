import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'dealer-monthly-calendar-v658', 'production')
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/chromium')
fs.mkdirSync(output, { recursive: true })

const health = await fetch(`${baseUrl}/api/health/ready`, { redirect: 'manual' })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-dealer-monthly-calendar'), 'v658')
assert.equal(health.headers.get('x-lien-mobile-workspaces'), 'v657')

const stylesheet = await fetch(`${baseUrl}/dealer-monthly-calendar-v658.css?v=658-release1`)
assert.equal(stylesheet.status, 200)
const css = await stylesheet.text()
assert.match(css, /\.wo-dealer-calendar-v658/)
assert.match(css, /repeat\(7, minmax\(0, 1fr\)\)/)

const protectedPage = await fetch(`${baseUrl}/dealer/calendar`, { redirect: 'manual' })
assert.ok([302, 303].includes(protectedPage.status))
assert.match(protectedPage.headers.get('location') || '', /^\/dealer\/login/)

const loginPage = await fetch(`${baseUrl}/dealer/login`)
assert.equal(loginPage.status, 200)
const loginHtml = await loginPage.text()
assert.match(loginHtml, /id="orimia-dealer-monthly-calendar-v658"/)

const loginId = String(process.env.DEALER_SMOKE_LOGIN_ID || '').trim()
const password = String(process.env.DEALER_SMOKE_PASSWORD || '')
let authenticated = false

if (loginId && password) {
  const browser = await chromium.launch({ executablePath, headless: true })
  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 960 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
      const login = await context.request.post(`${baseUrl}/api/dealer/auth/login`, {
        form: { loginId, password, next: '/dealer/calendar' },
      })
      assert.ok(login.ok(), `Dealer login failed: ${login.status()}`)
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(`${baseUrl}/dealer/calendar`, { waitUntil: 'networkidle', timeout: 45_000 })
      await page.locator('.wo-dealer-calendar-v658').waitFor({ state: 'visible', timeout: 20_000 })
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        columns: getComputedStyle(document.querySelector('.wo-calendar-grid-v658')).gridTemplateColumns.split(' ').length,
        days: document.querySelectorAll('.wo-calendar-day-v658:not(.is-outside)').length,
        navigationItems: document.querySelectorAll('.wo-dealer-mobile-nav a').length,
      }))
      assert.ok(metrics.overflow <= 2, `${viewport.name} overflowed by ${metrics.overflow}px`)
      assert.equal(metrics.columns, 7)
      assert.ok(metrics.days >= 28 && metrics.days <= 31)
      assert.equal(metrics.navigationItems, 7)
      assert.deepEqual(errors, [])
      await page.screenshot({ path: path.join(output, `${viewport.name}.png`), fullPage: true })
      await context.close()
    }
    authenticated = true
  } finally {
    await browser.close()
  }
}

console.log(JSON.stringify({ release: 'dealer-monthly-calendar-v658', productionVerified: true, authenticated, output }))
