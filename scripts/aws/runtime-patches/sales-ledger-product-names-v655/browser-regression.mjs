import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || path.join(os.tmpdir(), 'sales-ledger-product-names-v655')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const client = fs.readFileSync(path.join(runtimeRoot, 'sales-ledger-client-v318.js'), 'utf8')
fs.mkdirSync(output, { recursive: true })

const tokyo = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })
const today = Object.fromEntries(tokyo.formatToParts(new Date()).map(part => [part.type, part.value]))
const saleDate = `${today.year}-${today.month}-15`
const grossTotal = 12100
const productTotal = 7700
const serviceTotal = grossTotal - productTotal
const includedTax = Math.floor(grossTotal * 10 / 110)

const row = {
  id: 'sale-products-v655',
  paidAt: `${saleDate}T10:00:00+09:00`,
  title: 'カット・店販',
  amount: grossTotal,
  paymentMethod: '現金',
  source: 'checkout',
  note: '',
  customerId: 'customer-a',
  customerName: '山田 花子',
  displayCustomerName: '山田 花子',
  appointmentId: 'appointment-products-v655',
  scheduledAt: `${saleDate}T09:00:00+09:00`,
  menu: 'カット',
  staffName: '谷崎 太二',
  bookingProvider: 'customer_app',
  taxRate: 10,
  productTotal,
  productCount: 3,
  productLineCount: 2,
  productLines: [
    { name: 'オージュア クエンチ シャンプー', manufacturer: 'ミルボン', quantity: 2, unitPrice: 2200, lineTotal: 4400 },
    { name: 'エルジューダ エマルジョン+', manufacturer: 'ミルボン', quantity: 1, unitPrice: 3300, lineTotal: 3300 },
  ],
  pointDiscount: 0,
  auditCount: 0,
  saleDate,
  grossTotal,
  netTotal: grossTotal - includedTax,
  includedTax,
  serviceTotal,
  couponDiscount: 0,
  nominationFee: 0,
  shippingFee: 0,
  paymentBucket: 'cash',
  staffKey: '谷崎 太二',
}

const summaryRow = {
  date: saleDate,
  transactions: 1,
  serviceTotal,
  productTotal,
  couponDiscount: 0,
  netTotal: grossTotal - includedTax,
  includedTax,
  grossTotal,
  nominationFee: 0,
  shippingFee: 0,
  pointDiscount: 0,
  payments: { cash: grossTotal, card: 0, electronic: 0, qr: 0, other: 0 },
  staffSales: { '谷崎 太二': grossTotal },
}

const payload = {
  rows: [row],
  summary: { days: [summaryRow], totals: { ...summaryRow, date: 'total' }, staff: ['谷崎 太二'] },
  staff: ['谷崎 太二'],
  paymentMethods: ['現金'],
  count: 1,
  editable: true,
}

function html() {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    :root{--lien-bg:#fbf8f4;--lien-surface:#fff;--lien-surface-soft:#f6efe8;--lien-primary:#a64f62;--lien-primary-soft:#fbe9ed;--lien-ink:#302825;--lien-muted:#766a64;--lien-border:#e7dcd4;--lien-shadow-sm:0 10px 30px rgba(47,42,37,.05)}
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--lien-bg);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}main{min-height:100vh}
  </style></head><body><main id="workspace"></main><script>
    window.__orimiaAdminWorkspaceV572={version:'v572-fixture',mount(){const main=document.getElementById('workspace');return {host:main,main}},unmount(){}}
  </script><script src="/sales-ledger-v318.js?v=655-product-names1"></script></body></html>`
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/sales-ledger-v318.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' })
    res.end(client)
    return
  }
  if (url.pathname === '/api/admin/sales-ledger') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(payload))
    return
  }
  if (url.pathname === '/admin/owner-analytics') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(html())
    return
  }
  if (url.pathname === '/favicon.ico') {
    res.writeHead(204)
    res.end()
    return
  }
  res.writeHead(404)
  res.end('not found')
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})

const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto(`${base}/admin/owner-analytics?salesLedger=1`, { waitUntil: 'networkidle' })
    await page.locator('.sl-page').waitFor({ state: 'visible' })
    assert.equal(await page.getByLabel('施術・商品・メニュー・メモ').getAttribute('placeholder'), '内容・商品名を検索')
    await page.locator('[data-summary-day]').click()
    const dialog = page.locator('[data-sl-detail-dialog]')
    await dialog.waitFor({ state: 'visible' })
    const productCell = page.locator('.sl-product-cell')
    assert.equal(await productCell.locator('.sl-product-name').count(), 2)
    assert.deepEqual(await productCell.locator('.sl-product-name').allTextContents(), [
      'オージュア クエンチ シャンプー',
      'エルジューダ エマルジョン+',
    ])
    assert.deepEqual(await productCell.locator('.sl-product-meta').allTextContents(), [
      'ミルボン / 2点 / 4,400円',
      'ミルボン / 1点 / 3,300円',
    ])
    assert.equal(await productCell.locator('.sl-product-total').textContent(), '商品計 3点 / 7,700円')
    await productCell.scrollIntoViewIfNeeded()
    const metrics = await page.evaluate(() => {
      const dialog = document.querySelector('[data-sl-detail-dialog]').getBoundingClientRect()
      const cell = document.querySelector('.sl-product-cell').getBoundingClientRect()
      const names = [...document.querySelectorAll('.sl-product-name')].map(node => {
        const rect = node.getBoundingClientRect()
        return { width: rect.width, scrollWidth: node.scrollWidth }
      })
      return {
        dialogLeft: dialog.left,
        dialogRight: dialog.right,
        dialogBottom: dialog.bottom,
        cellWidth: cell.width,
        pageOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        names,
      }
    })
    assert.ok(metrics.dialogLeft >= -1 && metrics.dialogRight <= viewport.width + 1)
    assert.ok(metrics.dialogBottom <= viewport.height + 1)
    assert.ok(metrics.cellWidth >= 220)
    assert.ok(metrics.pageOverflow <= 2, `${viewport.name} page overflowed by ${metrics.pageOverflow}px`)
    assert.ok(metrics.names.every(name => name.scrollWidth <= name.width + 1), 'product name overflowed its cell')
    assert.deepEqual(errors, [])
    await dialog.screenshot({ path: path.join(output, `sales-ledger-products-${viewport.name}.png`) })
    results.push({ viewport: viewport.name, productNames: 2, productTotalsVisible: true, pageOverflow: metrics.pageOverflow })
    await context.close()
  }
  console.log(JSON.stringify({ release: 'sales-ledger-product-names-v655', browserVerified: true, results, output }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
