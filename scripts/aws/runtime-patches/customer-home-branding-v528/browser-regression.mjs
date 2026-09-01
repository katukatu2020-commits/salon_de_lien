import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-home-branding-v528')
const releaseDir = path.dirname(fileURLToPath(import.meta.url))
const client = fs.readFileSync(path.join(releaseDir, 'customer-home-branding-client-v528.js'))
const salonImage = fs.readFileSync(path.resolve(releaseDir, '../../../../public/brand/salon-interior-illustrated.png'))
fs.mkdirSync(screenshotDir, { recursive: true })

const icons = {
  booking: '<rect x="3" y="4" width="18" height="17" rx="3"></rect><path d="M8 2v4M16 2v4M3 9h18"></path><path d="m8.5 15 2.2 2.2 4.8-5"></path>',
  campaign: '<path d="m3 11 15-5v12L3 14v-3Z"></path><path d="M7 15.3 8.5 21h4l-1.8-7"></path><path d="M21 8V5M20 11h3M21 14v3"></path>',
  profile: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="9" r="3"></circle><path d="M6.8 19a6 6 0 0 1 10.4 0"></path>',
  coupon: '<path d="M3 6h18v4a2.5 2.5 0 0 0 0 5v3H3v-3a2.5 2.5 0 0 0 0-5V6Z"></path><path d="m9 15 6-6"></path><circle cx="9.5" cy="9.5" r=".7" fill="currentColor" stroke="none"></circle><circle cx="14.5" cy="14.5" r=".7" fill="currentColor" stroke="none"></circle>',
  salons: '<path d="M4 10v10h16V10"></path><path d="M3 10 5 4h14l2 6"></path><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"></path><path d="M9 20v-5h6v5"></path>',
  loyalty: '<path d="M7 14h10l2 5H5l2-5Z"></path><path d="M9 14V9a3 3 0 0 1 6 0v5"></path><path d="m12 4 .7 1.4 1.6.2-1.2 1.1.3 1.6L12 7.5l-1.4.8.3-1.6-1.2-1.1 1.6-.2L12 4Z"></path><path d="M5 22h14"></path>',
  styles: '<circle cx="6" cy="7" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="m8.5 9 10.5 10M8.5 16 19 5"></path><path d="M20 2v4M18 4h4"></path>',
  recommendations: '<path d="M5 8h14l-1 13H6L5 8Z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path><path d="m15.5 14 .6 1.3 1.4.2-1 1 .2 1.4-1.2-.7-1.3.7.3-1.4-1.1-1 1.5-.2.6-1.3Z"></path>',
  reviews: '<path d="M20 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4v8Z"></path><path d="M12 14.5 8.8 11.4a2.1 2.1 0 0 1 3-3l.2.2.2-.2a2.1 2.1 0 0 1 3 3L12 14.5Z"></path>',
}
const quick = [
  ['booking', '予約する', 'RESERVE', 'rose'], ['campaign', 'キャンペーン', 'CAMPAIGN', 'amber'], ['profile', 'マイページ', 'MY PAGE', 'blue'],
  ['coupon', 'クーポン', 'COUPON', 'plum'], ['salons', '登録済みの店舗', 'MY SALONS', 'sage'], ['loyalty', 'スタンプカード', 'STAMP CARD', 'amber'],
  ['styles', 'ヘアスタイル', 'STYLE', 'blue'], ['recommendations', '私に合うアイテム', 'ITEM RANKING', 'sage'], ['reviews', 'お客様の声', 'IMPRESSION', 'rose'],
]
const customerCss = `*{box-sizing:border-box}html,body{margin:0;background:#eee8e4;color:#342d29;font-family:-apple-system,BlinkMacSystemFont,"Yu Gothic",sans-serif}.app{width:100%;max-width:480px;min-height:100vh;margin:auto;background:#fffdfb}.topbar{height:68px;display:grid;place-items:center;border-bottom:1px solid #eaded9;background:#fff}.brand{font-family:Georgia,serif;font-size:20px;font-weight:700}.welcome{padding:16px 18px}.welcome strong{display:block;font-family:"Yu Mincho",serif;font-size:17px}.welcome span{display:block;margin-top:6px;color:#81756f;font-size:11px}.hero{position:relative;height:192px;overflow:hidden;background:#ddd}.hero img{width:100%;height:100%;object-fit:cover;filter:saturate(.86) contrast(.96)}.hero:after{position:absolute;inset:0;content:"";background:linear-gradient(90deg,#33211999,#4028212e 64%,transparent)}.hero-copy{position:absolute;z-index:1;left:20px;bottom:24px;color:#fff;font-family:"Yu Mincho",serif;font-size:23px;line-height:1.55;letter-spacing:.12em;text-shadow:0 2px 12px #3a2219}.quick-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px}.quick-card{display:flex;min-width:0;min-height:118px;flex-direction:column;align-items:center;justify-content:center;border:1px solid #eaded9;border-radius:8px;background:#fff;box-shadow:0 5px 16px #61463b0d;text-decoration:none}.quick-icon{display:grid;width:48px;height:48px;place-items:center;border-radius:50%;background:var(--quick-bg);color:var(--quick-ink);box-shadow:inset 0 0 0 1px var(--quick-line)}.quick-icon svg{width:25px;height:25px}.quick-tone-rose{--quick-bg:#fbe9ee;--quick-ink:#bf506b;--quick-line:#f1ccd6}.quick-tone-sage{--quick-bg:#eaf3ee;--quick-ink:#4c7b67;--quick-line:#d3e4da}.quick-tone-amber{--quick-bg:#f8f0df;--quick-ink:#99703d;--quick-line:#eadcbd}.quick-tone-blue{--quick-bg:#eaf0f3;--quick-ink:#587483;--quick-line:#d5e0e5}.quick-tone-plum{--quick-bg:#f1eaf2;--quick-ink:#795d7d;--quick-line:#e2d4e4}.quick-card strong{max-width:100%;margin-top:10px;padding:0 5px;color:#3b302b;font-size:11px;line-height:1.35;text-align:center;word-break:keep-all}.quick-card small{margin-top:4px;color:#a8958d;font:7px Georgia,serif;letter-spacing:.08em}@media(min-width:1024px){body{background:#fff}.app{max-width:1240px}.hero{height:350px;border-radius:18px}.hero-copy{left:44px;bottom:42px;font-size:34px}.quick-grid{gap:14px;padding:22px 0}.quick-card{min-height:154px}.quick-icon{width:56px;height:56px}.quick-icon svg{width:29px;height:29px}.quick-card strong{font-size:13px}}`

const homeHtml = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${customerCss}</style></head><body><main class="app"><header class="topbar"><span class="brand">ORIMIA for Salon</span></header><section class="welcome"><strong>米津玄師 様</strong><span>いつもご来店ありがとうございます</span></section><section class="hero" data-customer-home-branding="v528"><img src="/salon.png" alt="店舗からのホームメッセージ"><div class="hero-copy">あなたらしい、<br>美しさへ。</div></section><section class="quick-grid" aria-label="サービス一覧">${quick.map(([name, label, english, tone]) => `<a class="quick-card" href="#${name}" aria-label="${label}"><span class="quick-icon quick-tone-${tone}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg></span><strong>${label}</strong><small>${english}</small></a>`).join('')}</section></main></body></html>`

const settingsHtml = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#faf7f4;color:#342923;font-family:-apple-system,BlinkMacSystemFont,"Yu Gothic",sans-serif}.shell{max-width:1320px;margin:auto;padding:30px}.hero{border:1px solid #ead9d0;border-radius:20px;background:#fffdfb;padding:26px}.hero h1{margin:0;font-family:"Yu Mincho",serif;font-size:31px}.tabs{display:grid;grid-template-columns:repeat(3,1fr);margin-top:22px;border:1px solid #ead9d0;border-radius:14px;background:#fff;padding:5px}.tabs span{padding:14px;text-align:center;font-weight:700}.tabs span:first-child{background:#fbeaf0;color:#a84760}#store-profile{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}.placeholder{min-height:110px;border:1px solid #ead9d0;border-radius:16px;background:#fff;padding:20px}@media(max-width:640px){.shell{padding:12px}.hero{padding:20px}.hero h1{font-size:24px}.tabs{font-size:11px}#store-profile{grid-template-columns:1fr}}</style><script src="/client.js" defer></script></head><body><main class="shell"><section class="hero"><h1>店舗運用設定</h1></section><nav class="tabs"><span>店舗情報</span><span>会計・ポイント</span><span>外部アプリ連携</span></nav><section id="store-profile" data-ca-store-settings><article class="placeholder"><strong>店舗基本情報</strong></article><article class="placeholder"><strong>店舗アイコン</strong></article></section></main></body></html>`

let savedPayload = null
let uploadedBytes = 0
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  if (url.pathname === '/u/home') return void response.end(homeHtml)
  if (url.pathname === '/admin/settings') return void response.end(settingsHtml)
  if (url.pathname === '/client.js') { response.setHeader('Content-Type', 'application/javascript'); return void response.end(client) }
  if (url.pathname === '/salon.png' || url.pathname === '/brand/salon-interior-illustrated.png' || url.pathname === '/uploaded-image') { response.setHeader('Content-Type', 'image/png'); return void response.end(salonImage) }
  if (url.pathname === '/api/lien-customer-home-branding' && request.method === 'GET') {
    response.setHeader('Content-Type', 'application/json')
    return void response.end(JSON.stringify({ success: true, branding: { phrase: 'あたらしい、\n美しさを大切に。', imageKey: null, imageUrl: '/brand/salon-interior-illustrated.png', isDefault: true } }))
  }
  if (url.pathname === '/api/lien-customer-home-branding/image' && request.method === 'POST') {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    uploadedBytes = Buffer.concat(chunks).length
    response.statusCode = 201
    response.setHeader('Content-Type', 'application/json')
    return void response.end(JSON.stringify({ success: true, imageKey: 'private/customer-home-branding/org-fixture/home.jpg' }))
  }
  if (url.pathname === '/api/lien-customer-home-branding' && request.method === 'PUT') {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    savedPayload = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    response.setHeader('Content-Type', 'application/json')
    return void response.end(JSON.stringify({ success: true, branding: { phrase: savedPayload.phrase || 'あたらしい、\n美しさを大切に。', imageKey: savedPayload.imageKey || null, imageUrl: savedPayload.imageKey ? '/uploaded-image' : '/brand/salon-interior-illustrated.png', isDefault: Boolean(savedPayload.reset) } }))
  }
  response.statusCode = 404
  response.end('not found')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const baseUrl = `http://127.0.0.1:${server.address().port}`

let browser
try {
  browser = await chromium.launch({ executablePath, headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await page.goto(`${baseUrl}/u/home`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('.quick-card').count(), 9)
  assert.equal(await page.locator('.quick-icon svg').count(), 9)
  const uniqueIcons = await page.locator('.quick-icon svg').evaluateAll(nodes => new Set(nodes.map(node => node.innerHTML)).size)
  assert.equal(uniqueIcons, 9)
  const mobileState = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, hero: document.querySelector('.hero')?.dataset.customerHomeBranding, phrase: document.querySelector('.hero-copy')?.innerText }))
  assert.ok(mobileState.width <= mobileState.viewport)
  assert.equal(mobileState.hero, 'v528')
  assert.equal(mobileState.phrase, 'あなたらしい、\n美しさへ。')
  await page.screenshot({ path: path.join(screenshotDir, 'customer-home-mobile.png'), fullPage: true })

  await page.setViewportSize({ width: 1365, height: 900 })
  await page.goto(`${baseUrl}/u/home`, { waitUntil: 'networkidle' })
  const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  assert.ok(desktopOverflow <= 0)
  await page.screenshot({ path: path.join(screenshotDir, 'customer-home-desktop.png'), fullPage: true })

  await page.goto(`${baseUrl}/admin/settings`, { waitUntil: 'networkidle' })
  await page.locator('[data-ohb-panel]').waitFor()
  assert.equal(await page.locator('[data-ohb-panel]').count(), 1)
  assert.equal(await page.locator('[data-ohb-phrase]').inputValue(), 'あたらしい、\n美しさを大切に。')
  const fixtureImage = await sharp({ create: { width: 880, height: 1100, channels: 3, background: '#708c7c' } }).png().toBuffer()
  await page.locator('[data-ohb-file]').setInputFiles({ name: 'salon-home.png', mimeType: 'image/png', buffer: fixtureImage })
  await page.locator('.ohb-modal').waitFor()
  const cropRatio = await page.locator('.ohb-crop-stage canvas').evaluate(canvas => canvas.width / canvas.height)
  assert.equal(cropRatio, 16 / 9)
  await page.screenshot({ path: path.join(screenshotDir, 'customer-home-cropper.png'), fullPage: true })
  await page.locator('[data-ohb-confirm]').click()
  await page.locator('.ohb-modal').waitFor({ state: 'detached' })
  await page.locator('[data-ohb-phrase]').fill('この店だけの、\n美しさと出会う。')
  await page.locator('[data-ohb-panel] button[type="submit"]').click()
  await page.getByText('顧客アプリのホーム表示を保存しました。').waitFor()
  assert.ok(uploadedBytes > 100)
  assert.equal(savedPayload.phrase, 'この店だけの、\n美しさと出会う。')
  assert.equal(savedPayload.imageKey, 'private/customer-home-branding/org-fixture/home.jpg')
  const settingsState = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, panel: document.querySelectorAll('[data-ohb-panel]').length, copy: document.querySelector('[data-ohb-preview-copy]')?.textContent }))
  assert.ok(settingsState.width <= settingsState.viewport)
  assert.equal(settingsState.panel, 1)
  assert.equal(settingsState.copy, savedPayload.phrase)
  await page.screenshot({ path: path.join(screenshotDir, 'customer-home-settings.png'), fullPage: true })

  await page.evaluate(() => history.pushState({}, '', '/admin/appointments'))
  await page.locator('[data-ohb-panel]').waitFor({ state: 'detached' })
  assert.equal(await page.locator('[data-ohb-panel]').count(), 0)
  await page.evaluate(() => history.pushState({}, '', '/admin/settings'))
  await page.locator('[data-ohb-panel]').waitFor()
  assert.equal(await page.locator('[data-ohb-panel]').count(), 1)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('[data-ohb-panel]').waitFor()
  const settingsMobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  assert.ok(settingsMobileOverflow <= 0)
  await page.screenshot({ path: path.join(screenshotDir, 'customer-home-settings-mobile.png'), fullPage: true })

  console.log(JSON.stringify({ release: 'customer-home-branding-v528', browserVerified: true, screenshotDir }))
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
