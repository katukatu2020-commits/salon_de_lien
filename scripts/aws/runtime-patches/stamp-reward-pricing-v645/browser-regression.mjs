import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/stamp-reward-pricing-v645/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const scripts = {
  'customer-booking-confirmation-v616.js': fs.readFileSync(path.join(root, 'public', 'customer-booking-confirmation-v616.js'), 'utf8'),
  'customer-journey-v601.js': fs.readFileSync(path.join(root, 'public', 'customer-journey-v601.js'), 'utf8'),
  'ui-workflows-v294.js': fs.readFileSync(path.join(root, 'ui-workflows-v294.js'), 'utf8'),
}
const stampCoupon = {
  id: 'stamp-browser-v645',
  couponCode: 'STAMP-BROWSER-V645',
  discountRate: 100,
  targetMenus: ['特別な日のヘアセット'],
  expiresAt: '2099-12-31T14:59:59.000Z',
  appointmentId: null,
  benefitKind: 'STAMP_MENU_FREE',
  displayName: '特別な日のヘアセット 無料',
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
    await page.goto(`${base}/u/appointments?coupon=${stampCoupon.id}&stampReward=1&verify=v645`, { waitUntil: 'domcontentloaded' })
    const menuSelect = page.locator('select').filter({ hasText: stampCoupon.targetMenus[0] }).first()
    try {
      await menuSelect.waitFor({ state: 'attached', timeout: 20000 })
    } catch (error) {
      console.error(JSON.stringify({
        url: page.url(),
        title: await page.title(),
        main: (await page.locator('body').innerText()).slice(0, 1200),
        selects: await page.locator('select').evaluateAll(elements => elements.map(element => ({
          className: element.className,
          value: element.value,
          options: element.options.length,
        }))),
        errors,
      }, null, 2))
      throw error
    }
    await page.waitForFunction(target => {
      const select = [...document.querySelectorAll('select')].find(element => [...element.options].some(option => option.textContent.includes(target)))
      return [...(select?.options || [])].some(option => option.selected && option.textContent.includes(target))
    }, stampCoupon.targetMenus[0])

    const targetValue = await menuSelect.locator('option', { hasText: stampCoupon.targetMenus[0] }).getAttribute('value')
    assert.ok(targetValue)
    await page.waitForFunction(value => [...document.querySelectorAll('input[data-cj-menu]')].some(input => input.value === value && input.checked), targetValue)
    const notice = page.locator('[data-lien-stamp-reward-v645]')
    await notice.waitFor()
    assert.equal(await notice.getAttribute('data-applicable'), 'true')
    assert.match(await notice.innerText(), /お支払い目安は0円/)
    assert.equal(await page.locator('.lien-booking-v366__status--coupon').count(), 0)

    const alternate = page.locator('input[data-cj-menu]').nth(8)
    await alternate.scrollIntoViewIfNeeded()
    const scrollBefore = await page.evaluate(() => window.scrollY)
    await alternate.check()
    await page.waitForTimeout(180)
    const scrollAfter = await page.evaluate(() => window.scrollY)
    assert.ok(Math.abs(scrollAfter - scrollBefore) <= 4, `Menu selection changed scroll position: ${scrollBefore} -> ${scrollAfter}`)
    await page.waitForFunction(() => document.querySelector('[data-lien-stamp-reward-v645]')?.dataset.applicable === 'false')
    assert.match(await notice.innerText(), /現在選択中のメニューには適用されません/)
    assert.equal(await page.locator('.lien-booking-v366__status--coupon').count(), 0)

    const targetRadio = page.locator(`input[data-cj-menu][value="${targetValue}"]`)
    await targetRadio.scrollIntoViewIfNeeded()
    await targetRadio.check()
    await page.waitForFunction(value => [...document.querySelectorAll('select')].some(select => select.value === value), targetValue)
    await page.getByRole('button', { name: '担当者を選ぶ', exact: true }).click()
    await page.locator('.cj-staff-list button').first().click()
    await page.getByRole('button', { name: '日時を選ぶ', exact: true }).click()
    await page.waitForFunction(() => [...document.querySelectorAll('.cj-slot-row>button')].some(button => !button.disabled))
    const available = page.locator('.cj-slot-row>button:not([disabled])').first()
    const day = await available.getAttribute('data-cj-day')
    await page.locator(`[data-cj-date="${day}"]`).click()
    await available.click()
    await page.getByRole('button', { name: '予約内容を確認する', exact: true }).click()

    const summary = page.locator('[data-lien-booking-confirmation-v616]')
    await summary.waitFor({ timeout: 10000 })
    await page.waitForFunction(id => document.querySelector('#lien-booking-coupon-v616')?.value === id, stampCoupon.id)

    const amountRows = await page.locator('.lien-booking-v616__amounts > div').evaluateAll(rows => rows.map(row => ({
      label: row.querySelector('dt')?.textContent.trim(),
      amount: row.querySelector('dd')?.textContent.trim(),
    })))
    assert.deepEqual(amountRows, [
      { label: 'メニュー料金', amount: '6,600円' },
      { label: 'スタンプカード特典（メニュー無料）', amount: '-6,600円' },
      { label: 'お支払い目安', amount: '0円' },
    ])
    assert.equal(await page.evaluate(() => window.__lienSelectedCouponV366?.id), stampCoupon.id)
    assert.equal(await page.locator('[data-lien-stamp-reward-v645]').count(), 1)

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
      rewardMenu: stampCoupon.targetMenus[0],
      rewardMenuAutoSelected: true,
      menuPrice: 6600,
      stampDiscount: 6600,
      estimatedPayment: 0,
      incompatibleMenuNotClaimed: true,
      scrollBefore,
      scrollAfter,
    })
    await context.close()
  }

  console.log(JSON.stringify({ release: 'stamp-reward-pricing-v645', results }, null, 2))
} finally {
  await browser.close()
}
