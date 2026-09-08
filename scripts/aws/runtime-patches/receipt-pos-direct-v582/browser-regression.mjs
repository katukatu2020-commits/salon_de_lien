import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3144').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-receipt-pos-direct-v582')
fs.mkdirSync(artifactRoot, { recursive:true })

function inspectPdf(pdfPath) {
  const source = fs.readFileSync(pdfPath).toString('latin1')
  const mediaBox = source.match(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/)
  assert.ok(mediaBox, 'PDF has no readable MediaBox')
  return {
    pages:(source.match(/\/Type\s*\/Page\b/g) || []).length,
    widthPt:Number(mediaBox[1]),
    heightPt:Number(mediaBox[2]),
  }
}

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/appointments' },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function appointmentId(context) {
  const response = await context.request.get(`${baseUrl}/api/admin/sales-ledger?from=2026-08-01&to=2026-09-30`)
  assert.ok(response.ok())
  const rows = (await response.json()).rows
  const row = rows.find(item => item.appointmentId && item.productLineCount > 0)
    || rows.find(item => item.appointmentId)
  assert.ok(row?.appointmentId, 'no paid appointment fixture is available')
  return row.appointmentId
}

async function grantLoopback(context) {
  try { await context.grantPermissions(['local-network-access'], { origin:new URL(baseUrl).origin }) }
  catch { }
}

const browser = await chromium.launch({ executablePath, headless:true })
const errors = []

try {
  const directContext = await browser.newContext({ viewport:{ width:1440, height:1000 } })
  await grantLoopback(directContext)
  await directContext.addInitScript(() => {
    window.print = () => { document.documentElement.dataset.nativeReceiptPrintCalled = '1' }
  })
  let postedReceipt = null
  const bridgeHeaders = {
    'Access-Control-Allow-Origin':new URL(baseUrl).origin,
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Allow-Private-Network':'true',
  }
  await directContext.route('http://127.0.0.1:17615/status', route => route.fulfill({
    status:route.request().method() === 'OPTIONS' ? 204 : 200,
    contentType:'application/json',
    headers:bridgeHeaders,
    body:route.request().method() === 'OPTIONS' ? '' : JSON.stringify({ version:'v582', available:true, printerName:'POS-80C' }),
  }))
  await directContext.route('http://127.0.0.1:17615/print', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status:204, headers:bridgeHeaders, body:'' })
      return
    }
    postedReceipt = JSON.parse(route.request().postData() || '{}')
    await route.fulfill({
      status:200,
      contentType:'application/json',
      headers:bridgeHeaders,
      body:JSON.stringify({ version:'v582', printed:true, printerName:'POS-80C', heightMm:72.5 }),
    })
  })
  await login(directContext)
  const id = await appointmentId(directContext)
  const page = await directContext.newPage()
  page.on('pageerror', error => errors.push(`direct-page:${error.message}`))
  page.on('console', message => { if (message.type() === 'error') errors.push(`direct-console:${message.text()}`) })
  await page.goto(`${baseUrl}/admin/appointments/${encodeURIComponent(id)}/receipt`, { waitUntil:'networkidle', timeout:30_000 })
  await page.waitForFunction(() => Boolean(window.__orimiaReceiptPosDirectV582))
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-orimia-receipt-roll-ready-v579'))
  await page.waitForFunction(() => /POS-80Cで印刷/.test(document.body.innerText))

  const prepared = await page.evaluate(() => {
    const api = window.__orimiaReceiptPosDirectV582
    const host = document.getElementById('orimia-receipt-roll-host-v579')
    const firstHost = host
    api.prepare()
    api.prepare()
    return {
      metrics:api.metrics(),
      stableHost:firstHost === document.getElementById('orimia-receipt-roll-host-v579'),
      pageRule:document.getElementById('orimia-receipt-roll-page-v579')?.textContent || '',
    }
  })
  assert.equal(prepared.stableHost, true)
  assert.equal(prepared.metrics.widthMm, 80)
  assert.ok(prepared.metrics.heightMm > 50 && prepared.metrics.heightMm < 210)
  assert.ok(prepared.pageRule.includes(`80mm ${prepared.metrics.heightMm}mm`))

  await page.getByRole('button', { name:/POS-80Cで印刷/ }).click()
  await page.waitForFunction(() => /印刷しました/.test(document.body.innerText))
  assert.equal(await page.evaluate(() => document.documentElement.dataset.nativeReceiptPrintCalled || ''), '')
  assert.equal(postedReceipt?.version, 1)
  assert.ok(postedReceipt?.receipt?.items?.length > 0)
  assert.ok(postedReceipt?.receipt?.meta?.length > 0)
  assert.ok(
    postedReceipt?.receipt?.summary?.some(row => row.emphasis),
    `receipt total was not emphasized: ${JSON.stringify(postedReceipt?.receipt?.summary)}`,
  )
  assert.equal(postedReceipt?.receipt?.payment?.label, 'お支払い')
  assert.ok(postedReceipt?.receipt?.store?.some(line => line.includes('10:00')))
  await page.screenshot({ path:path.join(artifactRoot, 'receipt-v582-direct.png'), fullPage:true })

  await page.emulateMedia({ media:'print' })
  const pdfPath = path.join(artifactRoot, 'receipt-v582-dynamic.pdf')
  await page.pdf({ path:pdfPath, printBackground:true, preferCSSPageSize:true })
  const pdf = inspectPdf(pdfPath)
  assert.equal(pdf.pages, 1)
  assert.ok(Math.abs(pdf.widthPt - (80 / 25.4 * 72)) < 1)
  assert.ok(Math.abs(pdf.heightPt - (prepared.metrics.heightMm / 25.4 * 72)) < 1)
  await directContext.close()

  const fallbackContext = await browser.newContext({ viewport:{ width:390, height:844 } })
  await grantLoopback(fallbackContext)
  await fallbackContext.addInitScript(() => {
    window.print = () => { document.documentElement.dataset.nativeReceiptPrintCalled = '1' }
  })
  await fallbackContext.route('http://127.0.0.1:17615/**', route => route.abort('connectionrefused'))
  await login(fallbackContext)
  const fallbackPage = await fallbackContext.newPage()
  fallbackPage.on('pageerror', error => errors.push(`fallback-page:${error.message}`))
  fallbackPage.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('ERR_CONNECTION_REFUSED')) errors.push(`fallback-console:${message.text()}`)
  })
  await fallbackPage.goto(`${baseUrl}/admin/appointments/${encodeURIComponent(id)}/receipt`, { waitUntil:'networkidle', timeout:30_000 })
  await fallbackPage.waitForFunction(() => Boolean(window.__orimiaReceiptPosDirectV582))
  await fallbackPage.getByRole('button', { name:/印刷/ }).click()
  await fallbackPage.waitForFunction(() => document.documentElement.dataset.nativeReceiptPrintCalled === '1')
  assert.equal(await fallbackPage.evaluate(() => window.__orimiaReceiptPosDirectV582.bridge()), null)
  await fallbackContext.close()

  const unexpectedErrors = errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
  ))
  assert.deepEqual(unexpectedErrors, [], unexpectedErrors.join('\n'))

  console.log(JSON.stringify({
    release:'receipt-pos-direct-v582',
    appointmentId:id,
    directPrint:true,
    fallbackPrint:true,
    measuredHeightMm:prepared.metrics.heightMm,
    pdf,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
