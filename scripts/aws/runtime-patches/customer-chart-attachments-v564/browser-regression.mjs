import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3137').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-customer-chart-attachments-v564')
fs.mkdirSync(artifactRoot, { recursive:true })

const landscapePng = await sharp({
  create:{ width:900, height:420, channels:3, background:{ r:244, g:238, b:231 } },
}).composite([{
  input:Buffer.from('<svg width="900" height="420" xmlns="http://www.w3.org/2000/svg"><rect x="28" y="28" width="844" height="364" rx="8" fill="#fff" stroke="#b9aaa2" stroke-width="3"/><text x="58" y="84" font-family="sans-serif" font-size="25" fill="#4d413b">CUSTOMER CHART - LANDSCAPE</text><path d="M58 120H840M58 180H840M58 240H840M58 300H840M300 120V355M590 120V355" stroke="#d4c7c0" stroke-width="2"/></svg>'),
}]).png().toBuffer()
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n')
const sampleImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420"><rect width="900" height="420" fill="#f4eee8"/><rect x="25" y="25" width="850" height="370" fill="#fff" stroke="#8c7b72" stroke-width="3"/><path d="M55 100H845M55 170H845M55 240H845M55 310H845M310 100V365M610 100V365" stroke="#cbbdb5" stroke-width="3"/><text x="55" y="72" font-family="sans-serif" font-size="24">CUSTOMER CHART</text></svg>')}`

const browser = await chromium.launch({ executablePath, headless:true })
try {
  for (const [name, viewport] of [['desktop', { width:1440, height:1000 }], ['mobile', { width:390, height:844 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' },
    })
    assert.ok(login.ok(), `${name}: login failed with ${login.status()}`)

    const ledgerResponse = await context.request.get(`${baseUrl}/api/admin/sales-ledger?from=2025-01-01&to=2027-12-31`)
    assert.ok(ledgerResponse.ok(), `${name}: sales ledger failed with ${ledgerResponse.status()}`)
    const ledger = await ledgerResponse.json()
    const customerId = ledger.rows.find(row => row.customerId)?.customerId
    assert.ok(customerId, `${name}: no customer fixture was available`)

    let serial = 10
    const items = [
      {
        id:'pdf-existing',
        url:'https://files.example/chart.pdf?mode=inline',
        downloadUrl:'https://files.example/chart.pdf?mode=download',
        originalFileName:'手書きカルテ.pdf',
        contentType:'application/pdf',
        kind:'pdf',
        byteSize:284000,
        uploadedByName:'店舗オーナー',
        createdAt:'2026-09-06T09:30:00.000Z',
      },
      {
        id:'image-existing',
        url:sampleImage,
        downloadUrl:sampleImage,
        originalFileName:'初回来店カルテ.png',
        contentType:'image/png',
        kind:'image',
        byteSize:150000,
        uploadedByName:'店舗スタッフ',
        createdAt:'2026-09-05T08:15:00.000Z',
      },
    ]
    const posts = []
    const page = await context.newPage()
    const errors = []
    const knownHydrationNoise = /Minified React error #(418|423)/
    page.on('pageerror', error => { if (!knownHydrationNoise.test(error.message)) errors.push(`page:${error.message}`) })
    page.on('console', message => { if (message.type() === 'error' && !knownHydrationNoise.test(message.text())) errors.push(`console:${message.text()}`) })
    await page.route('**/api/admin/customers/*/chart-photos?*', async route => {
      const request = route.request()
      if (request.method() === 'POST') {
        const headers = request.headers()
        const type = headers['content-type']
        posts.push({ type, name:decodeURIComponent(headers['x-file-name'] || '') })
        const isPdf = type === 'application/pdf'
        const item = {
          id:`uploaded-${++serial}`,
          url:isPdf ? 'https://files.example/uploaded.pdf?mode=inline' : sampleImage,
          downloadUrl:isPdf ? 'https://files.example/uploaded.pdf?mode=download' : sampleImage,
          originalFileName:posts.at(-1).name,
          contentType:type,
          kind:isPdf ? 'pdf' : 'image',
          byteSize:request.postDataBuffer()?.length || 0,
          uploadedByName:'店舗オーナー',
          createdAt:new Date().toISOString(),
        }
        items.unshift(item)
        await route.fulfill({ status:201, contentType:'application/json', body:JSON.stringify({ ok:true, item }) })
        return
      }
      const url = new URL(request.url())
      const limit = Math.max(1, Number(url.searchParams.get('limit') || 1))
      const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
      await route.fulfill({
        status:200,
        contentType:'application/json',
        body:JSON.stringify({ ok:true, count:items.length, limit, offset, items:items.slice(offset, offset + limit) }),
      })
    })

    await page.goto(`${baseUrl}/admin/customers/${encodeURIComponent(customerId)}?verify=v564-${name}`, { waitUntil:'domcontentloaded', timeout:30_000 })
    await page.waitForFunction(() => window.__lienCustomerChartAttachmentsV564 === true, null, { timeout:15_000 })
    const card = page.locator('[data-chart-latest-card-v561]')
    await card.waitFor({ state:'visible', timeout:15_000 })
    await card.getByText('カルテファイル', { exact:true }).waitFor()
    const input = card.locator('[data-chart-file]')
    assert.match(await input.getAttribute('accept'), /application\/pdf/)
    assert.equal(await card.getByText('正方形の画像を選択してください。', { exact:true }).count(), 0)
    assert.equal(await card.locator('.lien-chart-pdf').count(), 1)
    assert.equal(await card.locator('a[href*="mode=download"]').count(), 1)

    await input.setInputFiles({ name:'横長の紙カルテ.png', mimeType:'image/png', buffer:landscapePng })
    await card.getByText('カルテファイルを保存しました。', { exact:true }).waitFor({ timeout:10_000 })
    await page.waitForTimeout(400)
    assert.equal(posts[0]?.type, 'image/png')
    assert.equal(posts[0]?.name, '横長の紙カルテ.png')
    assert.equal(await input.evaluate(node => node.validationMessage), '')
    assert.equal(await card.getByText('正方形の画像を選択してください。', { exact:true }).count(), 0)
    assert.equal(await card.locator('.lien-chart-media img').count(), 1)

    await input.setInputFiles({ name:'紙カルテ記録.pdf', mimeType:'application/pdf', buffer:pdf })
    await page.waitForFunction(() => document.querySelector('[data-chart-latest-card-v561] .lien-chart-pdf strong')?.textContent === '紙カルテ記録.pdf')
    assert.equal(posts[1]?.type, 'application/pdf')
    assert.equal(posts[1]?.name, '紙カルテ記録.pdf')
    assert.equal(await input.evaluate(node => node.validationMessage), '')
    assert.equal(await card.locator('.lien-chart-pdf').count(), 1)
    assert.equal(await card.locator('a[href*="mode=inline"]').count(), 1)
    assert.equal(await card.locator('a[href*="mode=download"]').count(), 1)

    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth)
    assert.ok(overflow <= 1, `${name}: page overflowed by ${overflow}px`)
    await card.scrollIntoViewIfNeeded()
    await page.screenshot({ path:path.join(artifactRoot, `latest-${name}.png`), fullPage:false })

    await card.locator('[data-chart-history]').click()
    const history = page.locator('[data-chart-history-page-v561]')
    await history.waitFor({ state:'visible' })
    assert.equal(await history.getByRole('heading', { name:'カルテファイル履歴' }).count(), 1)
    assert.equal(await history.locator('.lien-chart-item').count(), items.length)
    assert.ok(await history.locator('.lien-chart-pdf').count() >= 2)
    assert.equal(await history.locator('.lien-chart-item-actions').count(), items.length)
    await page.screenshot({ path:path.join(artifactRoot, `history-${name}.png`), fullPage:false })
    assert.deepEqual(errors, [], `${name}: browser errors: ${errors.join(' | ')}`)
    await context.close()
  }

  console.log(JSON.stringify({
    release:'customer-chart-attachments-v564',
    landscapeUpload:true,
    pdfUpload:true,
    squareWarningRemoved:true,
    responsive:true,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
