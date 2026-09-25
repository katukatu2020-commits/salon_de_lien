import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const releaseDir = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.join(releaseDir, 'customer-search-v662.js'), 'utf8')
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'shift-customer-search-v662')
fs.mkdirSync(screenshotDir, { recursive: true })

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  :root{--lien-border:#e5d5cd;--lien-primary:#a75547;--lien-ink:#342824}*{box-sizing:border-box}body{margin:0;background:#fbf7f0;color:#342824;font-family:sans-serif}.frame{display:grid;min-height:100dvh;place-items:center;padding:24px}.dialog{width:min(680px,100%);border:1px solid #e5d5cd;border-radius:20px;background:#fbf7f0;padding:24px;box-shadow:0 20px 60px #34282422}form{display:grid;gap:20px}label{display:grid;gap:7px;font-weight:700}select{min-height:48px;border:1px solid #e5d5cd;border-radius:12px;background:#fff;padding:0 12px}.actions{display:flex;justify-content:flex-end}button[type=submit]{min-height:44px;border:0;border-radius:999px;background:#a75547;padding:0 22px;color:#fff;font-weight:800}
</style></head><body><main class="frame"><section class="dialog" role="dialog" aria-labelledby="manual-appointment-title"><h1 id="manual-appointment-title">\u96fb\u8a71\u30fb\u5e97\u982d\u4e88\u7d04\u3092\u767b\u9332</h1><form><label data-ts-existing-customer>\u304a\u5ba2\u69d8<select name="customerId" required><option value="" disabled selected>\u9867\u5ba2\u3092\u9078\u629e</option><option value="customer-yamada">\u5c71\u7530 \u592a\u90ce\uff08090-1111-2222\uff09</option><option value="customer-kana">\u30e4\u30de\u30e2\u30c8 \u30cf\u30ca\u30b3\uff08080-3333-4444\uff09</option><option value="customer-sato">\u4f50\u85e4 \u7f8e\u54b2\uff08070-5555-6666\uff09</option></select></label><div class="actions"><button type="submit">\u4e88\u7d04\u3092\u767b\u9332</button></div></form></section></main><script>document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();window.__submittedCustomer=new FormData(event.currentTarget).get('customerId')})</script><script src="/customer-search-v662.js" defer></script></body></html>`

const server = http.createServer((request, response) => {
  if (request.url?.startsWith('/customer-search-v662.js')) {
    response.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(source)
    return
  }
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(html)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
const baseUrl = `http://127.0.0.1:${address.port}`
let browser

try {
  browser = await chromium.launch({ executablePath, headless: true })
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 } })
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(`${baseUrl}/admin/appointments`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__orimiaShiftCustomerSearchV662 === true)

  const field = page.locator('[data-orimia-customer-search-v662]')
  const input = field.locator('input[role="combobox"]')
  const nativeSelect = page.locator('select[name="customerId"]')
  await field.waitFor({ state: 'visible' })
  assert.equal(await page.locator('[data-orimia-customer-native-v662]').isVisible(), false)
  assert.equal(await input.getAttribute('placeholder'), '\u9867\u5ba2\u540d\u30fb\u96fb\u8a71\u756a\u53f7\u3067\u691c\u7d22')

  await input.fill('\u7530 \u592a')
  const yamada = field.locator('[role="option"][data-customer-id="customer-yamada"]')
  await yamada.waitFor({ state: 'visible' })
  assert.equal(await field.locator('[role="option"]').count(), 1)
  await yamada.click()
  assert.equal(await nativeSelect.inputValue(), 'customer-yamada')
  assert.equal(await input.evaluate(element => element.checkValidity()), true)

  await field.locator('.orimia-customer-search-clear-v662').click()
  await input.evaluate(element => {
    element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '\u3084\u307e\u3082' }))
    element.value = '\u3084\u307e\u3082'
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: '\u3084\u307e\u3082' }))
    element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '\u3084\u307e\u3082' }))
  })
  const kana = field.locator('[role="option"][data-customer-id="customer-kana"]')
  await kana.waitFor({ state: 'visible' })
  await input.press('Enter')
  assert.equal(await nativeSelect.inputValue(), 'customer-kana')

  await page.locator('button[type="submit"]').click()
  assert.equal(await page.evaluate(() => window.__submittedCustomer), 'customer-kana')

  await input.fill('\u8a72\u5f53\u3059\u308b\u9867\u5ba2\u306a\u3057')
  await page.getByText('\u4e00\u81f4\u3059\u308b\u9867\u5ba2\u304c\u898b\u3064\u304b\u308a\u307e\u305b\u3093\u3002').waitFor({ state: 'visible' })
  assert.equal(await nativeSelect.inputValue(), '')
  assert.equal(await input.evaluate(element => element.checkValidity()), false)

  await page.evaluate(() => {
    const select = document.querySelector('select[name="customerId"]')
    select.disabled = true
    select.closest('label').hidden = true
  })
  await field.waitFor({ state: 'hidden' })
  assert.equal(await input.isDisabled(), true)
  await page.evaluate(() => {
    const select = document.querySelector('select[name="customerId"]')
    select.disabled = false
    select.closest('label').hidden = false
  })
  await field.waitFor({ state: 'visible' })
  assert.equal(await input.isEnabled(), true)

  await page.setViewportSize({ width: 390, height: 844 })
  await input.fill('\u5c71')
  await field.locator('[role="option"]').first().waitFor({ state: 'visible' })
  const overflow = await page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)
  assert.ok(overflow <= 1, `mobile fixture overflows by ${overflow}px`)
  await page.screenshot({ path: path.join(screenshotDir, 'shift-customer-search-mobile.png'), fullPage: false })
  assert.deepEqual(pageErrors, [])

  console.log(JSON.stringify({
    release: 'shift-customer-search-v662',
    browserVerified: true,
    partialMatchVerified: true,
    kanaNormalizationVerified: true,
    imeCompositionVerified: true,
    modeSynchronizationVerified: true,
    screenshotDir,
  }))
} finally {
  await browser?.close().catch(() => {})
  await new Promise(resolve => server.close(resolve))
}
