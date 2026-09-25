import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'coupon-menu-prefill-v665-production')
fs.mkdirSync(screenshotDir, { recursive: true })

const coupon = {
  id: 'coupon-production-v665',
  couponCode: 'PRODUCTION-V665',
  discountRate: 10,
  targetMenus: ['カット'],
  expiresAt: '2099-12-31T14:59:59.000Z',
  appointmentId: null,
  benefitKind: null,
  displayName: null,
  noExpiry: false,
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.route('**/api/lien-customer-booking-context*', route => route.fulfill({
    status: 200,
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({
      previous: null,
      coupon,
      coupons: [coupon],
      points: { availablePoints: 0, minimumRedeem: 1, maxRedemptionPercent: 50, yenPerPoint: 1 },
    }),
  }))
  const login = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/appointments' },
  })
  assert.ok(login.ok(), `Customer login returned ${login.status()}`)

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  const response = await page.goto(`${baseUrl}/u/appointments?coupon=${coupon.id}&verify=v665-production`, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  })
  assert.ok(response?.ok(), `Booking page returned ${response?.status()}`)
  await page.waitForFunction(() => (
    document.documentElement.dataset.lienCouponMenuPrefillV665 === 'complete'
    && document.querySelector('main.cj-main')?.dataset.cjStep === '2'
  ), null, { timeout: 20_000 })

  assert.equal(await page.locator('script#customer-coupon-menu-prefill-v665').count(), 1)
  const selected = await page.locator('select.cx-menu-native-select-v508').evaluate(select => ({
    value: select.value,
    text: select.options[select.selectedIndex]?.textContent || '',
  }))
  assert.match(selected.text, /カット/)
  assert.doesNotMatch(selected.text, /学生|前髪|眉|カラー|パーマ|スパ|トリートメント/)
  assert.equal(await page.locator(`input[data-cj-menu][value="${selected.value}"]`).isChecked(), true)
  assert.equal(await page.locator('.cj-steps [data-cj-step="1"]').getAttribute('data-complete'), 'true')
  assert.equal(await page.locator('.cj-steps [data-cj-step="2"]').getAttribute('aria-current'), 'step')
  assert.equal(await page.evaluate(() => window.__lienSelectedCouponV366?.id), coupon.id)

  await page.locator('[data-cj-prev]').click()
  await page.waitForFunction(() => document.querySelector('main.cj-main')?.dataset.cjStep === '1')
  await page.waitForTimeout(350)
  assert.equal(await page.locator('main.cj-main').getAttribute('data-cj-step'), '1')
  assert.equal(await page.locator('select.cx-menu-native-select-v508').inputValue(), selected.value)
  await page.screenshot({ path: path.join(screenshotDir, 'coupon-prefill-mobile.png'), fullPage: false })

  const unexpected = errors.filter(message => (
    !/Minified React error #(418|423)\b/.test(message)
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))
  assert.deepEqual(unexpected, [])
  await context.close()

  console.log(JSON.stringify({
    release: 'coupon-menu-prefill-v665',
    integrationBrowserVerified: true,
    selectedMenu: selected.text.trim(),
    automaticStaffStep: true,
    backStable: true,
    screenshotDir,
  }))
} finally {
  await browser.close()
}
