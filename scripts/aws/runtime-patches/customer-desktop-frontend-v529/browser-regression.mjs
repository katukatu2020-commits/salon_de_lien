import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const releaseDir = path.dirname(fileURLToPath(import.meta.url))
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-desktop-frontend-v529')
const client = fs.readFileSync(path.join(releaseDir, 'customer-desktop-shell-v529.js'))
const logo = fs.readFileSync(path.resolve(releaseDir, '../../../../public/brand/orimia-icon-192.png'))
fs.mkdirSync(screenshotDir, { recursive: true })

const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 11 12 4l9 7v9H3Z"/></svg>'
const baseCss = `*{box-sizing:border-box}html{background:#eee8e4}body{margin:0;background:#eee8e4;color:#342d29;font-family:-apple-system,BlinkMacSystemFont,"Yu Gothic",sans-serif}.app{width:100%;max-width:480px;min-height:100vh;margin:auto;background:#fffdfb}.topbar,.customer-premium-topbar{display:grid;height:68px;grid-template-columns:48px 1fr 48px;align-items:center;border-bottom:1px solid #eaded9;background:#fff;padding:0 12px}.brand,.customer-premium-brand{text-align:center;font-weight:800}.icon-button,.customer-premium-icon-button{display:grid;width:40px;height:40px;place-items:center}.icon-button svg,.customer-premium-icon-button svg{width:20px}.content,.customer-native-main{padding:18px 18px 88px}.welcome strong{font-family:"Yu Mincho",serif;font-size:18px}.welcome span{display:block;margin-top:5px;color:#81756f;font-size:11px}.hero{height:190px;margin-top:16px;border-radius:8px;background:#d8c8be}.quick-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.quick-card{display:grid;min-height:112px;place-items:center;border:1px solid #eaded9;border-radius:8px;background:#fff;font-size:11px}.bottom-nav{position:fixed;right:0;bottom:0;left:0;display:grid;max-width:480px;grid-template-columns:repeat(4,1fr);margin:auto;border-top:1px solid #eaded9;background:#fff;padding:8px}.bottom-nav a{display:grid;place-items:center;color:#81756f;font-size:10px}.bottom-nav svg{width:20px}.customer-native-main>div{display:grid;gap:18px}.customer-native-main header,.customer-native-main section{border:1px solid #eaded9;border-radius:24px;background:#fff;padding:22px}.customer-native-main h1{margin:4px 0}.customer-native-main p{color:#81756f}.customer-premium-topbar{grid-template-columns:40px 40px 1fr 40px}@media(min-width:1024px){body{padding:0}.app{max-width:1440px;padding-left:238px}.content{padding:28px 32px 60px}.bottom-nav{top:0;right:auto;bottom:0;left:0;width:238px;max-width:238px;height:100vh;grid-template-columns:1fr;align-content:start;gap:10px;padding:100px 18px}.customer-native-main{max-width:1180px;margin:auto;padding:32px}.hero{height:330px}.quick-card{min-height:145px}}`

function navMarkup() {
  return `<nav id="customer-mobile-bottom-nav" class="bottom-nav" data-customer-bottom-nav aria-label="お客様アプリメニュー"><a href="/u/home">${icon}<span>ホーム</span></a><a href="/u/appointments">${icon}<span>予約</span></a><a href="/u/history">${icon}<span>履歴</span></a><a href="/u/chat">${icon}<span>チャット相談</span></a></nav>`
}

function standaloneHtml(withClient) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseCss}</style>${withClient ? '<script src="/desktop.js" defer></script>' : ''}</head><body><div class="app"><header class="topbar"><a class="icon-button" href="/u/menu">${icon}</a><a class="brand" href="/u/home">ORIMIA for Salon</a><a class="icon-button customer-notification-link" href="/u/news">${icon}<span class="customer-notification-badge">3</span></a></header><main class="content"><section class="welcome"><strong>山本 はな 様</strong><span>いつもご来店ありがとうございます</span></section><section class="hero"></section><section class="quick-grid">${['予約する','キャンペーン','マイページ','クーポン','登録済みの店舗','スタンプカード','ヘアスタイル','おすすめ商品','お客様の声'].map(label => `<a class="quick-card" href="#">${label}</a>`).join('')}</section></main>${navMarkup()}</div></body></html>`
}

function nextHtml() {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseCss}</style><script src="/desktop.js" defer></script></head><body><div class="min-h-screen overflow-x-hidden"><header class="customer-premium-topbar"><button type="button">${icon}</button><a class="customer-premium-icon-button" href="/u/menu">${icon}</a><a class="customer-premium-brand" href="/u/home">ORIMIA for Salon</a><a class="customer-premium-icon-button customer-notification-link" href="/u/news">${icon}</a></header><main class="customer-native-main"><div><header class="rounded-[24px]"><small>Online booking</small><h1>サロン予約</h1><p>担当者とメニューを選び、空き時間からご予約いただけます。</p></header><section class="rounded-[24px]"><h2>メニューとスタイリストを選択</h2><p>選択中のメニューと担当者を確認します。</p></section><section class="rounded-[24px]"><h2>日時を選択</h2><div style="height:440px;background:#faf6f2"></div></section></div></main>${navMarkup()}</div></body></html>`
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  if (url.pathname === '/desktop.js') {
    response.setHeader('Content-Type', 'application/javascript')
    return void response.end(client)
  }
  if (url.pathname.startsWith('/brand/orimia-icon-192.png')) {
    response.setHeader('Content-Type', 'image/png')
    return void response.end(logo)
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (url.searchParams.get('fixture') === 'next') return void response.end(nextHtml())
  return void response.end(standaloneHtml(url.searchParams.get('client') === '1'))
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const baseUrl = `http://127.0.0.1:${server.address().port}`

async function rawScreenshot(page, fileName) {
  const filePath = path.join(screenshotDir, fileName)
  await page.screenshot({ path: filePath, fullPage: true })
  return sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
}

let browser
try {
  browser = await chromium.launch({ executablePath, headless: true })

  const mobileBaseline = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await mobileBaseline.goto(`${baseUrl}/u/home?client=0`, { waitUntil: 'networkidle' })
  const baselinePixels = await rawScreenshot(mobileBaseline, 'mobile-before.png')
  await mobileBaseline.close()

  const mobilePatched = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await mobilePatched.goto(`${baseUrl}/u/home?client=1`, { waitUntil: 'networkidle' })
  const patchedPixels = await rawScreenshot(mobilePatched, 'mobile-after.png')
  assert.deepEqual(patchedPixels.info, baselinePixels.info)
  assert.equal(Buffer.compare(patchedPixels.data, baselinePixels.data), 0, 'mobile pixels changed')
  assert.equal(await mobilePatched.locator('#orimia-customer-desktop-nav-v529').count(), 0)
  assert.equal(await mobilePatched.locator('#orimia-customer-desktop-style-v529').count(), 0)
  assert.equal(await mobilePatched.locator('#customer-mobile-bottom-nav').isVisible(), true)
  assert.equal(await mobilePatched.locator('.topbar').isVisible(), true)
  await mobilePatched.close()

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  await desktop.goto(`${baseUrl}/u/home?client=1`, { waitUntil: 'networkidle' })
  await desktop.locator('#orimia-customer-desktop-nav-v529').waitFor()
  assert.equal(await desktop.locator('.ocd-nav-link').count(), 14)
  assert.equal(await desktop.locator('[data-ocd-route="/u/home"]').getAttribute('aria-current'), 'page')
  assert.equal(await desktop.locator('.topbar').isVisible(), false)
  assert.equal(await desktop.locator('#customer-mobile-bottom-nav').isVisible(), false)
  const desktopState = await desktop.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    sidebarWidth: Math.round(document.querySelector('.ocd-sidebar').getBoundingClientRect().width),
    headerLeft: Math.round(document.querySelector('.ocd-header').getBoundingClientRect().left),
    bodyPadding: Math.round(parseFloat(getComputedStyle(document.body).paddingLeft)),
  }))
  assert.ok(desktopState.overflow <= 0)
  assert.equal(desktopState.sidebarWidth, 280)
  assert.equal(desktopState.headerLeft, 280)
  assert.equal(desktopState.bodyPadding, 280)
  await desktop.screenshot({ path: path.join(screenshotDir, 'desktop-home.png'), fullPage: true })

  await desktop.goto(`${baseUrl}/u/appointments?fixture=next`, { waitUntil: 'networkidle' })
  await desktop.locator('#orimia-customer-desktop-header-v529').waitFor()
  assert.equal(await desktop.locator('[data-ocd-title]').textContent(), '予約する')
  assert.equal(await desktop.locator('[data-ocd-route="/u/appointments"]').getAttribute('aria-current'), 'page')
  assert.equal(await desktop.locator('.customer-premium-topbar').isVisible(), false)
  assert.equal(await desktop.locator('.customer-native-main').evaluate(node => getComputedStyle(node).paddingTop), '112px')
  assert.ok(await desktop.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 0))
  await desktop.screenshot({ path: path.join(screenshotDir, 'desktop-appointments.png'), fullPage: true })

  await desktop.evaluate(() => history.pushState({}, '', '/u/profile'))
  await desktop.waitForFunction(() => document.querySelector('[data-ocd-title]')?.textContent === 'マイページ')
  assert.equal(await desktop.locator('[data-ocd-route="/u/profile"]').getAttribute('aria-current'), 'page')
  assert.equal(await desktop.locator('#orimia-customer-desktop-nav-v529').count(), 1)

  await desktop.setViewportSize({ width: 1024, height: 768 })
  await desktop.waitForTimeout(100)
  const compactState = await desktop.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    sidebarWidth: Math.round(document.querySelector('.ocd-sidebar').getBoundingClientRect().width),
  }))
  assert.ok(compactState.overflow <= 0)
  assert.equal(compactState.sidebarWidth, 248)
  await desktop.screenshot({ path: path.join(screenshotDir, 'desktop-compact.png'), fullPage: true })

  console.log(JSON.stringify({ release: 'customer-desktop-frontend-v529', browserVerified: true, mobilePixelDiff: 0, screenshotDir }))
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
