import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3185').replace(/\/$/, '')
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'shift-customer-search-v662-integration')
fs.mkdirSync(screenshotDir, { recursive: true })

function tokyoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: {
      email: process.env.VERIFY_ADMIN_ID || 'demo.owner',
      password: process.env.VERIFY_ADMIN_PASSWORD || 'LienDemo2026!',
      next: '/admin/appointments',
    },
  })
  assert.equal(login.ok(), true, `admin login returned ${login.status()}`)

  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const response = await page.goto(`${baseUrl}/admin/appointments?date=${tokyoToday()}&integration=v662`, {
    waitUntil: 'domcontentloaded', timeout: 45_000,
  })
  assert.equal(response?.ok(), true, `appointments page returned ${response?.status()}`)
  await page.waitForFunction(() => window.__orimiaShiftCustomerSearchV662 === true, null, { timeout: 20_000 })

  const launcher = page.locator('[data-ts-manual-appointment-launcher]').first()
  await launcher.waitFor({ state: 'attached', timeout: 20_000 })
  await launcher.evaluate(element => element.click())
  const dialog = page.locator('[aria-labelledby="manual-appointment-title"]')
  await dialog.waitFor({ state: 'visible', timeout: 12_000 })

  const input = dialog.locator('[data-orimia-customer-search-v662] input[role="combobox"]')
  const select = dialog.locator('select[name="customerId"]')
  await input.waitFor({ state: 'visible', timeout: 8_000 })
  assert.equal(await dialog.locator('[data-orimia-customer-native-v662]').isVisible(), false)

  const target = await select.locator('option[value]:not([value=""])').evaluateAll(options => {
    const rows = options.map(option => {
      const label = String(option.textContent || '').replace(/\s+/g, ' ').trim()
      const name = label.replace(/\s*[\uff08(][^\uff09)]+[\uff09)]\s*$/, '').trim()
      return { id: option.value, label, name, compact: Array.from(name.replace(/\s+/g, '')) }
    })
    return rows.find(row => row.compact.length >= 4) || rows.find(row => row.compact.length >= 2) || rows[0] || null
  })
  assert.ok(target?.id && target?.name, 'no customer option was available for integration verification')
  const queryCharacters = target.compact.length >= 4 ? target.compact.slice(0, -1) : target.compact
  const query = queryCharacters.join('')
  assert.ok(query.length >= 2, `customer query was too short: ${JSON.stringify(target)}`)

  await input.fill(query)
  const customerSelectorValue = JSON.stringify(String(target.id))
  const expectedResult = dialog.locator(`[role="option"][data-customer-id=${customerSelectorValue}]`)
  await expectedResult.waitFor({ state: 'visible', timeout: 8_000 })
  await expectedResult.click()
  assert.equal(await select.inputValue(), target.id)
  assert.match(await input.inputValue(), new RegExp(queryCharacters.map(character => character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s*')))
  assert.equal(await input.evaluate(element => element.checkValidity()), true)

  await page.setViewportSize({ width: 390, height: 844 })
  await input.click()
  const mobileOverflow = await dialog.evaluate(element => element.scrollWidth - element.clientWidth)
  assert.ok(mobileOverflow <= 1, `mobile dialog overflows by ${mobileOverflow}px`)
  await page.screenshot({ path: path.join(screenshotDir, 'shift-customer-search-integration-mobile.png'), fullPage: false })

  const close = dialog.locator('button[aria-label="\u9589\u3058\u308b"]').first()
  if (await close.count()) {
    await close.click()
    await dialog.waitFor({ state: 'hidden' })
    await launcher.evaluate(element => element.click())
    await dialog.waitFor({ state: 'visible' })
    await dialog.locator('[data-orimia-customer-search-v662]').waitFor({ state: 'visible' })
    assert.equal(await dialog.locator('[data-orimia-customer-search-v662]').count(), 1)
    await dialog.locator('button[aria-label="\u9589\u3058\u308b"]').first().click()
  }
  const unexpectedPageErrors = pageErrors.filter(message => !/Minified React error #(418|423)\b/.test(message))
  assert.deepEqual(unexpectedPageErrors, [])
  await context.close()

  console.log(JSON.stringify({
    release: 'shift-customer-search-v662',
    integrationBrowserVerified: true,
    partialQuery: query,
    selectedCustomerId: target.id,
    dialogReopenVerified: true,
    screenshotDir,
  }))
} finally {
  await browser.close()
}
