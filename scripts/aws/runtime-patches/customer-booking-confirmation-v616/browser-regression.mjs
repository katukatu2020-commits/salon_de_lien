import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-booking-confirmation-v616/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const here = path.dirname(fileURLToPath(import.meta.url))
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
  return errors
}

function unexpected(errors) {
  return errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))
}

const couponFixture = {
  previous: null,
  coupon: null,
  coupons: [
    { id: 'coupon-all-v616', couponCode: 'WELCOME10', discountRate: 10, targetMenus: ['全メニュー'], expiresAt: '2027-12-31T14:59:59.000Z', appointmentId: null },
    { id: 'coupon-other-v616', couponCode: 'SPA20', discountRate: 20, targetMenus: ['テスト対象外メニュー'], expiresAt: '2027-12-31T14:59:59.000Z', appointmentId: null },
    { id: 'coupon-reserved-v616', couponCode: 'USED30', discountRate: 30, targetMenus: [], expiresAt: '2027-12-31T14:59:59.000Z', appointmentId: 'already-booked' },
  ],
}

async function verify(viewport, name) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await context.route('**/api/lien-customer-booking-context*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(couponFixture),
  }))
  const login = await context.request.post(`${base}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/appointments' },
  })
  assert.ok(login.ok(), `Customer login returned ${login.status()}`)

  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${base}/u/appointments?verify=v616-${name}`, { waitUntil: 'domcontentloaded' })
  if (process.env.SMOKE_INJECT_CLIENT === '1') {
    await page.addScriptTag({ path: path.join(here, 'customer-booking-confirmation-v616.js') })
  }
  await page.locator('.cj-menu-row').first().waitFor({ timeout: 20000 })
  await page.waitForFunction(() => window.__lienCustomerBookingConfirmationV616 === true)

  const menuRadio = page.locator('[data-cj-menu]').first()
  await menuRadio.check()
  await page.getByRole('button', { name: '担当者を選ぶ', exact: true }).click()
  const staffButton = page.locator('.cj-staff-list button').first()
  await staffButton.click()
  await page.getByRole('button', { name: '日時を選ぶ', exact: true }).click()
  await page.waitForFunction(() => [...document.querySelectorAll('.cj-slot-row>button')].some(button => !button.disabled))
  const available = page.locator('.cj-slot-row>button:not([disabled])').first()
  const day = await available.getAttribute('data-cj-day')
  await page.locator(`[data-cj-date="${day}"]`).click()
  await available.click()
  await page.getByRole('button', { name: '予約内容を確認する', exact: true }).click()

  const summary = page.locator('[data-lien-booking-confirmation-v616]')
  await summary.waitFor({ timeout: 10000 })
  const couponSelect = page.getByRole('combobox', { name: '利用するクーポン' })
  await page.waitForFunction(() => {
    const select = document.querySelector('#lien-booking-coupon-v616')
    return select && !select.disabled && select.options.length === 2
  })
  assert.equal(await couponSelect.locator('option').count(), 2)
  assert.equal(await couponSelect.locator('option', { hasText: 'WELCOME10' }).count(), 1)
  assert.equal(await couponSelect.locator('option', { hasText: 'SPA20' }).count(), 0)
  assert.equal(await couponSelect.locator('option', { hasText: 'USED30' }).count(), 0)
  assert.equal(await summary.getByText('メニュー料金', { exact: true }).count(), 1)
  assert.equal(await summary.getByText('お支払い目安', { exact: true }).count(), 1)
  assert.equal(await summary.getByText('予約日の前日まで', { exact: false }).count(), 1)

  await couponSelect.selectOption('coupon-all-v616')
  await page.waitForFunction(() => window.__lienSelectedCouponV366?.id === 'coupon-all-v616')
  assert.equal(await summary.getByText('クーポン 10%OFF', { exact: true }).count(), 1)

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, `${name}: booking page has horizontal overflow`)
  await page.screenshot({ path: path.join(output, `confirmation-${name}.png`), fullPage: false })

  await page.waitForFunction(() => window.__lienCustomerBookingCouponV366 === true, null, { timeout: 10000 })
  let bookingBody = null
  let linkBody = null
  await page.route('**/api/customer/appointments', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    bookingBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ appointment: { id: `booking-fixture-${name}`, staffName: '確認用スタッフ' } }),
    })
  })
  await page.route('**/api/lien-customer-booking-coupon', async route => {
    linkBody = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  })
  await page.getByRole('button', { name: 'この日時で予約する', exact: true }).click()
  await page.getByText('予約を受け付けました', { exact: false }).first().waitFor()
  for (let attempt = 0; attempt < 50 && !linkBody; attempt += 1) await page.waitForTimeout(50)
  assert.equal(bookingBody.couponIssueId, 'coupon-all-v616')
  assert.equal(linkBody?.couponIssueId, 'coupon-all-v616')
  assert.equal(linkBody?.appointmentId, `booking-fixture-${name}`)

  let cancellationBody = null
  await page.route('**/api/lien-customer-appointment-cancel', async route => {
    cancellationBody = route.request().postDataJSON()
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) })
  })
  await page.evaluate(() => {
    const section = document.createElement('section')
    section.id = 'v616-cancel-fixtures'
    section.innerHTML = '<h2>現在の予約</h2>'
    const inTokyo = days => {
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' })
      const parts = formatter.formatToParts(new Date())
      const part = type => Number(parts.find(item => item.type === type)?.value || 0)
      return new Date(Date.UTC(part('year'), part('month') - 1, part('day') + days, 1, 0, 0)).toISOString()
    }
    for (const [id, days] of [['future-v616', 2], ['today-v616', 0]]) {
      const card = document.createElement('div')
      card.dataset.customerAppointmentId = id
      card.dataset.customerAppointmentAt = inTokyo(days)
      card.innerHTML = `<p>${days ? '明後日 10:00' : '本日 10:00'}</p><p>カット / 確認用スタッフ</p>`
      section.appendChild(card)
    }
    document.querySelector('main').appendChild(section)
  })
  const futureCard = page.locator('[data-customer-appointment-id="future-v616"]')
  const todayCard = page.locator('[data-customer-appointment-id="today-v616"]')
  await page.waitForFunction(() => (
    document.querySelector('[data-customer-appointment-id="future-v616"]')?.getAttribute('data-lien-cancel-v616') === '1'
    && document.querySelector('[data-customer-appointment-id="today-v616"]')?.getAttribute('data-lien-cancel-v616') === '1'
  ))
  await futureCard.getByRole('button', { name: '予約をキャンセル', exact: true }).waitFor()
  assert.equal(await todayCard.getByRole('button', { name: '予約をキャンセル', exact: true }).count(), 0)
  assert.equal(await todayCard.getByText('店舗へ電話または', { exact: false }).count(), 1)
  await futureCard.getByRole('button', { name: '予約をキャンセル', exact: true }).click()
  await page.locator('.lien-cancel-v616__dialog').getByRole('button', { name: '予約をキャンセル', exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('[data-customer-appointment-id="future-v616"]'))
  assert.equal(cancellationBody?.appointmentId, 'future-v616')
  assert.deepEqual(unexpected(errors), [], `${name} has unexpected browser errors`)

  results.push({ name, couponSelection: true, amountSummary: true, couponLinked: true, cutoffUi: true, noOverflow: true })
  await context.close()
}

try {
  await verify({ width: 1280, height: 900 }, 'desktop')
  await verify({ width: 390, height: 844 }, 'mobile')
  console.log(JSON.stringify({ release: 'v616', results }, null, 2))
} finally {
  await browser.close()
}
