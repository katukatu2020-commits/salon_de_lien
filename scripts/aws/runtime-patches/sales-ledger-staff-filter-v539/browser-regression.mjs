import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3116').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v539')
fs.mkdirSync(screenshotRoot, { recursive:true })

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

async function augustReport(context, staff = '') {
  const params = new URLSearchParams({ from:'2026-08-01', to:'2026-08-31' })
  if (staff) params.set('staff', staff)
  const response = await context.request.get(`${baseUrl}/api/admin/sales-ledger?${params}`)
  assert.ok(response.ok())
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
  await page.locator('[data-sl-summary-staff] option').nth(1).waitFor({ state:'attached', timeout:15_000 })
  await page.locator('#orimia-ui-loader-v536').waitFor({ state:'hidden', timeout:15_000 })
}

async function filterByStaff(page, staff) {
  const responsePromise = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/admin/sales-ledger' && url.searchParams.get('staff') === staff
  }, { timeout:15_000 })
  await page.locator('[data-sl-summary-staff]').selectOption(staff)
  const response = await responsePromise
  assert.equal(response.status(), 200)
  await page.waitForFunction(name => document.querySelector('[data-sl-summary-period]')?.textContent?.includes(name), staff, { timeout:15_000 })
  return response.json()
}

const numberText = async locator => Number((await locator.textContent()).replace(/[^0-9]/g, ''))

async function layoutMetrics(page) {
  return page.evaluate(() => {
    const title = document.querySelector('.sl-daily-card .sl-section-title')?.getBoundingClientRect()
    const actions = document.querySelector('.sl-summary-head-actions')?.getBoundingClientRect()
    const select = document.querySelector('[data-sl-summary-staff]')?.getBoundingClientRect()
    const print = document.querySelector('[data-sl-print]')?.getBoundingClientRect()
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)
    return {
      titleActionsOverlap:intersects(title, actions),
      selectPrintOverlap:intersects(select, print),
      bodyOverflow:Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      selectWidth:select?.width || 0,
    }
  })
}

async function verifyViewport(viewport, label, selectedStaff) {
  const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
  await login(context)
  const page = await context.newPage()
  page.on('pageerror', error => recordError(label, error.message))
  page.on('console', message => { if (message.type() === 'error') recordError(`${label}-console`, message.text()) })
  await openAugust(page)

  assert.equal(await page.locator('.sl-daily-card [data-sl-summary-staff]').count(), 1)
  assert.equal(await page.locator('.sl-report-filter [name=staff]').count(), 0)
  const filtered = await filterByStaff(page, selectedStaff)
  assert.ok(filtered.rows.length > 0)
  assert.ok(filtered.rows.every(row => row.staffName === selectedStaff))
  assert.equal(await page.locator('[data-sl-summary-staff]').inputValue(), selectedStaff)
  assert.match(await page.locator('[data-sl-summary-period]').textContent(), new RegExp(`担当者：${selectedStaff}`))
  assert.equal(await page.locator('[data-summary-date]').count(), filtered.summary.days.length)
  assert.equal(await numberText(page.locator('[data-sl-kpi-total]')), filtered.summary.totals.grossTotal)
  assert.equal(await numberText(page.locator('[data-sl-kpi-count]')), filtered.summary.totals.transactions)

  const selectedDate = await page.locator('[data-summary-date]').first().getAttribute('data-summary-date')
  await page.locator('[data-summary-date]').first().locator('[data-summary-day]').click()
  await page.locator('[data-sl-detail-dialog]').waitFor({ state:'visible' })
  const expectedDetailRows = filtered.rows.filter(row => row.saleDate === selectedDate).length
  assert.equal(await page.locator('[data-sl-rows] tr[data-id]').count(), expectedDetailRows)
  await page.locator('[data-sl-detail-close]').click()
  await page.waitForFunction(() => !document.querySelector('[data-sl-detail-dialog]')?.open)

  const metrics = await layoutMetrics(page)
  assert.equal(metrics.titleActionsOverlap, false, `${label} title and actions overlap`)
  assert.equal(metrics.selectPrintOverlap, false, `${label} select and print overlap`)
  assert.ok(metrics.selectWidth >= 150, `${label} staff select is too narrow`)
  assert.ok(metrics.bodyOverflow <= 2, `${label} page overflowed by ${metrics.bodyOverflow}px`)
  await page.screenshot({ path:path.join(screenshotRoot, `sales-ledger-v539-${label}.png`), fullPage:false })

  await page.evaluate(() => { window.print = () => { document.documentElement.dataset.staffPrintCalled = '1' } })
  await page.locator('[data-sl-print]').click()
  assert.equal(await page.locator('html').getAttribute('data-staff-print-called'), '1')

  await page.emulateMedia({ media:'print' })
  const printState = await page.evaluate(() => ({
    dailyDisplay:getComputedStyle(document.querySelector('.sl-daily-card')).display,
    actionsDisplay:getComputedStyle(document.querySelector('.sl-summary-head-actions')).display,
    caption:document.querySelector('[data-sl-summary-period]')?.textContent || '',
    visibleDays:document.querySelectorAll('[data-summary-date]').length,
    bodyRows:[...document.querySelectorAll('.sl-daily-table tbody tr')].map(row => ({
      display:getComputedStyle(row).display,
      height:row.getBoundingClientRect().height,
    })),
  }))
  assert.notEqual(printState.dailyDisplay, 'none')
  assert.equal(printState.actionsDisplay, 'none')
  assert.ok(printState.caption.includes(selectedStaff))
  assert.equal(printState.visibleDays, filtered.summary.days.length)
  assert.ok(printState.bodyRows.every(row => row.display === 'table-row' && row.height > 0), `filtered daily rows are missing from print output: ${JSON.stringify(printState.bodyRows)}`)
  if (label === 'desktop') {
    await page.screenshot({ path:path.join(screenshotRoot, 'sales-ledger-v539-filtered-print-preview.png'), fullPage:true })
    await page.pdf({
      path:path.join(screenshotRoot, 'sales-ledger-v539-filtered-print.pdf'),
      format:'A4',
      landscape:true,
      printBackground:true,
    })
  }

  await context.close()
  return { label, metrics, printState, filteredRows:filtered.rows.length, selectedDate }
}

const probe = await browser.newContext({ viewport:{ width:1280, height:900 } })
await login(probe)
const all = await augustReport(probe)
const selectedStaff = all.rows.map(row => String(row.staffName || '').trim()).find(Boolean)
assert.ok(selectedStaff, 'August sales fixture has no assigned staff')
await probe.close()

const desktop = await verifyViewport({ width:1440, height:1000 }, 'desktop', selectedStaff)
const mobile = await verifyViewport({ width:390, height:844 }, 'mobile', selectedStaff)
assert.equal(errors.length, 0, errors.join('\n'))
await browser.close()

console.log(JSON.stringify({
  release:'sales-ledger-staff-filter-v539',
  selectedStaff,
  desktop,
  mobile,
  screenshots:screenshotRoot,
}))
