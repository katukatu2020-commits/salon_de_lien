import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = (process.env.SMOKE_BASE_URL || 'http://localhost:3590').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/daily-sales-print-v590/local'
fs.mkdirSync(output, { recursive:true })
const browser = await chromium.launch({ executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true })
const results = []
const hostSelector = '#orimia-daily-sales-print-host-v590'
const ready = page => page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')

async function snapshot(page, selector) {
  return page.locator(selector).evaluate(table => ({
    headers:[...table.tHead.rows[0].cells].map(cell => cell.textContent.replace(/\s/g, '')),
    rows:[...table.tBodies[0].rows].map(row => [...row.cells].map(cell => cell.textContent.replace(/\s/g, ''))),
    totals:[...table.tFoot.rows[0].cells].map(cell => cell.textContent.replace(/\s/g, '')),
  }))
}

async function verifyPrint(page, label) {
  const source = await snapshot(page, '[data-sl-summary-table]')
  await page.locator('[data-sl-print]').click()
  await page.locator(hostSelector).waitFor({ state:'attached' })
  assert.equal(await page.evaluate(() => window.print === window.originalPrintTestStub), true, 'must not replace native print')
  assert.deepEqual(await snapshot(page, `${hostSelector} table`), source)
  await page.emulateMedia({ media:'print' })
  const layout = await page.locator(hostSelector).evaluate(host => {
    const table = host.querySelector('table')
    const rect = host.getBoundingClientRect()
    return {
      display:getComputedStyle(host).display,
      width:rect.width, height:rect.height,
      scrollWidth:host.scrollWidth, clientWidth:host.clientWidth,
      right:rect.right, tableRight:table.getBoundingClientRect().right,
      visible:[...document.body.children].filter(el => {
        const css = getComputedStyle(el)
        return css.display !== 'none' && css.visibility !== 'hidden' && el.getBoundingClientRect().height > 0
      }).map(el => el.id),
      kpis:host.querySelectorAll('.orimia-dsp590-kpis > div').length,
    }
  })
  assert.equal(layout.display, 'block')
  assert.ok(layout.height > 100, 'report must not be blank')
  assert.ok(layout.width <= 1085.5, 'must fit A4 landscape')
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1)
  assert.ok(layout.tableRight <= layout.right + 0.5)
  assert.deepEqual(layout.visible, [hostSelector.slice(1)])
  assert.equal(layout.kpis, 4)
  await page.screenshot({ path:path.join(output, `${label}.png`), fullPage:true })
  // Let Chromium's actual print lifecycle generate a fresh report, not a prebuilt test host.
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  assert.equal(await page.locator(hostSelector).count(), 0)
  const pdf = await page.pdf({ path:path.join(output, `${label}.pdf`), printBackground:true, preferCSSPageSize:true })
  const text = pdf.toString('latin1')
  const box = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)/)
  assert.ok(box, 'PDF page size must be present')
  assert.ok(Math.abs(Number(box[1]) - 841.92) < 2 && Math.abs(Number(box[2]) - 595.92) < 2, 'PDF must be A4 landscape')
  assert.ok(pdf.length > 10000, 'PDF must include rendered report content')
  assert.equal(await page.locator(hostSelector).count(), 0, 'afterprint must clean up')
  await page.emulateMedia({ media:'screen' })
  await page.locator('[data-sl-summary-table]').waitFor({ state:'visible' })
  results.push({ label, columns:source.headers.length, rows:source.rows.length, pdfBytes:pdf.length, layout })
}

try {
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 } })
  await context.addInitScript(() => {
    window.originalPrintTestStub = () => window.dispatchEvent(new Event('beforeprint'))
    window.print = window.originalPrintTestStub
  })
  // No print job is ever sent to a physical printer by these tests.
  await context.route(/(?:localhost|127\.0\.0\.1):17615/, route => route.abort())
  const auth = await context.request.post(`${base}/api/auth/login`, {
    headers:{ Origin:base }, form:{ email:'demo.owner', password:'LienDemo2026!' },
  })
  assert.ok(auth.ok(), `demo login failed: ${auth.status()}`)
  const errors = []
  for (const entry of ['navigation', 'direct']) {
    const page = await context.newPage()
    page.on('pageerror', error => { if (!/Minified React error #(418|423)/.test(error.message)) errors.push(error.message) })
    await page.goto(base + (entry === 'direct' ? '/admin/owner-analytics?salesLedger=1' : '/admin/appointments'), { waitUntil:'domcontentloaded' })
    await ready(page)
    if (entry === 'navigation') {
      assert.equal(await page.evaluate(() => window.__orimiaDailySalesPrintV590?.version), 'v590')
      await page.evaluate(() => { window.printNavigationMarker = 'preserved' })
      await page.locator('a[href="/admin/owner-analytics"]').first().click()
      await ready(page)
      await page.locator('a[href="/admin/owner-analytics?salesLedger=1"]').first().click()
      await ready(page)
      assert.equal(await page.evaluate(() => window.printNavigationMarker), 'preserved', 'test must exercise Next navigation, not a document reload')
    }
    await page.locator('[data-sl-month]').waitFor({ state:'visible' })
    await page.locator('[data-sl-month]').evaluate(input => {
      input.value = '2026-08'
      input.dispatchEvent(new Event('change', { bubbles:true }))
    })
    await page.waitForFunction(() => document.querySelector('[data-sl-summary-period]')?.textContent.includes('2026年8月') && !document.querySelector('[data-sl-print]')?.disabled)
    await ready(page)
    await verifyPrint(page, entry)
    await verifyPrint(page, `${entry}-repeat`)
    if (entry === 'navigation') {
      // Stress only this disposable DOM; no accounting records are modified.
      await page.locator('[data-sl-summary-table]').evaluate(table => {
        while (table.tBodies[0].rows.length < 31) table.tBodies[0].append(table.tBodies[0].rows[0].cloneNode(true))
        for (let index = 1; index <= 8; index++) {
          for (const row of table.rows) {
            const cell = document.createElement(row.parentElement.tagName === 'THEAD' ? 'th' : 'td')
            cell.textContent = row.parentElement.tagName === 'THEAD' ? `EXTRA-${index}` : '123,456'
            row.append(cell)
          }
        }
      })
      await verifyPrint(page, 'wide-31-days')
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
      await page.locator('a[href="/admin/appointments"]').first().click()
      await ready(page)
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-orimia-daily-sales-print-v590'))
      await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
      assert.equal(await page.locator(hostSelector).count(), 0, 'must not print ledger on other pages')
    }
    await page.close()
  }
  const ledger = await context.request.get(`${base}/api/admin/sales-ledger?from=2025-01-01&to=2026-12-31`)
  assert.ok(ledger.ok())
  const appointmentId = (await ledger.json()).rows.find(row => row.appointmentId)?.appointmentId
  assert.ok(appointmentId, 'paid demo appointment required for receipt isolation check')
  const receipts = await context.request.get(`${base}/admin/appointments/${encodeURIComponent(appointmentId)}/receipt`, { headers:{ Accept:'text/html' } })
  assert.equal(receipts.status(), 200)
  const receiptHtml = await receipts.text()
  assert.ok(receiptHtml.includes('orimia-receipt-pos-direct-script-v582'), 'existing POS module must remain present')
  assert.ok(!receiptHtml.includes('daily-sales-print-v590.js') && !receiptHtml.includes('daily-sales-print-v590.css'), 'receipt routes must not load the new report assets')
  assert.equal(errors.length, 0, errors.join('\n'))
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ release:'v590', results, receiptAssetsExcluded:true, errors }, null, 2))
  console.log(JSON.stringify({ release:'v590', results, receiptAssetsExcluded:true, errors }))
} finally {
  await browser.close()
}
