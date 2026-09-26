import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/orimia-store-directory-v670/production'
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
fs.mkdirSync(output, { recursive: true })

function unexpected(errors) {
  return errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))
}

const browser = await chromium.launch({ executablePath, headless: true })
const results = []
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, deviceScaleFactor: 1 })
    const login = await context.request.post(`${base}/api/customer-auth/login`, {
      headers: { Origin: base },
      form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/stores' },
    })
    assert.ok(login.ok(), `Customer login returned ${login.status()}`)

    const directoryApi = await context.request.get(`${base}/api/lien-customer-stores`, { headers: { Accept: 'application/json' } })
    assert.equal(directoryApi.status(), 200)
    const payload = await directoryApi.json()
    assert.equal(payload.registrationRequired, false)
    assert.ok(Array.isArray(payload.stores) && payload.stores.length > 0)
    assert.ok(Array.isArray(payload.groups) && payload.groups.length > 0)
    assert.ok(payload.stores.every(store => typeof store.prefecture === 'string' && store.prefecture.length > 0))

    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.goto(`${base}/u/stores?verify=v670`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.locator('[data-orimia-store-directory="v670"]').waitFor({ state: 'visible', timeout: 20_000 })
    assert.equal(await page.locator('.orimia-store-card').count(), payload.stores.length)
    assert.equal(await page.locator('.orimia-prefecture-group').count(), payload.groups.length)
    const text = await page.locator('body').innerText()
    assert.equal(text.includes('新しい店舗を登録'), false)
    assert.equal(text.includes('登録を解除'), false)
    assert.equal(text.includes('QRを読み取る'), false)
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    assert.deepEqual(unexpected(errors), [])
    await page.screenshot({ path: path.join(output, `directory-${width}.png`), fullPage: true })
    results.push({ width, stores: payload.stores.length, prefectureGroups: payload.groups.length, noRegistrationControls: true, noOverflow: true })
    await context.close()
  }

  const adminContext = await browser.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 1 })
  const adminLogin = await adminContext.request.post(`${base}/api/auth/login`, {
    headers: { Origin: base },
    form: { email: process.env.VERIFY_ADMIN_ID || 'demo.owner', password: process.env.VERIFY_ADMIN_PASSWORD || 'LienDemo2026!', next: '/admin/settings' },
  })
  assert.ok(adminLogin.ok(), `Admin login returned ${adminLogin.status()}`)
  const switched = await adminContext.request.post(`${base}/api/admin/shared-account-switch`, { headers: { Origin: base, Accept: 'application/json' } })
  assert.equal(switched.status(), 200)
  const profileResponse = await adminContext.request.get(`${base}/api/admin/store-profile`, { headers: { Accept: 'application/json' } })
  assert.equal(profileResponse.status(), 200)
  const profile = (await profileResponse.json()).profile
  assert.equal(typeof profile.orimiaPublished, 'boolean')

  const settings = await adminContext.newPage()
  const settingsErrors = []
  settings.on('pageerror', error => settingsErrors.push(error.message))
  settings.on('console', message => { if (message.type() === 'error') settingsErrors.push(message.text()) })
  await settings.goto(`${base}/admin/settings?verify=v670`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const publication = settings.locator('#orimia-publication-v670')
  await publication.waitFor({ state: 'visible', timeout: 20_000 })
  assert.equal(await publication.getByRole('switch').getAttribute('aria-checked'), String(profile.orimiaPublished))
  assert.equal(await settings.locator('.lien-store-qr-card,[data-sm-store-code]').count(), 0)
  assert.ok(await settings.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
  assert.deepEqual(unexpected(settingsErrors), [])
  await settings.screenshot({ path: path.join(output, 'settings-publication-390.png'), fullPage: true })
  await adminContext.close()

  console.log(JSON.stringify({ release: 'orimia-store-directory-v670', productionBrowserVerified: true, results, publicationSettingVerified: true }))
} finally {
  await browser.close()
}
