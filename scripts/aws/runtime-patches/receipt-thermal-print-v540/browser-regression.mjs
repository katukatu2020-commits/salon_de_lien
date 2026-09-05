import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3117').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-receipt-v540')
fs.mkdirSync(artifactRoot, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
const knownHydrationNoise = /Minified React error #(418|423)/
const errors = []

function recordError(prefix, value) {
  const message = String(value || '')
  if (!knownHydrationNoise.test(message)) errors.push(`${prefix}:${message}`)
}

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/appointments' },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function appointmentWithProducts(context) {
  const response = await context.request.get(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-09-30`)
  assert.ok(response.ok())
  const rows = (await response.json()).rows
  const row = rows.find(item => item.appointmentId && item.productLineCount > 0)
    || rows.find(item => item.appointmentId)
  assert.ok(row?.appointmentId, 'no paid appointment fixture is available')
  return row.appointmentId
}

function inspectPdf(pdfPath) {
  const source = fs.readFileSync(pdfPath).toString('latin1')
  const mediaBoxes = [...source.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/g)]
    .map(match => ({ widthPt:Number(match[1]), heightPt:Number(match[2]) }))
  const pages = (source.match(/\/Type\s*\/Page\b/g) || []).length
  assert.ok(mediaBoxes.length > 0, 'PDF has no readable MediaBox')
  return { pages, ...mediaBoxes[0] }
}

async function openReceipt(context, viewport, label, appointmentId) {
  const page = await context.newPage()
  await page.setViewportSize(viewport)
  page.on('pageerror', error => recordError(label, error.message))
  page.on('console', message => {
    if (message.type() === 'error') recordError(`${label}-console`, message.text())
  })
  await page.goto(`${baseUrl}/admin/appointments/${encodeURIComponent(appointmentId)}/receipt`, {
    waitUntil:'domcontentloaded',
    timeout:30_000,
  })
  await page.waitForFunction(() => Boolean(window.__orimiaReceiptPrintV540), null, { timeout:15_000 })
  await page.locator('[aria-label="会計レシート"], article[class*="receipt_receipt__"]').first().waitFor({ state:'visible' })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')

  const screen = await page.evaluate(() => {
    const receipt = document.querySelector('[aria-label="会計レシート"], article[class*="receipt_receipt__"]')
    const loader = document.getElementById('orimia-ui-loader-v536')
    const rect = receipt?.getBoundingClientRect()
    return {
      receiptWidth:rect?.width || 0,
      receiptHeight:rect?.height || 0,
      loaderDisplay:loader ? getComputedStyle(loader).display : 'absent',
      loaderVisibility:loader ? getComputedStyle(loader).visibility : 'absent',
      bottomNavs:document.querySelectorAll('#admin-mobile-bottom-nav-v518,.orimia-admin-bottom-nav-v518').length,
      sidebars:document.querySelectorAll('.admin-desktop-sidebar').length,
      toolbarVisible:Boolean(document.querySelector('main > div')?.getBoundingClientRect().height),
    }
  })
  assert.ok(screen.receiptWidth > 295 && screen.receiptWidth < 310, `${label}: receipt is not 80mm wide`)
  assert.ok(screen.receiptHeight > 300, `${label}: receipt content is unexpectedly short`)
  assert.ok(screen.loaderDisplay === 'none' || screen.loaderVisibility === 'hidden' || screen.loaderDisplay === 'absent')
  assert.equal(screen.bottomNavs, 0, `${label}: admin bottom navigation leaked into the receipt route`)
  assert.equal(screen.sidebars, 0, `${label}: admin sidebar leaked into the receipt route`)
  assert.equal(screen.toolbarVisible, true)
  await page.screenshot({ path:path.join(artifactRoot, `receipt-v540-${label}-screen.png`), fullPage:true })
  return { page, screen }
}

async function prepareThroughButton(page) {
  await page.locator('button').last().click()
  await page.waitForFunction(() => document.documentElement.dataset.nativeReceiptPrintCalled === '1')
  const metrics = await page.evaluate(() => window.__orimiaReceiptPrintV540.metrics())
  assert.equal(metrics.widthMm, 80)
  assert.ok(metrics.heightMm > 80)
  assert.ok(metrics.heightPx > 0)
  return metrics
}

async function verifyPrintedReceipt(page, label, expectedMetrics) {
  await page.emulateMedia({ media:'print' })
  const state = await page.evaluate(() => {
    const host = document.getElementById('orimia-receipt-print-host-v540')
    const copy = host?.querySelector('[data-orimia-receipt-copy-v540="1"]')
    const visibleBodyChildren = [...document.body.children].filter(element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }).map(element => element.id || element.className || element.tagName)
    return {
      hostDisplay:host ? getComputedStyle(host).display : 'absent',
      copyWidth:copy?.getBoundingClientRect().width || 0,
      visibleBodyChildren,
      pageRule:document.getElementById('orimia-receipt-page-size-v540')?.textContent || '',
      containsBottomNav:Boolean(host?.querySelector('#admin-mobile-bottom-nav-v518,.orimia-admin-bottom-nav-v518')),
    }
  })
  assert.equal(state.hostDisplay, 'block')
  assert.ok(state.copyWidth > 295 && state.copyWidth < 310)
  assert.deepEqual(state.visibleBodyChildren, ['orimia-receipt-print-host-v540'])
  assert.equal(state.containsBottomNav, false)
  assert.ok(state.pageRule.includes(`80mm ${expectedMetrics.heightMm}mm`))

  const pdfPath = path.join(artifactRoot, `receipt-v540-${label}.pdf`)
  await page.pdf({ path:pdfPath, printBackground:true, preferCSSPageSize:true })
  const pdf = inspectPdf(pdfPath)
  const expectedWidthPt = 80 / 25.4 * 72
  const expectedHeightPt = expectedMetrics.heightMm / 25.4 * 72
  assert.equal(pdf.pages, 1, `${label}: receipt printed on ${pdf.pages} pages`)
  assert.ok(Math.abs(pdf.widthPt - expectedWidthPt) < 1, `${label}: PDF width is ${pdf.widthPt}pt`)
  assert.ok(Math.abs(pdf.heightPt - expectedHeightPt) < 1, `${label}: PDF height is ${pdf.heightPt}pt`)
  return { ...pdf, expectedHeightMm:expectedMetrics.heightMm }
}

const desktopContext = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
await desktopContext.addInitScript(() => {
  window.print = () => { document.documentElement.dataset.nativeReceiptPrintCalled = '1' }
})
await login(desktopContext)
const appointmentId = await appointmentWithProducts(desktopContext)
const desktop = await openReceipt(desktopContext, { width:1440, height:1000 }, 'desktop', appointmentId)
const shortMetrics = await prepareThroughButton(desktop.page)
const shortPdf = await verifyPrintedReceipt(desktop.page, 'short', shortMetrics)

await desktop.page.emulateMedia({ media:'screen' })
const longMetrics = await desktop.page.evaluate(() => {
  window.__orimiaReceiptPrintV540.cleanup()
  const receipt = document.querySelector('[aria-label="会計レシート"], article[class*="receipt_receipt__"]')
  const lines = receipt?.querySelector('section')
  const template = lines?.lastElementChild
  if (!lines || !template) throw new Error('purchase lines could not be extended')
  for (let index = 1; index <= 18; index += 1) {
    const line = template.cloneNode(true)
    const name = line.querySelector('span')
    if (name) name.prepend(`追加商品 ${index} `)
    lines.appendChild(line)
  }
  return window.__orimiaReceiptPrintV540.prepare()
})
assert.ok(longMetrics.heightMm > shortMetrics.heightMm + 100, 'long receipt page height did not grow with its content')
const longPdf = await verifyPrintedReceipt(desktop.page, 'long', longMetrics)
await desktopContext.close()

const mobileContext = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
await mobileContext.addInitScript(() => {
  window.print = () => { document.documentElement.dataset.nativeReceiptPrintCalled = '1' }
})
await login(mobileContext)
const mobile = await openReceipt(mobileContext, { width:390, height:844 }, 'mobile', appointmentId)
const mobileMetrics = await prepareThroughButton(mobile.page)
assert.equal(mobileMetrics.widthMm, 80)
await mobileContext.close()

assert.equal(errors.length, 0, errors.join('\n'))
await browser.close()

console.log(JSON.stringify({
  release:'receipt-thermal-print-v540',
  appointmentId,
  shortMetrics,
  shortPdf,
  longMetrics,
  longPdf,
  desktop:desktop.screen,
  mobile:mobile.screen,
  artifacts:artifactRoot,
}))
