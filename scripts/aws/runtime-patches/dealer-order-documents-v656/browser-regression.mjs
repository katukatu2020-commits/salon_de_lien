import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'dealer-order-documents-v656', 'browser')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const client = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-v543.css'), 'utf8')
const documentFixtureDir = process.env.DOCUMENT_FIXTURE_DIR || ''
const invoiceFixture = documentFixtureDir ? fs.readFileSync(path.join(documentFixtureDir, 'invoice.html'), 'utf8') : ''
const deliveryFixture = documentFixtureDir ? fs.readFileSync(path.join(documentFixtureDir, 'delivery-note.html'), 'utf8') : ''
fs.mkdirSync(output, { recursive: true })

const order = {
  id: 'order-v656',
  orderNo: 'PO-20260917-V656',
  organizationName: 'Salon de Lien',
  deliveryNo: 'DN-20260917-V656',
  status: 'SHIPPED',
  orderedAt: '2026-09-17T01:00:00.000Z',
  shippedAt: '2026-09-17T03:00:00.000Z',
  requestedDeliveryDate: '2026-09-20',
  orderedByName: '店舗スタッフ',
  totalYen: 11275,
  subtotalYen: 10250,
  taxYen: 1025,
  lineCount: 2,
  totalQuantity: 3,
  dealerNote: 'メーカー直送',
  salonNote: '午前中希望',
}

const detail = {
  order,
  lines: [
    { id: 'line-1', manufacturerName: 'ミルボン', productName: 'オージュア', productCode: 'MIL-001', janCode: '4900000000001', listPrice: 5000, discountRate: 20, unitPrice: 4000, quantity: 2, deliveredQuantity: 2, lineTotal: 8000 },
    { id: 'line-2', manufacturerName: 'サンコール', productName: 'ヘアカラー', productCode: 'SUN-002', janCode: '4900000000002', listPrice: 3000, discountRate: 25, unitPrice: 2250, quantity: 1, deliveredQuantity: 1, lineTotal: 2250 },
  ],
}

function html() {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wholesale-ordering-v543.css"></head><body class="wo-body wo-dealer-body" data-wholesale-page="dealer" data-dealer-view="orders"><main class="wo-main"><div id="wholesale-app" class="wo-app-root"></div></main><script src="/wholesale-ordering-client-v543.js"></script></body></html>`
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/dealer/orders') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(html())
    return
  }
  if (url.pathname === '/wholesale-ordering-client-v543.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(client)
    return
  }
  if (url.pathname === '/wholesale-ordering-v543.css') {
    res.writeHead(200, { 'content-type': 'text/css; charset=utf-8' })
    res.end(css)
    return
  }
  if (url.pathname === '/api/dealer/bootstrap') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify({
      ok: true,
      dealer: { id: 'dealer-v656', name: 'スーパーヤマモト', loginId: 'yamamoto', dealerCode: 'DLR-V656' },
      contracts: [{ id: 'contract-v656', dealerId: 'dealer-v656', organizationName: 'Salon de Lien', status: 'ACTIVE' }],
      products: [],
      contractProductPrices: [],
      orders: [order],
      productPagination: null,
      pricingPagination: null,
    }))
    return
  }
  if (url.pathname === '/api/dealer/orders/order-v656') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ ok: true, ...detail }))
    return
  }
  if (/^\/dealer\/orders\/order-v656\/(delivery-note|invoice)$/.test(url.pathname)) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(url.pathname.endsWith('/invoice') ? (invoiceFixture || '<!doctype html><html><body>invoice fixture unavailable</body></html>') : (deliveryFixture || '<!doctype html><html><body>delivery fixture unavailable</body></html>'))
    return
  }
  if (url.pathname === '/dealer/orders/order-v656/export.csv') {
    res.writeHead(200, { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="PO-20260917-V656-order.csv"' })
    res.end('\uFEFF"発注番号","商品名"\r\n"PO-20260917-V656","オージュア"\r\n')
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
  for (const viewport of [{ name: 'desktop', width: 1440, height: 960 }, { name: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1, acceptDownloads: true })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text()) })

    await page.goto(`${base}/dealer/orders?ui=v656-${viewport.name}`, { waitUntil: 'networkidle' })
    const row = page.locator('.wo-dealer-order-row')
    await row.waitFor({ state: 'visible' })
    const links = row.locator('.wo-order-document-actions-v656 a')
    assert.equal(await links.count(), 3)
    assert.deepEqual(await links.evaluateAll(nodes => nodes.map(node => new URL(node.href).pathname)), [
      '/dealer/orders/order-v656/delivery-note',
      '/dealer/orders/order-v656/invoice',
      '/dealer/orders/order-v656/export.csv',
    ])

    const layout = await row.evaluate(element => {
      const rowRect = element.getBoundingClientRect()
      const buttonRect = element.querySelector('button').getBoundingClientRect()
      const links = [...element.querySelectorAll('.wo-order-document-actions-v656 a')].map(link => {
        const rect = link.getBoundingClientRect()
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
      })
      return {
        row: { left: rowRect.left, right: rowRect.right, top: rowRect.top, bottom: rowRect.bottom },
        buttonBottom: buttonRect.bottom,
        links,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }
    })
    assert.ok(layout.overflow <= 2, `${viewport.name} overflowed by ${layout.overflow}px`)
    for (const link of layout.links) {
      assert.ok(link.width >= 34 && link.height >= 34)
      assert.ok(link.left >= layout.row.left - 1 && link.right <= layout.row.right + 1)
      assert.ok(link.top >= layout.row.top - 1 && link.bottom <= layout.row.bottom + 1)
    }
    for (let index = 1; index < layout.links.length; index += 1) assert.ok(layout.links[index - 1].right <= layout.links[index].left)
    await page.screenshot({ path: path.join(output, `dealer-order-list-${viewport.name}.png`), fullPage: true })

    await row.locator('button[data-action="open-order"]').click()
    const dialog = page.locator('#wo-order-dialog')
    await dialog.waitFor({ state: 'visible' })
    const dialogActions = dialog.locator('.wo-dialog-document-actions-v656 a')
    await dialogActions.first().waitFor({ state: 'visible' })
    assert.equal(await dialogActions.count(), 3)
    assert.deepEqual(await dialogActions.allTextContents(), ['納品書', '請求書', 'CSV'])
    const dialogLayout = await dialog.evaluate(element => ({
      left: element.getBoundingClientRect().left,
      right: element.getBoundingClientRect().right,
      viewport: innerWidth,
      overflow: element.scrollWidth - element.clientWidth,
    }))
    assert.ok(dialogLayout.left >= -1 && dialogLayout.right <= dialogLayout.viewport + 1)
    assert.ok(dialogLayout.overflow <= 2)
    assert.deepEqual(errors, [])

    await page.screenshot({ path: path.join(output, `dealer-order-dialog-${viewport.name}.png`), fullPage: true })
    let documents = 0
    if (invoiceFixture && deliveryFixture) {
      for (const documentType of ['delivery-note', 'invoice']) {
        const documentPage = await context.newPage()
        const documentErrors = []
        documentPage.on('pageerror', error => documentErrors.push(error.message))
        await documentPage.goto(`${base}/dealer/orders/order-v656/${documentType}`, { waitUntil: 'networkidle' })
        const sheet = documentPage.locator('.wo-delivery-note')
        await sheet.waitFor({ state: 'visible' })
        const documentLayout = await documentPage.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          sheetWidth: document.querySelector('.wo-delivery-note').getBoundingClientRect().width,
          viewport: document.documentElement.clientWidth,
        }))
        assert.ok(documentLayout.overflow <= 2, `${viewport.name} ${documentType} overflowed by ${documentLayout.overflow}px`)
        assert.ok(documentLayout.sheetWidth <= documentLayout.viewport + 1)
        if (documentType === 'invoice') {
          assert.match(await sheet.textContent(), /値引き合計[\s\S]*-2,750円/)
          assert.doesNotMatch(await sheet.textContent(), /割引率|20%|25%/)
        } else {
          assert.match(await sheet.textContent(), /定価小計（税抜）[\s\S]*13,000円/)
          assert.doesNotMatch(await sheet.textContent(), /値引き合計|10,250円/)
        }
        assert.deepEqual(documentErrors, [])
        await documentPage.screenshot({ path: path.join(output, `${documentType}-${viewport.name}.png`), fullPage: true })
        await documentPage.close()
        documents += 1
      }
    }
    results.push({ viewport: viewport.name, listActions: 3, dialogActions: 3, documents, overflow: layout.overflow })
    await context.close()
  }

  console.log(JSON.stringify({ release: 'dealer-order-documents-v656', browserVerified: true, results, output }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
