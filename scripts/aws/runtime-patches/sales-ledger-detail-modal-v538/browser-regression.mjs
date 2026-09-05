import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3115').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v538')
fs.mkdirSync(screenshotRoot, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
const knownHydrationNoise = /Minified React error #(418|423)/

function recordError(errors, prefix, value) {
  const message = String(value || '')
  if (!knownHydrationNoise.test(message)) errors.push(`${prefix}:${message}`)
}

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics?salesLedger=1' },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function openAugust(page) {
  await page.goto(`${baseUrl}/admin/owner-analytics?salesLedger=1`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.sl-page').waitFor({ state:'visible', timeout:15_000 })
  await page.locator('[data-sl-month]').evaluate(input => {
    input.value = '2026-08'
    input.dispatchEvent(new Event('change', { bubbles:true }))
  })
  await page.waitForFunction(() => document.querySelectorAll('[data-summary-date]').length > 0, null, { timeout:15_000 })
  await page.waitForFunction(() => !document.querySelector('[data-sl-status]')?.textContent?.includes('読み込んでいます'), null, { timeout:15_000 })
  await page.locator('#orimia-ui-loader-v536').waitFor({ state:'hidden', timeout:15_000 })
}

async function openFirstDetail(page) {
  const day = page.locator('[data-summary-date]').first()
  const selectedDate = await day.getAttribute('data-summary-date')
  await day.locator('[data-summary-day]').click()
  const dialog = page.locator('[data-sl-detail-dialog]')
  await dialog.waitFor({ state:'visible' })
  await page.waitForFunction(() => document.querySelector('[data-sl-detail-dialog]')?.open)
  await page.waitForFunction(() => document.querySelectorAll('[data-sl-rows] tr[data-id]').length > 0)
  return { dialog, selectedDate }
}

async function modalMetrics(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[data-sl-detail-dialog]')
    const wrap = document.querySelector('.sl-detail-table-wrap')
    const heading = document.querySelector('.sl-detail-copy')
    const close = document.querySelector('[data-sl-detail-close]')
    const rect = dialog?.getBoundingClientRect()
    const headingRect = heading?.getBoundingClientRect()
    const closeRect = close?.getBoundingClientRect()
    return {
      open:Boolean(dialog?.open),
      left:rect?.left || 0,
      top:rect?.top || 0,
      right:rect?.right || 0,
      bottom:rect?.bottom || 0,
      height:rect?.height || 0,
      viewportWidth:innerWidth,
      viewportHeight:innerHeight,
      wrapClientWidth:wrap?.clientWidth || 0,
      wrapScrollWidth:wrap?.scrollWidth || 0,
      headingRight:headingRect?.right || 0,
      closeLeft:closeRect?.left || 0,
      bodyOverflow:Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      computedHeight:dialog ? getComputedStyle(dialog).height : '',
      shellHeight:document.querySelector('.sl-detail-dialog-shell')?.getBoundingClientRect().height || 0,
      bodyHeight:document.querySelector('.sl-detail-dialog-body')?.getBoundingClientRect().height || 0,
    }
  })
}

function assertModalBounds(metrics, label, expectHorizontalScroll = false) {
  assert.equal(metrics.open, true, `${label} detail dialog did not open`)
  assert.ok(metrics.left >= -1 && metrics.top >= -1, `${label} detail dialog started outside viewport`)
  assert.ok(metrics.right <= metrics.viewportWidth + 1, `${label} detail dialog overflowed horizontally`)
  assert.ok(metrics.bottom <= metrics.viewportHeight + 1, `${label} detail dialog overflowed vertically`)
  if (expectHorizontalScroll) assert.ok(metrics.wrapScrollWidth > metrics.wrapClientWidth, `${label} detail table should scroll inside the dialog`)
  assert.ok(metrics.headingRight <= metrics.closeLeft + 1, `${label} detail heading overlapped the close button`)
  assert.ok(metrics.bodyOverflow <= 2, `${label} page overflowed by ${metrics.bodyOverflow}px`)
}

const errors = []
const desktop = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
await login(desktop)
const desktopPage = await desktop.newPage()
desktopPage.on('pageerror', error => recordError(errors, 'desktop', error.message))
desktopPage.on('console', message => { if (message.type() === 'error') recordError(errors, 'desktop-console', message.text()) })
await openAugust(desktopPage)
assert.equal(await desktopPage.locator('[data-sl-detail-card]').count(), 0, 'permanent detail card should be removed')
assert.equal(await desktopPage.locator('[data-sl-detail-dialog]').isVisible(), false, 'detail dialog should initially be closed')
const desktopDetail = await openFirstDetail(desktopPage)
assert.ok(desktopDetail.selectedDate)
assert.equal(await desktopPage.locator('[data-summary-date].active').getAttribute('data-summary-date'), desktopDetail.selectedDate)
assert.match(await desktopPage.locator('[data-sl-detail-filter]').textContent(), /^2026年8月\d+日/)
const desktopModal = await modalMetrics(desktopPage)
assertModalBounds(desktopModal, 'desktop')
await desktopPage.screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v538-desktop-context.png'), fullPage:false })
await desktopDetail.dialog.screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v538-desktop-detail.png') })
const firstDetailCheckbox = desktopPage.locator('[data-sl-rows] tr[data-id] input[type=checkbox]').first()
await firstDetailCheckbox.check()
assert.equal(await desktopPage.locator('[data-sl-bulk]').isEnabled(), true)
await desktopPage.locator('[data-sl-rows] [data-edit]').first().click()
await desktopPage.waitForFunction(() => document.querySelector('[data-sl-dialog]')?.open)
assert.equal(await desktopPage.locator('[data-sl-detail-dialog]').isVisible(), false, 'detail dialog should yield to correction dialog')
await desktopPage.locator('[data-sl-dialog] [data-close]').first().click()
await desktopPage.waitForFunction(() => document.querySelector('[data-sl-detail-dialog]')?.open)
assert.ok(await desktopPage.locator('[data-sl-rows] tr[data-id]').count())
await desktopPage.locator('[data-sl-detail-close]').click()
await desktopPage.waitForFunction(() => !document.querySelector('[data-sl-detail-dialog]')?.open)
assert.equal(await desktopPage.locator('[data-summary-date].active').count(), 0)

const mobile = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
await login(mobile)
const mobilePage = await mobile.newPage()
mobilePage.on('pageerror', error => recordError(errors, 'mobile', error.message))
mobilePage.on('console', message => { if (message.type() === 'error') recordError(errors, 'mobile-console', message.text()) })
await openAugust(mobilePage)
assert.equal(await mobilePage.locator('[data-sl-detail-card]').count(), 0)
const mobileDetail = await openFirstDetail(mobilePage)
const mobileModal = await modalMetrics(mobilePage)
assertModalBounds(mobileModal, 'mobile', true)
await mobilePage.screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v538-mobile-context.png'), fullPage:false })
await mobileDetail.dialog.screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v538-mobile-detail.png') })
await mobilePage.keyboard.press('Escape')
await mobilePage.waitForFunction(() => !document.querySelector('[data-sl-detail-dialog]')?.open)
assert.equal(await mobilePage.locator('[data-summary-date].active').count(), 0)
assert.equal(errors.length, 0, errors.join('\n'))

await mobile.close()
await desktop.close()
await browser.close()

console.log(JSON.stringify({
  release:'sales-ledger-detail-modal-v538',
  desktopDate:desktopDetail.selectedDate,
  mobileDate:mobileDetail.selectedDate,
  desktopModal,
  mobileModal,
  screenshots:screenshotRoot,
}))
