import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const { createLineReservationPageV527 } = require('./line-booking-page-v527.js')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'line-booking-ui-parity-v527')
fs.mkdirSync(screenshotDir, { recursive: true })

const generated = createLineReservationPageV527({
  connection: { publicCode: 'LIEN-TEST', slug: 'line-test', liffId: '1234567890-AbCdEf', organizationName: 'ヘアサロン 余白と光' },
  crypto,
  escapeHtml: value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]),
})

let server = null
let baseUrl = String(process.env.VERIFY_BASE_URL || '').replace(/\/$/, '')
const storeCode = process.env.VERIFY_STORE_CODE || (baseUrl ? 'LIEN-YOHAKU' : 'LIEN-TEST')
if (!baseUrl) {
  server = http.createServer((request, response) => {
    if (request.url === '/line/booking/LIEN-TEST' || request.url?.startsWith('/line/booking/LIEN-TEST?')) {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      response.end(generated.html)
      return
    }
    response.writeHead(404)
    response.end('not found')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  baseUrl = `http://127.0.0.1:${address.port}`
}

const menuFixture = [
  { id: 'menu-cut', name: '似合わせカット', category: 'カット', description: '', durationMinutes: 60, priceYen: 5500 },
  { id: 'menu-color', name: '透明感カラー', category: 'カラー', description: '', durationMinutes: 90, priceYen: 8800 },
  { id: 'menu-spa', name: '頭皮ケアスパ', category: 'スパ', description: '', durationMinutes: 45, priceYen: 4400 },
]
const staffFixture = [
  { key: 'free', name: '指名なし', introduction: 'ご希望の日時に対応できるスタイリストをサロン側でご案内します。', roleLabel: '' },
  { key: 'amemiya', name: '雨宮 透', introduction: '髪質と生活に合わせて、扱いやすい仕上がりをご提案します。', roleLabel: 'トップスタイリスト' },
  { key: 'takase', name: '高瀬 美月', introduction: '柔らかな質感とヘアケアを大切にしています。', roleLabel: 'スタイリスト' },
]

async function configurePage(page) {
  await page.addInitScript(() => {
    window.liff = {
      init: async () => {},
      isLoggedIn: () => true,
      getIDToken: () => 'line-test-token',
      getDecodedIDToken: () => ({ name: 'LINE テスト顧客' }),
      isInClient: () => false,
      closeWindow: () => {},
      login: () => {},
    }
  })
  await page.route('https://static.line-scdn.net/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }))
  await page.route('**/api/lien-line-booking/config?*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ store: { code: 'LIEN-TEST', name: 'ヘアサロン 余白と光', openMinutes: 600, closeMinutes: 1140, closedWeekdays: [] }, menus: menuFixture, staff: staffFixture }),
  }))
  await page.route('**/api/lien-line-booking/availability?*', route => {
    const url = new URL(route.request().url())
    const weekStart = url.searchParams.get('weekStart')
    const start = new Date(`${weekStart}T00:00:00Z`)
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start)
      date.setUTCDate(date.getUTCDate() + index)
      return { date: date.toISOString().slice(0, 10), slots: [{ startMinutes: 600, label: '10:00' }, { startMinutes: 630, label: '10:30' }, { startMinutes: 690, label: '11:30' }] }
    })
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ weekStart, maximumDate: '2026-11-30', days }) })
  })
  await page.route('**/api/lien-line-booking/book', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, appointment: { id: 'appointment-v527', scheduledAt: '2026-09-08T01:00:00.000Z', menu: '透明感カラー', staffName: '雨宮 透' } }),
  }))
  await page.route('**/api/lien-line-booking/history?*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ appointments: [{ id: 'appointment-v527', scheduledAt: '2026-09-08T01:00:00.000Z', menu: '透明感カラー', staffName: '雨宮 透', status: '予約確定', durationMinutes: 90, canCancel: true }] }),
  }))
  await page.route('**/api/lien-line-booking/cancel', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) }))
}

let browser
try {
  browser = await chromium.launch({ executablePath, headless: true })
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const mobile = await mobileContext.newPage()
  const mobileErrors = []
  mobile.on('pageerror', error => mobileErrors.push(error.message))
  await configurePage(mobile)
  await mobile.goto(`${baseUrl}/line/booking/${storeCode}`, { waitUntil: 'domcontentloaded' })
  await mobile.getByRole('heading', { name: 'メニューとスタイリストを選択' }).waitFor()
  await mobile.getByRole('button', { name: /選択中：似合わせカット/ }).click()
  await mobile.getByRole('dialog', { name: 'メニューを選択' }).waitFor()
  await mobile.getByPlaceholder('例：カット、カラー、スパ').fill('カラー')
  await mobile.getByRole('option', { name: /透明感カラー/ }).click()
  await mobile.getByRole('button', { name: /選択中：透明感カラー/ }).waitFor()
  await mobile.getByRole('button', { name: '雨宮 透', exact: true }).click()
  await mobile.locator('button.slot:not([disabled])').first().waitFor()
  await mobile.locator('button.slot:not([disabled])').first().click()
  assert.match(await mobile.locator('#finalSummary').innerText(), /透明感カラー.*雨宮 透/)
  await mobile.locator('#phone').fill('09012345678')
  assert.equal(await mobile.locator('#name').inputValue(), 'LINE テスト顧客')
  assert.equal(await mobile.locator('#submit').isEnabled(), true)
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'LINE booking page overflows on mobile')
  await mobile.screenshot({ path: path.join(screenshotDir, 'line-booking-mobile.png'), fullPage: true })
  await mobile.locator('#submit').click()
  await mobile.locator('#complete:not(.is-hidden)').waitFor()
  assert.match(await mobile.locator('#complete').innerText(), /予約を受け付けました/)
  await mobile.locator('#bottomHistory').click()
  await mobile.getByRole('heading', { name: '予約履歴' }).waitFor()
  await mobile.locator('#historyList h2', { hasText: '透明感カラー' }).waitFor()
  await mobile.screenshot({ path: path.join(screenshotDir, 'line-history-mobile.png'), fullPage: true })
  assert.deepEqual(mobileErrors, [], `mobile page errors: ${mobileErrors.join('; ')}`)
  await mobileContext.close()

  const desktopContext = await browser.newContext({ viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 })
  const desktop = await desktopContext.newPage()
  const desktopErrors = []
  desktop.on('pageerror', error => desktopErrors.push(error.message))
  await configurePage(desktop)
  await desktop.goto(`${baseUrl}/line/booking/${storeCode}`, { waitUntil: 'domcontentloaded' })
  await desktop.getByRole('heading', { name: 'メニューとスタイリストを選択' }).waitFor()
  await desktop.locator('button.slot:not([disabled])').first().waitFor()
  const desktopState = await desktop.evaluate(() => ({
    release: document.documentElement.dataset.lineBookingUiParity,
    brand: document.querySelector('.brand-title')?.textContent,
    oldMark: Boolean(document.querySelector('.mark')),
    bodyWidth: document.documentElement.scrollWidth,
    viewportWidth: innerWidth,
    columns: document.querySelectorAll('.availability-row:first-child > *').length,
  }))
  assert.equal(desktopState.release, 'v527')
  assert.equal(desktopState.brand, 'ORIMIA for Salon')
  assert.equal(desktopState.oldMark, false)
  assert.equal(desktopState.bodyWidth <= desktopState.viewportWidth, true)
  assert.equal(desktopState.columns, 8)
  await desktop.screenshot({ path: path.join(screenshotDir, 'line-booking-desktop.png'), fullPage: true })
  assert.deepEqual(desktopErrors, [], `desktop page errors: ${desktopErrors.join('; ')}`)
  await desktopContext.close()

  console.log(JSON.stringify({ release: 'line-booking-ui-parity-v527', browserVerified: true, screenshotDir }))
} finally {
  if (browser) await browser.close().catch(() => {})
  if (server) await new Promise(resolve => server.close(resolve))
}
