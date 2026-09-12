import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const localRequire = createRequire(import.meta.url)
const { displayBookingConfirmationNameV635 } = localRequire('./booking-confirmation-name-v635.js')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/booking-confirmation-name-v635/production'
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const readiness = await context.request.get(base + '/api/health/ready')
  assert.equal(readiness.status(), 200)
  assert.equal(readiness.headers()['x-lien-booking-confirmation-name'], 'v635')
  assert.equal(readiness.headers()['x-lien-style-demo-ordering'], 'v634')

  const login = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments?tab=history' },
  })
  assert.ok(login.ok(), `Staff login returned ${login.status()}`)

  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto(base + '/admin/appointments?tab=history&verify=v635', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  await page.getByRole('heading', { name: '操作履歴', exact: true }).waitFor({ state: 'visible', timeout: 20_000 })

  const names = page.locator('[data-booking-confirmation-name-v635="customer-name-only"]')
  const count = await names.count()
  assert.ok(count > 0, 'No confirmed booking history cards were marked')
  const texts = (await names.allTextContents()).map(value => value.trim()).filter(Boolean)
  assert.ok(texts.length > 0)
  for (const name of texts) assert.equal(displayBookingConfirmationNameV635(name), name)
  const unexpectedPageErrors = pageErrors.filter(
    error => !/^Minified React error #(418|423);/.test(error),
  )
  assert.deepEqual(unexpectedPageErrors, [])

  await names.first().screenshot({ path: path.join(output, 'booking-confirmation-card-390.png') })
  await page.screenshot({ path: path.join(output, 'booking-history-390.png'), fullPage: true })
  console.log(JSON.stringify({
    release: 'booking-confirmation-name-v635',
    productionVerified: true,
    confirmedBookingCards: count,
    furiganaSuffixesVisible: 0,
    knownHydrationWarnings: pageErrors.length - unexpectedPageErrors.length,
  }))
} finally {
  await browser.close()
}
