import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3142').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-customer-chart-attachment-delete-v567')
fs.mkdirSync(artifactRoot, { recursive:true })

const sampleImage = color => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520"><rect width="900" height="520" fill="#f4eee8"/><rect x="25" y="25" width="850" height="470" fill="#fff" stroke="${color}" stroke-width="3"/><path d="M55 120H845M55 200H845M55 280H845M55 360H845M310 120V465M610 120V465" stroke="#cbbdb5" stroke-width="3"/><text x="55" y="82" font-family="sans-serif" font-size="26" fill="${color}">CUSTOMER CHART</text></svg>`)}`

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

    const items = [
      {
        id:'latest-image',
        url:sampleImage('#b64865'),
        downloadUrl:sampleImage('#b64865'),
        originalFileName:'最新カルテ.png',
        contentType:'image/png',
        kind:'image',
        byteSize:418000,
        uploadedByName:'店舗オーナー',
        createdAt:'2026-09-07T09:30:00.000Z',
      },
      {
        id:'older-pdf',
        url:'https://files.example/chart.pdf?mode=inline',
        downloadUrl:'https://files.example/chart.pdf?mode=download',
        originalFileName:'前回カルテ.pdf',
        contentType:'application/pdf',
        kind:'pdf',
        byteSize:284000,
        uploadedByName:'店舗スタッフ',
        createdAt:'2026-09-06T08:15:00.000Z',
      },
      {
        id:'oldest-image',
        url:sampleImage('#4f876f'),
        downloadUrl:sampleImage('#4f876f'),
        originalFileName:'初回カルテ.webp',
        contentType:'image/webp',
        kind:'image',
        byteSize:197000,
        uploadedByName:'店舗スタッフ',
        createdAt:'2026-09-05T08:15:00.000Z',
      },
    ]
    const deletions = []
    const deletionOrigins = []
    const page = await context.newPage()
    const errors = []
    const knownHydrationNoise = /Minified React error #(418|423)/
    page.on('pageerror', error => { if (!knownHydrationNoise.test(error.message)) errors.push(`page:${error.message}`) })
    page.on('console', message => { if (message.type() === 'error' && !knownHydrationNoise.test(message.text())) errors.push(`console:${message.text()}`) })
    await page.route(/\/api\/admin\/customers\/[^/]+\/chart-photos(?:\/[^/?]+)?(?:\?.*)?$/, async route => {
      const request = route.request()
      const url = new URL(request.url())
      const match = /\/chart-photos(?:\/([^/]+))?$/.exec(url.pathname)
      const attachmentId = match?.[1] ? decodeURIComponent(match[1]) : null
      if (request.method() === 'DELETE') {
        const index = items.findIndex(item => item.id === attachmentId)
        if (index < 0) {
          await route.fulfill({ status:404, contentType:'application/json', body:JSON.stringify({ ok:false, error:'削除するカルテファイルが見つかりません。' }) })
          return
        }
        deletions.push(attachmentId)
        deletionOrigins.push(request.headers().origin || '')
        items.splice(index, 1)
        await route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ ok:true, deletedId:attachmentId }) })
        return
      }
      if (request.method() !== 'GET') {
        await route.fulfill({ status:405, contentType:'application/json', body:'{}' })
        return
      }
      const limit = Math.max(1, Number(url.searchParams.get('limit') || 1))
      const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
      await route.fulfill({
        status:200,
        contentType:'application/json',
        body:JSON.stringify({ ok:true, count:items.length, limit, offset, items:items.slice(offset, offset + limit) }),
      })
    })

    await page.goto(`${baseUrl}/admin/customers/${encodeURIComponent(customerId)}?verify=v567-${name}`, { waitUntil:'domcontentloaded', timeout:30_000 })
    await page.waitForFunction(() => window.__lienCustomerChartAttachmentDeleteV567 === true, null, { timeout:15_000 })
    const card = page.locator('[data-chart-latest-card-v561]')
    await card.waitFor({ state:'visible', timeout:15_000 })
    await card.getByText('最新カルテ.png', { exact:true }).waitFor()
    assert.equal(await card.locator('[data-chart-delete]').count(), 1)
    await card.scrollIntoViewIfNeeded()
    await page.screenshot({ path:path.join(artifactRoot, `latest-${name}.png`), fullPage:false })

    await card.locator('[data-chart-delete]').click()
    const dialog = page.locator('dialog[data-chart-delete-dialog-v567]')
    await dialog.waitFor({ state:'visible' })
    assert.equal(await dialog.locator('input[type="text"],textarea').count(), 0)
    const confirm = dialog.locator('[data-chart-delete-confirm]')
    assert.equal(await confirm.isDisabled(), true)
    await page.screenshot({ path:path.join(artifactRoot, `confirm-${name}.png`), fullPage:false })
    await dialog.locator('[data-chart-delete-check]').check()
    assert.equal(await confirm.isEnabled(), true)
    await confirm.click()
    await card.getByText('カルテファイルを削除しました。', { exact:true }).waitFor()
    await card.locator('.lien-chart-meta-row dd').filter({ hasText:/^前回カルテ\.pdf$/ }).waitFor()
    assert.deepEqual(deletions, ['latest-image'])
    assert.deepEqual(deletionOrigins, [new URL(baseUrl).origin])
    assert.match(await card.locator('[data-chart-history] span').textContent(), /2件/)

    await card.locator('[data-chart-history]').click()
    const history = page.locator('[data-chart-history-page-v561]')
    await history.waitFor({ state:'visible' })
    assert.equal(await history.locator('.lien-chart-item').count(), 2)
    assert.equal(await history.locator('[data-chart-delete]').count(), 2)
    await history.locator('[data-chart-delete="older-pdf"]').click()
    await dialog.waitFor({ state:'visible' })
    assert.equal(await dialog.getByText('前回カルテ.pdf', { exact:true }).count(), 1)
    assert.equal(await dialog.locator('[data-chart-delete-confirm]').isDisabled(), true)
    await dialog.locator('[data-chart-delete-check]').check()
    await dialog.locator('[data-chart-delete-confirm]').click()
    await history.getByText('カルテファイルを削除しました。', { exact:true }).waitFor()
    await page.waitForFunction(() => document.querySelectorAll('[data-chart-history-page-v561] .lien-chart-item').length === 1)
    assert.deepEqual(deletions, ['latest-image', 'older-pdf'])
    assert.deepEqual(deletionOrigins, [new URL(baseUrl).origin, new URL(baseUrl).origin])
    assert.equal(await history.getByText('前回カルテ.pdf', { exact:true }).count(), 0)

    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth)
    assert.ok(overflow <= 1, `${name}: page overflowed by ${overflow}px`)
    await page.screenshot({ path:path.join(artifactRoot, `history-${name}.png`), fullPage:false })
    assert.deepEqual(errors, [], `${name}: browser errors: ${errors.join(' | ')}`)
    await context.close()
  }

  console.log(JSON.stringify({
    release:'customer-chart-attachment-delete-v567',
    latestDelete:true,
    historyDelete:true,
    checkboxConfirmation:true,
    noTypedConfirmation:true,
    responsive:true,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
