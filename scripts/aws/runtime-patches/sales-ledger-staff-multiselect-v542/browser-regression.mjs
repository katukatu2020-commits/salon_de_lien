import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3118').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-staff-multiselect-v542')
fs.mkdirSync(artifactRoot, { recursive:true })

const knownHydrationNoise = /Minified React error #(418|423)/
const errors = []
const browser = await chromium.launch({ executablePath, headless:true })

function recordError(prefix, value) {
  const message = String(value || '')
  if (!knownHydrationNoise.test(message)) errors.push(`${prefix}:${message}`)
}

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics?salesLedger=1' },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function report(context, staff = null) {
  const params = new URLSearchParams({ from:'2026-08-01', to:'2026-08-31' })
  if (staff instanceof Array) {
    if (staff.length) staff.forEach(name => params.append('staff', name))
    else params.set('staffMode', 'none')
  }
  const response = await context.request.get(`${baseUrl}/api/admin/sales-ledger?${params}`)
  assert.ok(response.ok(), `report failed with ${response.status()}`)
  return response.json()
}

async function openAugust(page) {
  await page.goto(`${baseUrl}/admin/owner-analytics?salesLedger=1`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.sl-page').waitFor({ state:'visible', timeout:15_000 })
  await page.locator('[data-sl-month]').evaluate(input => {
    input.value = '2026-08'
    input.dispatchEvent(new Event('change', { bubbles:true }))
  })
  await page.waitForFunction(() => document.querySelectorAll('[data-summary-date]').length > 0, null, { timeout:15_000 })
  await page.waitForFunction(() => document.querySelectorAll('[data-sl-staff-option]').length >= 2, null, { timeout:15_000 })
  await page.locator('#orimia-ui-loader-v536').waitFor({ state:'hidden', timeout:15_000 })
}

function responseForStaff(page, expected, none = false) {
  return page.waitForResponse(response => {
    const url = new URL(response.url())
    if (url.pathname !== '/api/admin/sales-ledger') return false
    const actual = url.searchParams.getAll('staff')
    return none
      ? url.searchParams.get('staffMode') === 'none'
      : url.searchParams.get('staffMode') !== 'none' && actual.length === expected.length && expected.every(name => actual.includes(name))
  }, { timeout:15_000 })
}

const numberText = async locator => Number((await locator.textContent()).replace(/[^0-9]/g, ''))

async function waitForSummary(page, payload, caption) {
  await page.waitForFunction(({ rowCount, gross, caption }) => {
    const rows = document.querySelectorAll('[data-summary-date]').length
    const total = Number((document.querySelector('[data-sl-kpi-total]')?.textContent || '').replace(/[^0-9]/g, ''))
    const period = document.querySelector('[data-sl-summary-period]')?.textContent || ''
    return rows === rowCount && total === gross && period.includes(caption)
  }, { rowCount:payload.summary.days.length, gross:payload.summary.totals.grossTotal, caption }, { timeout:15_000 })
}

async function verifyDesktop(staff) {
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await login(context)
  const page = await context.newPage()
  page.on('pageerror', error => recordError('desktop', error.message))
  page.on('console', message => { if (message.type() === 'error') recordError('desktop-console', message.text()) })
  await openAugust(page)

  assert.equal(await page.locator('[data-sl-summary-staff]').count(), 1)
  assert.equal(await page.locator('[data-sl-summary-staff] select').count(), 0)
  assert.equal(await page.locator('[data-sl-staff-label]').textContent(), 'すべてのスタッフ')
  assert.equal(await page.locator('[data-sl-staff-option]:checked').count(), await page.locator('[data-sl-staff-option]').count())

  await page.locator('[data-sl-staff-trigger]').click()
  await page.locator('[data-sl-staff-popover]').waitFor({ state:'visible' })
  assert.equal(await page.locator('[data-sl-staff-trigger]').getAttribute('aria-expanded'), 'true')

  const noneResponse = responseForStaff(page, [], true)
  await page.locator('[data-sl-staff-all]').uncheck()
  const nonePayload = await (await noneResponse).json()
  await waitForSummary(page, nonePayload, '未選択')
  assert.equal(await page.locator('[data-sl-staff-label]').textContent(), 'スタッフ未選択')
  assert.equal(await page.locator('[data-summary-date]').count(), 0)
  assert.equal(await page.locator('[data-sl-print]').isDisabled(), true)
  assert.equal(await page.locator('[data-sl-staff-popover]').isVisible(), true)

  const firstResponse = responseForStaff(page, [staff[0]])
  await page.locator('[data-sl-staff-options]').getByLabel(staff[0], { exact:true }).check()
  const firstPayload = await (await firstResponse).json()
  await waitForSummary(page, firstPayload, staff[0])
  assert.equal(await page.locator('[data-sl-staff-label]').textContent(), staff[0])
  assert.ok(firstPayload.rows.every(row => row.staffName === staff[0]))
  assert.equal(await page.locator('[data-sl-staff-popover]').isVisible(), true)

  const multipleResponse = responseForStaff(page, staff)
  await page.locator('[data-sl-staff-options]').getByLabel(staff[1], { exact:true }).check()
  const multiplePayload = await (await multipleResponse).json()
  await waitForSummary(page, multiplePayload, staff.join('、'))
  assert.equal(await page.locator('[data-sl-staff-label]').textContent(), '2名を選択')
  assert.ok(multiplePayload.rows.every(row => staff.includes(row.staffName)))
  assert.equal(await numberText(page.locator('[data-sl-kpi-count]')), multiplePayload.summary.totals.transactions)
  const displayedStaff = await page.locator('[data-sl-summary-head] .sl-staff-col').allTextContents()
  assert.deepEqual(displayedStaff, multiplePayload.summary.staff)
  assert.ok(displayedStaff.every(name => staff.includes(name)))

  const selectedDate = await page.locator('[data-summary-date]').first().getAttribute('data-summary-date')
  await page.locator('[data-summary-date]').first().locator('[data-summary-day]').click()
  await page.locator('[data-sl-detail-dialog]').waitFor({ state:'visible' })
  assert.equal(
    await page.locator('[data-sl-rows] tr[data-id]').count(),
    multiplePayload.rows.filter(row => row.saleDate === selectedDate).length,
  )
  await page.locator('[data-sl-detail-close]').click()
  await page.waitForFunction(() => !document.querySelector('[data-sl-detail-dialog]')?.open)

  await page.keyboard.press('Escape')
  assert.equal(await page.locator('[data-sl-staff-popover]').isHidden(), true)
  const printMetrics = await page.evaluate(() => window.__orimiaDailySalesPrintV541.prepare())
  assert.equal(printMetrics.rowCount, multiplePayload.summary.days.length)
  assert.equal(printMetrics.columnCount, 16 + multiplePayload.summary.staff.length)
  await page.emulateMedia({ media:'print' })
  const printState = await page.evaluate(() => {
    const host = document.querySelector('#orimia-daily-sales-print-host-v541')
    return {
      hostDisplay:getComputedStyle(host).display,
      sourceDisplay:getComputedStyle(document.querySelector('.sl-ledger-portal')).display,
      rows:host.querySelectorAll('[data-summary-date]').length,
      staff:[...host.querySelectorAll('[data-sl-summary-head] .sl-staff-col')].map(cell => cell.textContent.trim()),
      caption:host.querySelector('[data-sl-summary-period]')?.textContent || '',
      actions:host.querySelectorAll('.sl-summary-head-actions').length,
    }
  })
  assert.equal(printState.hostDisplay, 'block')
  assert.equal(printState.sourceDisplay, 'none')
  assert.equal(printState.rows, multiplePayload.summary.days.length)
  assert.deepEqual(printState.staff, multiplePayload.summary.staff)
  assert.ok(printState.caption.includes(staff.join('、')))
  assert.equal(printState.actions, 0)
  await page.screenshot({ path:path.join(artifactRoot, 'staff-multiselect-v542-print.png'), fullPage:true })
  await page.pdf({
    path:path.join(artifactRoot, 'staff-multiselect-v542-print.pdf'),
    format:'A4',
    landscape:true,
    printBackground:true,
    preferCSSPageSize:true,
  })
  await page.emulateMedia({ media:'screen' })
  await page.evaluate(() => window.__orimiaDailySalesPrintV541.cleanup())

  const oneResponse = responseForStaff(page, [staff[0]])
  await page.locator('[data-sl-staff-trigger]').click()
  await page.locator('[data-sl-staff-options]').getByLabel(staff[1], { exact:true }).uncheck()
  const onePayload = await (await oneResponse).json()
  await waitForSummary(page, onePayload, staff[0])

  const allResponse = responseForStaff(page, [])
  await page.locator('[data-sl-staff-all]').check()
  const allPayload = await (await allResponse).json()
  await waitForSummary(page, allPayload, 'すべて')
  assert.equal(await page.locator('[data-sl-staff-label]').textContent(), 'すべてのスタッフ')
  assert.equal(await page.locator('[data-sl-staff-option]:checked').count(), await page.locator('[data-sl-staff-option]').count())

  await page.screenshot({ path:path.join(artifactRoot, 'staff-multiselect-v542-desktop.png'), fullPage:false })
  await context.close()
  return {
    selectedStaff:staff,
    multipleRows:multiplePayload.rows.length,
    multipleDays:multiplePayload.summary.days.length,
    displayedStaff,
    printState,
  }
}

async function verifyMobile() {
  const context = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  await login(context)
  const page = await context.newPage()
  page.on('pageerror', error => recordError('mobile', error.message))
  page.on('console', message => { if (message.type() === 'error') recordError('mobile-console', message.text()) })
  await openAugust(page)
  await page.locator('[data-sl-staff-trigger]').click()
  const metrics = await page.evaluate(() => {
    const trigger = document.querySelector('[data-sl-staff-trigger]').getBoundingClientRect()
    const menu = document.querySelector('[data-sl-staff-popover]').getBoundingClientRect()
    const print = document.querySelector('[data-sl-print]').getBoundingClientRect()
    const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
    return {
      triggerWidth:trigger.width,
      menuLeft:menu.left,
      menuRight:menu.right,
      menuBottom:menu.bottom,
      menuWidth:menu.width,
      placement:document.querySelector('[data-sl-staff-popover]').dataset.placement,
      triggerPrintOverlap:intersects(trigger, print),
      bodyOverflow:Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
    }
  })
  assert.ok(metrics.triggerWidth >= 190)
  assert.ok(metrics.menuLeft >= 0 && metrics.menuRight <= 390)
  assert.ok(metrics.menuBottom <= 770, `staff menu is too close to the bottom navigation: ${JSON.stringify(metrics)}`)
  assert.ok(metrics.menuWidth >= 280)
  assert.equal(metrics.triggerPrintOverlap, false)
  assert.ok(metrics.bodyOverflow <= 2)
  await page.screenshot({ path:path.join(artifactRoot, 'staff-multiselect-v542-mobile.png'), fullPage:false })
  await context.close()
  return metrics
}

const probe = await browser.newContext({ viewport:{ width:1280, height:900 } })
await login(probe)
const all = await report(probe)
const staffWithSales = [...new Set(all.rows.map(row => String(row.staffName || '').trim()).filter(Boolean))]
  .filter(name => all.staff.includes(name))
assert.ok(staffWithSales.length >= 2, 'August sales fixture needs two assigned staff')
const selectedStaff = staffWithSales.slice(0, 2)
await probe.close()

const desktop = await verifyDesktop(selectedStaff)
const mobile = await verifyMobile()
assert.equal(errors.length, 0, errors.join('\n'))
await browser.close()

console.log(JSON.stringify({
  release:'sales-ledger-staff-multiselect-v542',
  desktop,
  mobile,
  artifacts:artifactRoot,
}))
