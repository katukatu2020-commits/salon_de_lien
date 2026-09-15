import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/stamp-booking-rewards-v644/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const scripts = {
  'customer-journey-v601.js': fs.readFileSync(path.join(root, 'public', 'customer-journey-v601.js'), 'utf8'),
  'customer-booking-confirmation-v616.js': fs.readFileSync(path.join(root, 'public', 'customer-booking-confirmation-v616.js'), 'utf8'),
  'customer-experience-v508.js': fs.readFileSync(path.join(root, 'customer-experience-v508.js'), 'utf8'),
}
const stampCoupon = {
  id: 'stamp-browser-v644',
  couponCode: 'STAMP-BROWSER-V644',
  discountRate: 100,
  targetMenus: [],
  expiresAt: '2099-12-31T14:59:59.000Z',
  appointmentId: null,
  benefitKind: 'STAMP_MENU_FREE',
  displayName: '対象メニュー無料（スタンプ特典）',
  noExpiry: true,
}

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const context = await browser.newContext({ viewport })
    for (const [name, body] of Object.entries(scripts)) {
      await context.route(`**/${name}*`, route => route.fulfill({
        status: 200,
        contentType: 'application/javascript; charset=utf-8',
        body,
      }))
    }
    await context.route('**/api/lien-customer-booking-context*', route => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ previous: null, coupon: stampCoupon, coupons: [stampCoupon] }),
    }))

    const login = await context.request.post(`${base}/api/customer-auth/login`, {
      form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/appointments' },
    })
    assert.ok(login.ok(), `Customer login returned ${login.status()}`)

    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto(`${base}/u/appointments?coupon=${stampCoupon.id}&stampReward=1&verify=v644`, { waitUntil: 'domcontentloaded' })
    await page.locator('.cj-menu-row').first().waitFor({ timeout: 20000 })
    await page.waitForFunction(() => window.__lienCustomerBookingConfirmationV616 === true)

    const menuRows = page.locator('[data-cj-menu]')
    const menuCount = await menuRows.count()
    assert.ok(menuCount > 1, 'Booking menu fixture needs at least two choices')
    const selectedMenu = menuRows.nth(Math.min(menuCount - 1, 8))
    await selectedMenu.scrollIntoViewIfNeeded()
    if (viewport.width < 500 && await page.evaluate(() => window.scrollY < 120)) {
      await page.evaluate(() => window.scrollTo({ top: Math.min(520, document.documentElement.scrollHeight - innerHeight), behavior: 'auto' }))
    }
    await page.evaluate(() => {
      window.__v644ScrollTrace = [{ type: 'before-listeners', top: window.scrollY, at: performance.now() }]
      window.addEventListener('scroll', () => window.__v644ScrollTrace.push({ type: 'scroll', top: window.scrollY, at: performance.now() }))
      document.addEventListener('change', event => {
        if (event.target?.matches?.('input[data-cj-menu]')) window.__v644ScrollTrace.push({ type: 'change', top: window.scrollY, at: performance.now() })
      }, true)
    })
    const scrollBefore = await page.evaluate(() => window.scrollY)
    await selectedMenu.check()
    await page.waitForFunction(() => document.querySelector('input[data-cj-menu]:checked'))
    await page.waitForTimeout(180)
    const scrollAfter = await page.evaluate(() => window.scrollY)
    if (Math.abs(scrollAfter - scrollBefore) > 4) console.log(JSON.stringify(await page.evaluate(() => window.__v644ScrollTrace)))
    assert.ok(Math.abs(scrollAfter - scrollBefore) <= 4, `Menu selection changed scroll position: ${scrollBefore} -> ${scrollAfter}`)

    await page.evaluate(() => {
      if (document.querySelector('.cj-confirmation')) return
      const confirmation = document.createElement('section')
      confirmation.className = 'cj-confirmation'
      document.querySelector('main')?.appendChild(confirmation)
    })
    await page.waitForFunction(() => document.querySelector('[data-lien-booking-confirmation-v616]'))

    const summary = page.locator('[data-lien-booking-confirmation-v616]')
    const couponSelect = page.locator('#lien-booking-coupon-v616')
    await page.waitForFunction(id => document.querySelector('#lien-booking-coupon-v616')?.value === id, stampCoupon.id)
    assert.equal(await couponSelect.inputValue(), stampCoupon.id)
    assert.equal(await couponSelect.locator('option', { hasText: stampCoupon.displayName }).count(), 1)
    assert.equal(await couponSelect.locator('option', { hasText: '2099' }).count(), 0)
    assert.equal(await summary.getByText('スタンプカード特典（メニュー無料）', { exact: true }).count(), 1)
    assert.equal(await summary.getByText('スタンプカード特典が予約と会計に適用されます。', { exact: true }).count(), 1)
    assert.equal(await summary.getByText('0円', { exact: true }).count(), 1)
    assert.equal(await page.evaluate(() => window.__lienSelectedCouponV366?.discountRate), 100)

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      width: document.documentElement.scrollWidth,
    }))
    assert.ok(layout.width <= layout.viewport + 2, 'Booking page has horizontal overflow')
    await page.screenshot({ path: path.join(output, `booking-${viewport.width}.png`), fullPage: false })

    const unexpected = errors.filter(message => (
      !message.includes('Minified React error #418')
      && !message.includes('Minified React error #423')
      && !message.includes('Failed to load resource: the server responded with a status of 404')
    ))
    assert.deepEqual(unexpected, [])
    results.push({
      width: viewport.width,
      stampRewardSelected: true,
      freePriceDisplayed: true,
      scrollBefore,
      scrollAfter,
      noScrollJump: true,
      noOverflow: true,
    })
    await context.close()
  }

  console.log(JSON.stringify({ release: 'stamp-booking-rewards-v644', results }, null, 2))
} finally {
  await browser.close()
}
