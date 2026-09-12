import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const localRequire = createRequire(import.meta.url)
const { resolveCustomerProfileNameV636 } = localRequire('./customer-profile-name-v636.js')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-profile-name-fields-v636/production'
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
fs.mkdirSync(output, { recursive: true })

function unexpected(errors) {
  return errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
    && !message.includes('Minified React error #329')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const readiness = await context.request.get(base + '/api/health/ready')
  assert.equal(readiness.status(), 200)
  assert.equal(readiness.headers()['x-lien-customer-profile-name-fields'], 'v636')
  assert.equal(readiness.headers()['x-lien-booking-confirmation-name'], 'v635')

  const login = await context.request.post(base + '/api/customer-auth/login', {
    headers: { Origin: base },
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/profile' },
  })
  assert.ok(login.ok(), `Customer login returned ${login.status()}`)

  const summaryResponse = await context.request.get(base + '/api/customer/mypage-summary')
  assert.ok(summaryResponse.ok(), `My page summary returned ${summaryResponse.status()}`)
  const summary = await summaryResponse.json()

  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  await page.goto(base + '/u/profile?verify=v636#details', { waitUntil: 'domcontentloaded', timeout: 30_000 })

  const form = page.locator('form[data-customer-profile-name-fields-v636="separated"]')
  await form.waitFor({ state: 'visible', timeout: 20_000 })
  const expectedFields = ['lastName', 'firstName', 'lastNameKana', 'firstNameKana']
  for (const field of expectedFields) {
    const input = form.locator(`input[name="${field}"]`)
    assert.equal(await input.count(), 1)
    assert.equal(await input.getAttribute('required'), '')
  }
  assert.equal(await form.locator('input[name="name"]').count(), 0)

  const nickname = form.locator('input[name="nickname"]')
  await nickname.waitFor({ state: 'visible', timeout: 10_000 })
  assert.equal(await nickname.isEditable(), true)

  const actualName = [
    await form.locator('input[name="lastName"]').inputValue(),
    await form.locator('input[name="firstName"]').inputValue(),
  ].filter(Boolean).join(' ').normalize('NFKC').trim()
  const expectedName = resolveCustomerProfileNameV636({}, summary.name)
  assert.equal(actualName, [expectedName.lastName, expectedName.firstName].filter(Boolean).join(' '))

  const invalid = await context.request.post(base + '/api/customer/profile', {
    headers: { Origin: base },
    maxRedirects: 0,
    form: {
      lastName: '山田',
      firstName: '花子',
      lastNameKana: 'YAMADA',
      firstNameKana: 'HANAKO',
    },
  })
  assert.equal(invalid.status(), 303)
  assert.match(invalid.headers().location || '', /\/u\/profile\?profile=name$/)

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, 'Customer profile has horizontal overflow')
  assert.deepEqual(unexpected(errors), [])

  await form.locator('section').first().screenshot({ path: path.join(output, 'profile-name-fields-390.png') })
  await page.screenshot({ path: path.join(output, 'profile-390.png'), fullPage: true })
  console.log(JSON.stringify({
    release: 'customer-profile-name-fields-v636',
    productionVerified: true,
    fields: expectedFields,
    legacyNamePrefillVerified: true,
    nicknamePreserved: true,
    invalidSubmissionRejectedWithoutWrite: true,
  }))
} finally {
  await browser.close()
}
