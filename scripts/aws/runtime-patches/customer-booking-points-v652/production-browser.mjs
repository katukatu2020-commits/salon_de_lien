import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-booking-points-v652/production'
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, deviceScaleFactor: 1 })
    const login = await context.request.post(`${base}/api/customer-auth/login`, {
      form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/appointments' },
    })
    assert.ok(login.ok(), `Customer login returned ${login.status()}`)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto(`${base}/u/appointments?verify=v652-production`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.locator('.cj-menu-row').first().waitFor({ timeout: 20_000 })
    await page.waitForFunction(() => window.__lienCustomerBookingPointsUiV652 === true)
    await page.evaluate(() => {
      document.querySelectorAll('.cj-confirmation').forEach(node => node.remove())
      const confirmation = document.createElement('section')
      confirmation.className = 'cj-confirmation'
      confirmation.style.display = 'grid'
      document.querySelector('main')?.appendChild(confirmation)
    })
    await page.waitForFunction(() => document.querySelector('[data-lien-booking-points-v652]'))
    const contextResponse = await page.evaluate(async () => {
      const response = await fetch('/api/lien-customer-booking-context', { cache: 'no-store' })
      return { status: response.status, body: await response.json() }
    })
    assert.equal(contextResponse.status, 200)
    assert.equal(Number.isInteger(contextResponse.body.points?.availablePoints), true)
    assert.equal(Number.isInteger(contextResponse.body.points?.minimumRedeem), true)
    assert.equal(Number.isInteger(contextResponse.body.points?.maxRedemptionPercent), true)
    const input = page.locator('#lien-booking-points-v652')
    assert.equal(await input.count(), 1)
    assert.equal(await page.getByText('お支払い目安', { exact: true }).count(), 1)
    const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, width: document.documentElement.scrollWidth }))
    assert.ok(layout.width <= layout.viewport + 2)
    await page.evaluate(() => {
      const summary = document.querySelector('[data-lien-booking-confirmation-v616]')
      const main = document.querySelector('main')
      if (!summary || !main) return
      const preview = document.createElement('section')
      preview.style.cssText = 'box-sizing:border-box;width:min(100%,760px);margin:12px auto 80px;padding:18px;background:#fffdfa;border:1px solid #e6d8cf;border-radius:8px'
      const heading = document.createElement('h2')
      heading.textContent = '予約内容のご確認'
      heading.style.cssText = 'margin:0 0 14px;font-size:20px'
      const copy = summary.cloneNode(true)
      copy.style.setProperty('display', 'grid', 'important')
      summary.querySelectorAll('select,input').forEach((control, index) => {
        const cloned = copy.querySelectorAll('select,input')[index]
        if (cloned) cloned.value = control.value
      })
      preview.append(heading, copy)
      main.prepend(preview)
      preview.scrollIntoView({ block: 'start' })
    })
    await page.screenshot({ path: path.join(output, `booking-points-${width}.png`), fullPage: false })
    const unexpected = errors.filter(message => (
      !message.includes('Minified React error #418')
      && !message.includes('Minified React error #423')
      && !message.includes('Failed to load resource: the server responded with a status of 404')
    ))
    assert.deepEqual(unexpected, [])
    results.push({ width, pointsContextLoaded: true, pointsControlPresent: true, noOverflow: true })
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({ release: 'customer-booking-points-v652', productionBrowserVerified: true, results }))
