import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3115').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v537')
fs.mkdirSync(screenshotRoot, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const knownHydrationNoise = /Minified React error #(418|423)/

function recordError(errors, prefix, value) {
  const message = String(value || '')
  if (!knownHydrationNoise.test(message)) errors.push(`${prefix}:${message}`)
}

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/owner-analytics?salesLedger=1' },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function openAugust(page) {
  await page.goto(`${baseUrl}/admin/owner-analytics?salesLedger=1`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.locator('.sl-page').waitFor({ state: 'visible', timeout: 15_000 })
  await page.locator('[data-sl-month]').evaluate(input => {
    input.value = '2026-08'
    input.dispatchEvent(new Event('change', { bubbles:true }))
  })
  await page.waitForFunction(() => document.querySelectorAll('[data-summary-date]').length > 0, null, { timeout: 15_000 })
  await page.waitForFunction(() => !document.querySelector('[data-sl-status]')?.textContent?.includes('読み込んでいます'), null, { timeout: 15_000 })
  await page.locator('#orimia-ui-loader-v536').waitFor({ state:'hidden', timeout:15_000 })
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('.sl-summary-wrap')
    const table = document.querySelector('.sl-daily-table')
    const kpis = [...document.querySelectorAll('.sl-kpi')].map(node => {
      const rect = node.getBoundingClientRect()
      const value = node.querySelector('strong')?.getBoundingClientRect()
      return { width:rect.width, valueRight:value?.right || 0, right:rect.right }
    })
    return {
      bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      wrapClientWidth: wrap?.clientWidth || 0,
      wrapScrollWidth: wrap?.scrollWidth || 0,
      tableWidth: table?.getBoundingClientRect().width || 0,
      rows: document.querySelectorAll('[data-summary-date]').length,
      detailRows: document.querySelectorAll('[data-sl-rows] tr[data-id]').length,
      total: document.querySelector('[data-sl-kpi-total]')?.textContent?.trim() || '',
      kpis,
    }
  })
}

async function stickyDateDelta(page) {
  return page.evaluate(() => {
    const wrap = document.querySelector('.sl-summary-wrap')
    const dateCell = document.querySelector('.sl-summary-date')
    const before = dateCell?.getBoundingClientRect().left || 0
    if (wrap) wrap.scrollLeft = Math.min(520, wrap.scrollWidth - wrap.clientWidth)
    const after = dateCell?.getBoundingClientRect().left || 0
    if (wrap) wrap.scrollLeft = 0
    return Math.abs(after - before)
  })
}

const errors = []
const desktop = await browser.newContext({ viewport: { width:1440, height:1000 }, deviceScaleFactor:1 })
await login(desktop)
const desktopPage = await desktop.newPage()
desktopPage.on('pageerror', error => recordError(errors, 'desktop', error.message))
desktopPage.on('console', message => { if (message.type() === 'error') recordError(errors, 'desktop-console', message.text()) })
await openAugust(desktopPage)
await desktopPage.screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v537-desktop.png'), fullPage:true })
await desktopPage.locator('.sl-daily-card').screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v537-desktop-summary.png') })
const desktopMetrics = await pageMetrics(desktopPage)
assert.ok(desktopMetrics.rows > 0)
assert.match(desktopMetrics.total, /円$/)
assert.ok(desktopMetrics.wrapScrollWidth > desktopMetrics.wrapClientWidth, 'desktop summary table should scroll within its own region')
assert.ok(desktopMetrics.bodyOverflow <= 2, `desktop page overflowed by ${desktopMetrics.bodyOverflow}px`)
assert.ok(desktopMetrics.kpis.every(kpi => kpi.valueRight <= kpi.right + 1), 'desktop KPI text overflowed')
assert.ok(await stickyDateDelta(desktopPage) <= 1, 'desktop date column did not remain fixed')

await desktopPage.locator('[data-summary-day]').first().click()
await desktopPage.waitForFunction(() => !document.querySelector('[data-sl-clear-day]')?.hidden)
assert.ok(await desktopPage.locator('[data-summary-date].active').count())
assert.ok(await desktopPage.locator('[data-sl-rows] tr[data-id]').count())
await desktopPage.screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v537-day-detail.png'), fullPage:true })
await desktopPage.locator('[data-sl-clear-day]').click()
assert.equal(await desktopPage.locator('[data-sl-clear-day]').isHidden(), true)
await desktopPage.locator('[data-sl-rows] [data-edit]').first().click()
assert.equal(await desktopPage.locator('[data-sl-dialog]').getAttribute('open'), '')
assert.ok(await desktopPage.locator('[data-sl-edit-form] [name="paidAt"]').count())
await desktopPage.locator('[data-sl-dialog] [data-close]').first().click()

const mobile = await browser.newContext({ viewport: { width:390, height:844 }, deviceScaleFactor:1 })
await login(mobile)
const mobilePage = await mobile.newPage()
mobilePage.on('pageerror', error => recordError(errors, 'mobile', error.message))
mobilePage.on('console', message => { if (message.type() === 'error') recordError(errors, 'mobile-console', message.text()) })
await openAugust(mobilePage)
await mobilePage.screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v537-mobile.png'), fullPage:true })
await mobilePage.locator('.sl-daily-card').scrollIntoViewIfNeeded()
await mobilePage.screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v537-mobile-summary.png'), fullPage:false })
const mobileMetrics = await pageMetrics(mobilePage)
assert.ok(mobileMetrics.rows > 0)
assert.ok(mobileMetrics.wrapScrollWidth > mobileMetrics.wrapClientWidth, 'mobile summary table should scroll within its own region')
assert.ok(mobileMetrics.bodyOverflow <= 2, `mobile page overflowed by ${mobileMetrics.bodyOverflow}px`)
assert.ok(mobileMetrics.kpis.every(kpi => kpi.valueRight <= kpi.right + 1), 'mobile KPI text overflowed')
assert.ok(await stickyDateDelta(mobilePage) <= 1, 'mobile date column did not remain fixed')
assert.equal(errors.length, 0, errors.join('\n'))

await mobile.close()
await desktop.close()
await browser.close()

console.log(JSON.stringify({
  release: 'sales-ledger-daily-summary-v537',
  desktop: desktopMetrics,
  mobile: mobileMetrics,
  screenshots: screenshotRoot,
}))
