import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const localRequire = createRequire(import.meta.url)
const { displayBookingConfirmationNameV635 } = localRequire('./booking-confirmation-name-v635.js')
const here = path.dirname(fileURLToPath(import.meta.url))
const output = process.env.SCREENSHOT_DIR || path.join(here, 'artifacts', 'browser')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const duplicatedName = '中島 弾正ナカジマ ダンジョウ'
const displayName = displayBookingConfirmationNameV635(duplicatedName)

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}body{margin:0;background:#fbf8f3;color:#2f2925;font-family:Arial,"Noto Sans JP",sans-serif}main{max-width:880px;margin:auto;padding:24px 16px}.card{border:1px solid #eadbd3;border-radius:16px;background:#fff;padding:20px}.labels{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.purpose{border-radius:999px;background:#f2b6ca;padding:8px 14px;color:#8e3555;font-weight:700}.outcome{font-weight:700}.name{display:inline-block;margin-top:12px;color:#98405f;font-size:20px;font-weight:700;text-decoration:none}.message{white-space:pre-wrap;line-height:1.8}
</style><title>予約確定</title></head><body><main><article class="card"><div class="labels"><span class="purpose">予約登録</span><span class="outcome">予約確定</span></div><a class="name" data-booking-confirmation-name-v635="customer-name-only">${displayName}</a><p class="message">電話予約（手動）: 2026/9/12 13:30:00\nメニュー: 3.カット（SB込）\n担当: 渡邊 浩明\n見込み金額: 4,500円</p></article></main></body></html>`

const server = http.createServer((request, response) => {
  if (request.url === '/favicon.ico') {
    response.statusCode = 204
    return response.end()
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end(html)
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' })
    const name = page.locator('[data-booking-confirmation-name-v635="customer-name-only"]')
    assert.equal(await name.textContent(), '中島 弾正')
    assert.equal(await page.getByText('ナカジマ ダンジョウ').count(), 0)
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }))
    assert.ok(layout.documentWidth <= layout.viewport + 2, `${width}: horizontal overflow`)
    await page.screenshot({ path: path.join(output, `booking-confirmation-${width}.png`), fullPage: true })
    results.push({ width, name: await name.textContent(), layout })
    await page.close()
  }
  console.log(JSON.stringify({ release: 'booking-confirmation-name-v635', browserVerified: true, results }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
