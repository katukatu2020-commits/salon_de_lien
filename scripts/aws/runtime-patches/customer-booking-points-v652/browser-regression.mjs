import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-booking-points-v652/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const pointsClient = fs.readFileSync(path.join(root, 'public', 'customer-booking-points-v652.js'), 'utf8')
const confirmationClient = fs.readFileSync(path.join(root, 'public', 'customer-booking-confirmation-v616.js'), 'utf8')
const workflows = fs.readFileSync(path.join(root, 'ui-workflows-v294.js'), 'utf8')
const coupon = {
  id: 'coupon-browser-v652',
  couponCode: 'BROWSER20',
  discountRate: 20,
  targetMenus: [],
  expiresAt: '2099-12-31T14:59:59.000Z',
  appointmentId: null,
  benefitKind: null,
  displayName: null,
  noExpiry: false,
}
const contextPayload = {
  previous: null,
  coupon,
  coupons: [coupon],
  points: { availablePoints: 3000, minimumRedeem: 1, maxRedemptionPercent: 50, yenPerPoint: 1 },
}

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const context = await browser.newContext({ viewport })
    let adjustmentRequest = null
    await context.route('**/ui-workflows-v294.js*', route => route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: workflows,
    }))
    await context.route('**/customer-booking-confirmation-v616.js*', route => route.fulfill({
      status: 200,
      contentType: 'application/javascript; charset=utf-8',
      body: confirmationClient,
    }))
    await context.route('**/api/lien-customer-booking-context*', route => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(contextPayload),
    }))
    await context.route('**/api/customer/appointments', async route => {
      if (route.request().method() !== 'POST') return route.continue()
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ success: true, appointment: { id: 'appointment-browser-v652' } }),
      })
    })
    await context.route('**/api/lien-customer-booking-coupon', async route => {
      adjustmentRequest = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({ success: true, finalPrice: 2640 }),
      })
    })
    await context.route('**/api/lien-admin-appointment-coupon*', route => route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        bookingApplied: true,
        appointmentId: 'appointment-browser-v652',
        couponIssueId: coupon.id,
        couponCode: coupon.couponCode,
        discountRate: 20,
        menuPrice: 6600,
        couponDiscount: 1320,
        pointsUsed: 2680,
        finalPrice: 2600,
        status: 'active',
      }),
    }))

    const login = await context.request.post(`${base}/api/customer-auth/login`, {
      form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/appointments' },
    })
    assert.ok(login.ok(), `Customer login returned ${login.status()}`)

    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto(`${base}/u/appointments?verify=v652`, { waitUntil: 'domcontentloaded' })
    await page.locator('.cj-menu-row').first().waitFor({ timeout: 20000 })
    await page.waitForFunction(() => window.__lienCustomerBookingConfirmationV616 === true)
    await page.evaluate(() => {
      document.querySelectorAll('.cj-confirmation').forEach(node => node.remove())
      const confirmation = document.createElement('section')
      confirmation.className = 'cj-confirmation'
      confirmation.style.display = 'grid'
      document.querySelector('main')?.appendChild(confirmation)
    })
    await page.waitForFunction(() => document.querySelector('[data-lien-booking-confirmation-v616]'))
    await page.addScriptTag({ content: pointsClient })
    await page.waitForFunction(() => document.querySelector('[data-lien-booking-points-v652] input:not([disabled])'))

    const couponSelect = page.locator('#lien-booking-coupon-v616')
    await couponSelect.selectOption(coupon.id, { force: true })
    await page.locator('.lien-booking-v652__max').evaluate(button => button.click())
    await page.waitForTimeout(50)
    const maximum = Number(await page.locator('#lien-booking-points-v652').getAttribute('max'))
    assert.ok(maximum > 0 && maximum <= 3000)
    assert.equal(Number(await page.locator('#lien-booking-points-v652').inputValue()), maximum)
    assert.equal(await page.getByText('利用ポイント', { exact: true }).count() >= 1, true)
    assert.equal(await page.getByText('お支払い目安', { exact: true }).count(), 1)

    const postResult = await page.evaluate(async () => {
      const response = await fetch('/api/customer/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffKey: 'free', menuKey: 'cut', date: '2099-01-01', startMinutes: 600 }),
      })
      return { ok: response.ok, body: await response.json() }
    })
    assert.equal(postResult.ok, true)
    assert.equal(adjustmentRequest.appointmentId, 'appointment-browser-v652')
    assert.equal(adjustmentRequest.couponIssueId, coupon.id)
    assert.equal(adjustmentRequest.pointsToUse, maximum)

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      width: document.documentElement.scrollWidth,
    }))
    assert.ok(layout.width <= layout.viewport + 2, `Booking page overflows at ${viewport.width}px`)
    await page.evaluate(() => {
      document.querySelector('[data-v652-visual-preview]')?.remove()
      const summary = document.querySelector('[data-lien-booking-confirmation-v616]')
      const main = document.querySelector('main')
      if (!summary || !main) return
      const preview = document.createElement('section')
      preview.dataset.v652VisualPreview = '1'
      preview.style.cssText = 'box-sizing:border-box;width:min(100%,760px);margin:12px auto 80px;padding:18px;background:#fffdfa;border:1px solid #e6d8cf;border-radius:8px'
      const heading = document.createElement('h2')
      heading.textContent = '予約内容のご確認'
      heading.style.cssText = 'margin:0 0 14px;font-size:20px'
      const copy = summary.cloneNode(true)
      copy.style.setProperty('display', 'grid', 'important')
      copy.removeAttribute('data-signature')
      summary.querySelectorAll('select,input').forEach((control, index) => {
        const cloned = copy.querySelectorAll('select,input')[index]
        if (cloned) cloned.value = control.value
      })
      preview.append(heading, copy)
      main.prepend(preview)
      preview.scrollIntoView({ block: 'start' })
    })
    await page.waitForTimeout(80)
    await page.screenshot({ path: path.join(output, `booking-${viewport.width}.png`), fullPage: false })

    await page.evaluate(() => {
      history.pushState({}, '', '/admin/appointments/appointment-browser-v652')
      const main = document.querySelector('main') || document.body.appendChild(document.createElement('main'))
      main.replaceChildren()
      const form = document.createElement('form')
      form.innerHTML = '<input type="hidden" name="couponSelection"><div class="rounded-panel">checkout</div>'
      main.appendChild(form)
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    await page.waitForFunction(() => document.querySelector('[data-booking-adjustment-v652]'))
    const banner = await page.locator('[data-booking-adjustment-v652]').textContent()
    assert.match(banner, /利用ポイント　-2,680pt/)
    assert.match(banner, /お支払い目安　2,600円/)

    const unexpected = errors.filter(message => (
      !message.includes('Minified React error #418')
      && !message.includes('Minified React error #423')
      && !message.includes('Failed to load resource: the server responded with a status of 404')
    ))
    assert.deepEqual(unexpected, [])
    results.push({ width: viewport.width, pointsMaximum: maximum, bookingRequestLinked: true, salonBreakdownShown: true, noOverflow: true })
    await context.close()
  }

  console.log(JSON.stringify({ release: 'customer-booking-points-v652', results }, null, 2))
} finally {
  await browser.close()
}
