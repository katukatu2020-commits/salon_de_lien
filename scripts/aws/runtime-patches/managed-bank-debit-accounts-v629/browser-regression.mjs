import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const { accountsPage } = createRequire(import.meta.url)(path.join(scriptDirectory, 'managed-account-access-v629.js'))
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const output = process.env.SCREENSHOT_DIR || 'artifacts/managed-bank-debit-accounts-v629/local'
fs.mkdirSync(output, { recursive: true })

const rows = [
  { accountType: 'SALON', accountName: 'ORIMIA 青山店', loginId: 'salon-aoyama-01', contactEmail: 'owner@example.jp', operatorEmail: 'operator@example.jp', createdAt: new Date('2026-09-12T01:00:00Z') },
  { accountType: 'DEALER', accountName: 'ORIMIAビューティー株式会社', loginId: 'dealer-tokyo-01', contactEmail: 'dealer@example.jp', operatorEmail: 'operator@example.jp', createdAt: new Date('2026-09-12T02:00:00Z') },
]

function renderPage(title, body) {
  return '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + '</title><style>:root{--ink:#28211d;--muted:#756a62;--line:#e9ddd4;--paper:#fffdf9;--canvas:#f6f0e9;--brand:#8f4f42;--brand2:#b76b5b;--rose:#f5e3df;--green:#2f6b50;--greenBg:#e8f4ec;--red:#a33c3c;--redBg:#fdebea}*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Yu Gothic",sans-serif}.top{height:68px;display:flex;align-items:center;padding:0 24px;border-bottom:1px solid var(--line);background:#fff}.main{width:min(1180px,calc(100% - 28px));margin:auto;padding:30px 0 60px}.card{border:1px solid var(--line);border-radius:20px;background:var(--paper);padding:24px}.primary{width:100%;height:48px;border:0;border-radius:99px;background:var(--brand);color:#fff;font-weight:800}.eyebrow{color:var(--brand2);font-size:11px;font-weight:900}</style></head><body><header class="top"><strong>ORIMIA PLATFORM OPERATIONS</strong></header>' + body + '</body></html>'
}

const document = accountsPage(renderPage, rows, new URL('https://fixture.invalid/platform/accounts?created=salon&loginId=salon-aoyama-01'))
const server = http.createServer(function (_req, res) {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(document)
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
const base = 'http://127.0.0.1:' + address.port
const browser = await chromium.launch({ executablePath, headless: true })

try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base, { waitUntil: 'load' })
    assert.equal(await page.locator('form.accountForm').count(), 2)
    assert.equal(await page.locator('input[name="loginId"]').count(), 2)
    assert.equal(await page.locator('input[type="password"]').count(), 2)
    assert.match(await page.locator('body').innerText(), /銀行口座振替/)
    assert.doesNotMatch(await page.locator('body').innerText(), /Stripe/)
    const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, width: document.documentElement.scrollWidth }))
    assert.ok(layout.width <= layout.viewport + 2, width + ': account issuance page has horizontal overflow')
    assert.deepEqual(errors, [])
    await page.screenshot({ path: path.join(output, 'account-issuance-' + width + '.png'), fullPage: true })
    await context.close()
  }
  console.log(JSON.stringify({ release: 'managed-bank-debit-accounts-v629', browserRegressionVerified: true, viewports: [390, 1440] }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
