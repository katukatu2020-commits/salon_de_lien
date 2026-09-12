import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/business-inquiries-v637/production'
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const readiness = await context.request.get(base + '/api/health/ready')
  assert.equal(readiness.status(), 200)
  assert.equal(readiness.headers()['x-lien-business-inquiries'], 'v637')
  assert.equal(readiness.headers()['x-lien-customer-profile-name-fields'], 'v636')

  const css = await context.request.get(base + '/orimia-public-v637.css')
  assert.equal(css.status(), 200)
  assert.match(await css.text(), /\.business-inquiry-form/)

  const invalid = await context.request.post(base + '/api/public/business-inquiries', {
    headers: { Origin: base },
    maxRedirects: 0,
    form: { audience: 'salon', sourcePath: '/business/salon' },
  })
  assert.equal(invalid.status(), 303)
  assert.equal(invalid.headers().location, '/business/salon?inquiry=invalid#contact')

  const protectedInbox = await context.request.get(base + '/platform/inquiries', { maxRedirects: 0 })
  assert.equal(protectedInbox.status(), 302)
  assert.equal(protectedInbox.headers().location, '/platform/login')

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/business/salon', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const cta = page.getByRole('link', { name: '導入について相談する' }).first()
  assert.equal(await cta.getAttribute('href'), '#contact')
  await cta.click()
  await page.waitForFunction(() => {
    const rect = document.querySelector('#contact')?.getBoundingClientRect()
    return location.hash === '#contact' && rect && rect.top < innerHeight && rect.bottom > 0
  })
  const form = page.locator('.business-inquiry-form')
  assert.equal(await form.count(), 1)
  assert.equal(await form.locator('[name="audience"]').inputValue(), 'salon')
  assert.equal(await page.getByRole('link', { name: 'support@salon-de-lien.com' }).count(), 1)
  const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, documentWidth: document.documentElement.scrollWidth }))
  assert.ok(layout.documentWidth <= layout.viewport + 2)
  await page.locator('#contact').screenshot({ path: path.join(output, 'salon-contact-390.png') })

  await page.goto(base + '/business/salon?inquiry=sent#contact', { waitUntil: 'domcontentloaded' })
  await page.getByText('お問い合わせを受け付けました。担当者からご連絡します。').waitFor()
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ release: 'business-inquiries-v637', productionVerified: true, ctaAnchor: true, publicValidation: true, platformProtected: true, previousReleasePreserved: true }))
} finally {
  await browser.close()
}
