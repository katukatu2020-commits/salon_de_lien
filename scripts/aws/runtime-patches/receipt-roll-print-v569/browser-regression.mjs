import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3144').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-receipt-roll-v569')
const mmToPx = value => value * 96 / 25.4
fs.mkdirSync(artifactRoot, { recursive:true })

function inspectPdf(pdfPath) {
  const source = fs.readFileSync(pdfPath).toString('latin1')
  const mediaBoxes = [...source.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/g)]
    .map(match => ({ widthPt:Number(match[1]), heightPt:Number(match[2]) }))
  const pages = (source.match(/\/Type\s*\/Page\b/g) || []).length
  assert.ok(mediaBoxes.length > 0, 'PDF has no readable MediaBox')
  return { pages, ...mediaBoxes[0] }
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

async function openReceipt(context, viewport, label, appointmentId, errors) {
  const page = await context.newPage()
  await page.setViewportSize(viewport)
  page.on('pageerror', error => errors.push(`${label}-page:${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`${label}-console:${message.text()}`)
  })
  await page.goto(`${baseUrl}/admin/appointments/${encodeURIComponent(appointmentId)}/receipt`, {
    waitUntil:'networkidle',
    timeout:30_000,
  })
  await page.waitForFunction(() => Boolean(window.__orimiaReceiptRollPrintV569), null, { timeout:15_000 })
  await page.waitForFunction(() => !document.fonts || document.fonts.status === 'loaded')
  const receipt = page.locator('article[class*="receipt_receipt__"]').first()
  await receipt.waitFor({ state:'visible' })

  const screen = await page.evaluate(() => {
    const element = document.querySelector('article[class*="receipt_receipt__"]')
    const rect = element?.getBoundingClientRect()
    const loader = document.getElementById('orimia-ui-loader-v536')
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
  assert.ok(Math.abs(screen.receiptWidth - mmToPx(80)) < 1, `${label}: screen receipt is not 80mm wide`)
  assert.ok(screen.receiptHeight > 300, `${label}: receipt content is unexpectedly short`)
  assert.ok(screen.loaderDisplay === 'none' || screen.loaderVisibility === 'hidden' || screen.loaderDisplay === 'absent')
  assert.equal(screen.bottomNavs, 0, `${label}: bottom navigation leaked into the receipt route`)
  assert.equal(screen.sidebars, 0, `${label}: sidebar leaked into the receipt route`)
  assert.equal(screen.toolbarVisible, true)
  await page.screenshot({ path:path.join(artifactRoot, `receipt-v569-${label}-screen.png`), fullPage:true })
  return { page, screen }
}

async function prepareThroughButton(page) {
  await page.getByRole('button').click()
  await page.waitForFunction(() => document.documentElement.dataset.nativeReceiptPrintCalled === '1')
  const metrics = await page.evaluate(() => window.__orimiaReceiptRollPrintV569.metrics())
  assert.equal(metrics.widthMm, 80)
  assert.equal(metrics.printableWidthMm, 72)
  assert.equal(metrics.feedSafetyMm, 1)
  assert.ok(metrics.heightMm > 80)
  assert.ok(metrics.contentHeightPx > 0)
  assert.equal(metrics.pageHeightDots, metrics.heightMm * 8)
  return metrics
}

async function verifyPrintLayer(page, label, metrics) {
  await page.emulateMedia({ media:'print' })
  const state = await page.evaluate(() => {
    const host = document.getElementById('orimia-receipt-roll-host-v569')
    const copy = host?.querySelector('[data-orimia-receipt-roll-copy-v569="1"]')
    const root = document.documentElement
    const body = document.body
    const rootRect = root.getBoundingClientRect()
    const bodyRect = body.getBoundingClientRect()
    const hostRect = host?.getBoundingClientRect()
    const copyRect = copy?.getBoundingClientRect()
    const visibleBodyChildren = [...body.children].filter(element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }).map(element => element.id || element.tagName)
    return {
      heightVariable:getComputedStyle(root).getPropertyValue('--orimia-receipt-roll-height-v569').trim(),
      root:{ width:rootRect.width, height:rootRect.height, minHeight:getComputedStyle(root).minHeight, maxHeight:getComputedStyle(root).maxHeight },
      body:{ width:bodyRect.width, height:bodyRect.height, minHeight:getComputedStyle(body).minHeight, maxHeight:getComputedStyle(body).maxHeight },
      host:{ width:hostRect?.width || 0, height:hostRect?.height || 0, page:host ? getComputedStyle(host).page : '' },
      copy:{ width:copyRect?.width || 0, height:copyRect?.height || 0, page:copy ? getComputedStyle(copy).page : '' },
      tailPx:hostRect && copyRect ? hostRect.bottom - copyRect.bottom : Number.POSITIVE_INFINITY,
      visibleBodyChildren,
      pageRule:document.getElementById('orimia-receipt-roll-page-v569')?.textContent || '',
      containsApplicationChrome:Boolean(host?.querySelector('#admin-mobile-bottom-nav-v518,.orimia-admin-bottom-nav-v518,.admin-desktop-header,.admin-desktop-sidebar')),
    }
  })

  const expectedHeightPx = mmToPx(metrics.heightMm)
  assert.equal(state.heightVariable, `${metrics.heightMm}mm`)
  assert.ok(Math.abs(state.root.width - mmToPx(80)) < 1, `${label}: print root is not 80mm wide`)
  assert.ok(Math.abs(state.body.width - mmToPx(80)) < 1, `${label}: print body is not 80mm wide`)
  assert.ok(Math.abs(state.host.width - mmToPx(80)) < 1, `${label}: print host is not 80mm wide`)
  assert.ok(Math.abs(state.copy.width - mmToPx(80)) < 1, `${label}: print copy is not 80mm wide`)
  assert.ok(Math.abs(state.root.height - expectedHeightPx) < 1, `${label}: root does not match the dynamic paper height`)
  assert.ok(Math.abs(state.body.height - expectedHeightPx) < 1, `${label}: body does not match the dynamic paper height`)
  assert.ok(Math.abs(state.host.height - expectedHeightPx) < 1, `${label}: host does not match the dynamic paper height`)
  assert.ok(state.tailPx >= 0 && state.tailPx <= mmToPx(1.5), `${label}: blank tail is ${state.tailPx}px`)
  assert.equal(state.host.page, 'receipt')
  assert.equal(state.copy.page, 'receipt')
  assert.deepEqual(state.visibleBodyChildren, ['orimia-receipt-roll-host-v569'])
  assert.equal(state.containsApplicationChrome, false)
  assert.ok(state.pageRule.includes(`80mm ${metrics.heightMm}mm`))

  const printLayerPath = path.join(artifactRoot, `receipt-v569-${label}-print-layer.png`)
  await page.locator('#orimia-receipt-roll-host-v569').screenshot({ path:printLayerPath })

  const pdfPath = path.join(artifactRoot, `receipt-v569-${label}.pdf`)
  await page.pdf({ path:pdfPath, printBackground:true, preferCSSPageSize:true })
  const pdf = inspectPdf(pdfPath)
  const expectedWidthPt = 80 / 25.4 * 72
  const expectedHeightPt = metrics.heightMm / 25.4 * 72
  assert.equal(pdf.pages, 1, `${label}: receipt printed on ${pdf.pages} pages`)
  assert.ok(Math.abs(pdf.widthPt - expectedWidthPt) < 1, `${label}: PDF width is ${pdf.widthPt}pt`)
  assert.ok(Math.abs(pdf.heightPt - expectedHeightPt) < 1, `${label}: PDF height is ${pdf.heightPt}pt`)
  return { ...pdf, expectedHeightMm:metrics.heightMm, tailPx:state.tailPx }
}

const browser = await chromium.launch({ executablePath, headless:true })
const errors = []

try {
  const desktopContext = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await desktopContext.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.nativeReceiptPrintCalled = '1'
    }
  })
  await login(desktopContext)
  const appointmentId = await appointmentWithProducts(desktopContext)
  const desktop = await openReceipt(desktopContext, { width:1440, height:1000 }, 'desktop', appointmentId, errors)
  const shortMetrics = await prepareThroughButton(desktop.page)
  const shortPdf = await verifyPrintLayer(desktop.page, 'short', shortMetrics)

  await desktop.page.emulateMedia({ media:'screen' })
  const longMetrics = await desktop.page.evaluate(() => {
    window.__orimiaReceiptRollPrintV569.cleanup()
    const receipt = document.querySelector('article[class*="receipt_receipt__"]')
    const lines = receipt?.querySelector('section')
    const template = lines?.lastElementChild
    if (!lines || !template) throw new Error('purchase lines could not be extended')
    for (let index = 1; index <= 18; index += 1) {
      const line = template.cloneNode(true)
      const name = line.querySelector('span')
      if (name) name.prepend(`Additional product ${index} `)
      lines.appendChild(line)
    }
    return window.__orimiaReceiptRollPrintV569.prepare()
  })
  assert.ok(longMetrics.heightMm > shortMetrics.heightMm + 100, 'page length did not grow with receipt lines')
  const longPdf = await verifyPrintLayer(desktop.page, 'long', longMetrics)
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  await mobileContext.addInitScript(() => {
    window.print = () => {
      document.documentElement.dataset.nativeReceiptPrintCalled = '1'
    }
  })
  await login(mobileContext)
  const mobile = await openReceipt(mobileContext, { width:390, height:844 }, 'mobile', appointmentId, errors)
  const mobileMetrics = await mobile.page.evaluate(() => window.__orimiaReceiptRollPrintV569.prepare())
  assert.equal(mobileMetrics.widthMm, 80)
  assert.equal(mobileMetrics.printableWidthMm, 72)
  await mobileContext.close()

  const unexpectedErrors = errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
  ))
  assert.deepEqual(unexpectedErrors, [], unexpectedErrors.join('\n'))

  console.log(JSON.stringify({
    release:'receipt-roll-print-v569',
    appointmentId,
    shortMetrics,
    shortPdf,
    longMetrics,
    longPdf,
    desktop:desktop.screen,
    mobile:mobile.screen,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
