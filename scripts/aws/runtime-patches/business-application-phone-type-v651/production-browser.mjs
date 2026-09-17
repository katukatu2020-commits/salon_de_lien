import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/business-application-phone-type-v651/production'
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    for (const [route, expected] of [['/business', ''], ['/business/salon', 'salon'], ['/business/dealer', 'dealer']]) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      const form = page.locator('.business-inquiry-form')
      await form.waitFor({ state: 'visible' })
      const type = form.locator('select[name="audience"]')
      const phone = form.locator('input[name="phone"]')
      assert.equal(await type.isVisible(), true)
      assert.equal(await type.inputValue(), expected)
      assert.equal(await type.getAttribute('required'), '')
      assert.deepEqual(await type.locator('option').evaluateAll(options => options.map(option => option.value)), ['', 'salon', 'dealer'])
      assert.equal(await phone.getAttribute('required'), '')
      assert.equal(await form.locator('input[type="hidden"][name="audience"]').count(), 0)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    }
    await page.goto(base + '/business/salon', { waitUntil: 'domcontentloaded', timeout: 30_000 })
    const form = page.locator('.business-inquiry-form')
    await form.locator('[name="organizationName"]').fill('Browser Validation')
    await form.locator('[name="contactName"]').fill('Validation User')
    await form.locator('[name="email"]').fill('validation@example.invalid')
    await form.locator('[name="message"]').fill('電話番号の必須表示を確認するテスト入力です。')
    await form.locator('[name="privacyAccepted"]').check()
    assert.equal(await form.evaluate(element => element.checkValidity()), false)
    assert.equal(await form.locator('[name="phone"]').evaluate(element => element.validity.valueMissing), true)
    await page.locator('#contact').screenshot({ path: path.join(output, `application-${width}.png`) })
    assert.deepEqual(errors, [])
    results.push({ width, requiredPhoneValidation: true, visibleApplicationType: true, noOverflow: true })
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({ release: 'business-application-phone-type-v651', productionBrowserVerified: true, results }))
