import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const localRequire = createRequire(import.meta.url)
const { resolveCustomerProfileNameV636 } = localRequire('./customer-profile-name-v636.js')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-profile-name-fields-v636/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const name = resolveCustomerProfileNameV636({}, '山本 公正')
const fields = [
  ['姓', 'lastName', name.lastName, 'family-name', '例: 山田'],
  ['名', 'firstName', name.firstName, 'given-name', '例: 花子'],
  ['セイ（フリガナ）', 'lastNameKana', name.lastNameKana, 'off', '例: ヤマダ'],
  ['メイ（フリガナ）', 'firstNameKana', name.firstNameKana, 'off', '例: ハナコ'],
]
const fieldHtml = fields.map(([label, field, value, autocomplete, placeholder]) =>
  `<label>${label}<input name="${field}" required maxlength="50" autocomplete="${autocomplete}" value="${value}" placeholder="${placeholder}"></label>`,
).join('')

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}body{margin:0;background:#fbf8f3;color:#2f2925;font-family:Arial,"Noto Sans JP",sans-serif}main{max-width:880px;margin:auto;padding:24px 16px}.card{border:1px solid #e8ded2;border-radius:20px;background:#fff;padding:20px;box-shadow:0 8px 22px #654b3b0d}.heading{display:flex;align-items:center;gap:10px;margin:0 0 18px;font-size:18px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}label{display:grid;min-width:0;gap:7px;font-size:14px;font-weight:700}input{width:100%;min-width:0;height:48px;border:1px solid #e8ded2;border-radius:12px;padding:0 16px;font-size:16px}.hint{color:#8b8178;font-size:11px;line-height:1.6}.nickname{align-content:start}@media(max-width:640px){.grid{grid-template-columns:minmax(0,1fr)}}
</style><title>登録情報の確認・変更</title></head><body><main><section class="card"><h1 class="heading">基本情報</h1><form action="/api/customer/profile" method="post" data-customer-profile-name-fields-v636="separated"><div class="grid">${fieldHtml}<label class="nickname">ニックネーム（任意）<input name="nickname" maxlength="30" autocomplete="nickname" placeholder="例: ひなた"><span class="hint">公開される場所では本名の代わりに表示されます。</span></label><label>電話番号<input name="phone" type="tel" value="090-2222-2222"></label></div></form></section></main></body></html>`

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
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' })
    const form = page.locator('[data-customer-profile-name-fields-v636="separated"]')
    assert.equal(await form.count(), 1)
    assert.equal(await form.locator('input[name="name"]').count(), 0)
    for (const [label, field, value] of fields) {
      const input = form.locator(`input[name="${field}"]`)
      assert.equal(await input.count(), 1)
      assert.equal(await input.getAttribute('required'), '')
      assert.equal(await input.inputValue(), value)
      assert.ok((await input.locator('xpath=..').innerText()).includes(label))
    }
    assert.equal(await form.locator('input[name="nickname"]').count(), 1)
    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      columns: getComputedStyle(document.querySelector('.grid')).gridTemplateColumns.split(' ').length,
    }))
    assert.ok(layout.documentWidth <= layout.viewport + 2, `${width}: horizontal overflow`)
    assert.equal(layout.columns, width <= 640 ? 1 : 2)
    await page.locator('.card').screenshot({ path: path.join(output, `profile-name-fields-${width}.png`) })
    results.push({ width, layout, fourFields: true, nicknamePreserved: true })
    await page.close()
  }
  console.log(JSON.stringify({ release: 'customer-profile-name-fields-v636', browserVerified: true, results }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
