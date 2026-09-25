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
const source = fs.readFileSync(path.join(releaseDir, 'appointment-datetime-editor-v663.js'), 'utf8')
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'appointment-datetime-editor-v663')
fs.mkdirSync(screenshotDir, { recursive: true })

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  :root{--lien-border:#e4d5ce;--lien-primary:#bd526c;--lien-ink:#342824}*{box-sizing:border-box}body{margin:0;background:#faf6ef;color:#342824;font-family:Arial,'Noto Sans JP',sans-serif}.page{margin:auto;max-width:1180px;padding:32px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.card{min-width:0;border:1px solid #e4d5ce;border-radius:8px;background:#fff;padding:20px;box-shadow:0 8px 26px #4422110d}.card p{margin:0}.metric-value{margin-top:12px;font-size:22px;font-weight:800}.helper{margin-top:10px;color:#8b7b73;font-size:13px}.details{margin-top:24px}.details dl{display:grid;gap:12px}.details dl div{display:flex;justify-content:space-between;border-bottom:1px solid #eee1dc;padding:11px 0}.details dt{color:#8b7b73}.details dd{margin:0;font-weight:700}@media(max-width:700px){.page{padding:16px}.metrics{grid-template-columns:1fr}.metrics .card:not(:first-child){display:none}}
</style></head><body><main class="page"><section class="metrics grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
  <article class="card overflow-hidden p-4 sm:p-5"><div><div><p>予約日時</p><div class="metric-value"><span class="tabular-nums">2026年9月25日(金) 11:00</span></div></div></div><div class="helper" data-status>仮予約</div></article>
  <article class="card overflow-hidden p-4 sm:p-5"><div><div><p>本日のメニュー</p><div class="metric-value"><span class="tabular-nums">カット + カラー</span></div></div></div><div class="helper">担当: 谷崎 太二</div></article>
  <article class="card overflow-hidden p-4 sm:p-5"><p>利用可能ポイント</p><div class="metric-value">0 pt</div></article>
  <article class="card overflow-hidden p-4 sm:p-5"><p>本日のお会計</p><div class="metric-value">12,000円</div></article>
</section><section class="card details"><dl><div><dt>予約日時</dt><dd>2026年9月25日(金) 11:00</dd></div><div><dt>施術時間</dt><dd>75分</dd></div><div><dt>メニュー</dt><dd>カット + カラー</dd></div><div><dt>担当</dt><dd>谷崎 太二</dd></div></dl></section></main>
<script>
  if(new URLSearchParams(location.search).has('locked')) document.querySelector('[data-status]').textContent='会計済み';
  window.__scheduleRequests=[];
  window.fetch=async function(url,options){
    const body=JSON.parse(options.body); window.__scheduleRequests.push({url,method:options.method,body});
    if(body.date==='2026-10-04') return {ok:false,status:409,json:async()=>({error:'谷崎 太二の受付可能数を超えています。'})};
    return {ok:true,status:200,json:async()=>({success:true,appointment:{scheduledAt:'2026-10-03T04:30:00.000Z',durationMinutes:body.durationMinutes,staffName:body.staffName,updatedAt:new Date().toISOString()}})};
  };
</script><script src="/appointment-datetime-editor-v663.js" defer></script></body></html>`

const server = http.createServer((request, response) => {
  if (request.url?.startsWith('/appointment-datetime-editor-v663.js')) {
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
  const page = await browser.newPage({ viewport: { width: 1200, height: 850 } })
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(`${baseUrl}/admin/appointments/appointment-fixture`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__orimiaAppointmentDatetimeEditorV663 === true)

  const trigger = page.locator('[data-orimia-appointment-datetime-trigger-v663]')
  await trigger.waitFor({ state: 'visible' })
  assert.equal(await trigger.count(), 1)
  await trigger.click()

  const dialog = page.locator('#orimia-appointment-datetime-v663')
  await dialog.waitFor({ state: 'visible' })
  assert.equal(await dialog.locator('input[name="date"]').inputValue(), '2026-09-25')
  assert.equal(await dialog.locator('input[name="time"]').inputValue(), '11:00')
  assert.match(await dialog.locator('.orimia-appointment-datetime-summary-v663').textContent(), /75分 \/ 担当 谷崎 太二/)

  await dialog.locator('input[name="date"]').fill('2026-10-03')
  await dialog.locator('input[name="time"]').fill('13:30')
  await dialog.getByRole('button', { name: '変更を保存' }).click()
  await page.getByText('予約日時を変更しました。シフト表とお客様アプリにも反映されます。').waitFor({ state: 'visible' })
  await dialog.waitFor({ state: 'hidden' })

  const requests = await page.evaluate(() => window.__scheduleRequests)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].url, '/api/admin/appointments/appointment-fixture/schedule')
  assert.equal(requests[0].method, 'PATCH')
  assert.deepEqual(requests[0].body, {
    date: '2026-10-03', startMinutes: 810, durationMinutes: 75, staffName: '谷崎 太二',
  })
  assert.equal(await page.locator('.metrics article').first().locator('.tabular-nums').textContent(), '2026年10月3日(土) 13:30')
  assert.equal(await page.locator('dt', { hasText: '予約日時' }).locator('xpath=following-sibling::dd').textContent(), '2026年10月3日(土) 13:30')

  await trigger.click()
  await dialog.waitFor({ state: 'visible' })
  assert.equal(await dialog.locator('input[name="date"]').inputValue(), '2026-10-03')
  assert.equal(await dialog.locator('input[name="time"]').inputValue(), '13:30')
  await dialog.locator('input[name="date"]').fill('2026-10-04')
  await dialog.locator('input[name="time"]').fill('15:00')
  await dialog.getByRole('button', { name: '変更を保存' }).click()
  await dialog.getByText('谷崎 太二の受付可能数を超えています。').waitFor({ state: 'visible' })
  assert.equal(await dialog.isVisible(), true)

  await page.setViewportSize({ width: 390, height: 844 })
  const overflow = await dialog.locator('.orimia-appointment-datetime-panel-v663').evaluate(element => element.scrollWidth - element.clientWidth)
  assert.ok(overflow <= 1, `mobile editor overflows by ${overflow}px`)
  const box = await dialog.locator('.orimia-appointment-datetime-panel-v663').boundingBox()
  assert.ok(box && box.width <= 390 && box.y >= 0 && box.y + box.height <= 845, `mobile editor is outside viewport: ${JSON.stringify(box)}`)
  await page.screenshot({ path: path.join(screenshotDir, 'appointment-datetime-editor-mobile.png'), fullPage: false })
  await dialog.getByRole('button', { name: '閉じる' }).click()
  await dialog.waitFor({ state: 'hidden' })

  await page.goto(`${baseUrl}/admin/appointments/appointment-locked?locked=1`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.__orimiaAppointmentDatetimeEditorV663 === true)
  await page.waitForTimeout(180)
  assert.equal(await page.locator('[data-orimia-appointment-datetime-trigger-v663]').count(), 0)
  assert.deepEqual(pageErrors, [])

  console.log(JSON.stringify({
    release: 'appointment-datetime-editor-v663',
    browserVerified: true,
    patchPayloadVerified: true,
    conflictMessageVerified: true,
    lockedAppointmentProtected: true,
    mobileVerified: true,
    screenshotDir,
  }))
} finally {
  await browser?.close().catch(() => {})
  await new Promise(resolve => server.close(resolve))
}
