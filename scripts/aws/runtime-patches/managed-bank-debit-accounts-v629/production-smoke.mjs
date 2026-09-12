import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/managed-bank-debit-accounts-v629/production'
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
fs.mkdirSync(output, { recursive: true })

async function html(pathname) {
  const response = await fetch(base + pathname, { redirect: 'manual' })
  assert.equal(response.status, 200, pathname + ' returned ' + response.status)
  return response.text()
}

async function redirects(pathname, expected) {
  const response = await fetch(base + pathname, { redirect: 'manual' })
  assert.ok([301, 302, 303, 307, 308].includes(response.status), pathname + ' did not redirect')
  const location = response.headers.get('location') || ''
  assert.match(location, expected, pathname + ' redirected to ' + location)
}

async function jsonResponse(pathname, options, expectedStatus) {
  const response = await fetch(base + pathname, { redirect: 'manual', ...options })
  assert.equal(response.status, expectedStatus, pathname + ' returned ' + response.status)
  return { response, body: await response.json() }
}

const ready = await fetch(base + '/api/health/ready', { redirect: 'manual' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-managed-bank-accounts'), 'v629')
assert.equal(ready.headers.get('x-lien-list-pagination'), 'v628')

const salonLogin = await html('/admin/login?verify=v629')
assert.match(salonLogin, /運営発行ID/)
assert.match(salonLogin, /美容室アカウントは、契約確認後にORIMIA運営が発行します/)
assert.doesNotMatch(salonLogin, /新規店舗登録はこちら|href="\/admin\/register"/)

const dealerLogin = await html('/dealer/login?verify=v629')
assert.match(dealerLogin, /運営発行ID/)
assert.match(dealerLogin, /銀行口座振替/)
assert.doesNotMatch(dealerLogin, /ログインIDまたはメールアドレス|href="\/dealer\/register"/)

const salonBusiness = await html('/business/salon?verify=v629')
assert.match(salonBusiness, /運営発行ID/)
assert.match(salonBusiness, /銀行口座振替/)
assert.doesNotMatch(salonBusiness, /href="\/admin\/register"|Stripeでクレジットカード決済/)

const dealerBusiness = await html('/business/dealer?verify=v629')
assert.match(dealerBusiness, /運営発行ID/)
assert.match(dealerBusiness, /銀行口座振替/)
assert.doesNotMatch(dealerBusiness, /href="\/dealer\/register"|Stripeでクレジットカード決済/)

await redirects('/admin/register', /\/admin\/login\?managed=1/)
await redirects('/admin/owner-analytics?section=billing', /\/admin\/owner-analytics$/)
await redirects('/dealer/register', /\/dealer\/login\?managed=1/)
await redirects('/dealer/register/legacy-token', /\/dealer\/login\?managed=1/)
await redirects('/dealer/setup?token=legacy-token', /\/dealer\/login\?managed=1/)
await redirects('/dealer/billing', /\/dealer\/orders$/)
await redirects('/platform/accounts', /\/platform\/login$/)

const webhook = await jsonResponse('/api/stripe/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}',
}, 200)
assert.equal(webhook.body.ignored, true)
assert.equal(webhook.body.paymentMethod, 'bank_debit')

const salonRegistration = await fetch(base + '/admin/register', {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'email=blocked%40example.jp',
})
assert.equal(salonRegistration.status, 303)
assert.match(salonRegistration.headers.get('location') || '', /\/admin\/login\?managed=1/)

const dealerRegistration = await jsonResponse('/api/dealer/auth/register/request', {
  method: 'POST',
  headers: { Origin: base, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'blocked@example.jp' }),
}, 410)
assert.match(dealerRegistration.body.error, /ORIMIA運営が発行/)

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

function watch(page, label) {
  const errors = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource: the server responded with a status of 404')) errors.push('console: ' + message.text())
  })
  return () => assert.deepEqual(errors, [], label + ': unexpected browser errors')
}

async function verifyLogin(pathname, label, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const assertNoErrors = watch(page, label + '-' + width)
  await page.goto(base + pathname, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.getByText('運営発行ID', { exact: true }).waitFor({ state: 'visible', timeout: 20_000 })
  const body = await page.locator('body').innerText()
  assert.doesNotMatch(body, /新規店舗登録はこちら|新規アカウントを設定/)
  const layout = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, width: document.documentElement.scrollWidth }))
  assert.ok(layout.width <= layout.viewport + 2, label + ': horizontal overflow')
  assertNoErrors()
  await page.screenshot({ path: path.join(output, label + '-' + width + '.png'), fullPage: true })
  results.push({ label, width, layout })
  await context.close()
}

try {
  await verifyLogin('/admin/login?verify=v629-browser', 'salon-login', 390)
  await verifyLogin('/dealer/login?verify=v629-browser', 'dealer-login', 390)
  await verifyLogin('/admin/login?verify=v629-browser-desktop', 'salon-login', 1440)
  await verifyLogin('/dealer/login?verify=v629-browser-desktop', 'dealer-login', 1440)
  console.log(JSON.stringify({ release: 'managed-bank-debit-accounts-v629', productionVerified: true, results }, null, 2))
} finally {
  await browser.close()
}
