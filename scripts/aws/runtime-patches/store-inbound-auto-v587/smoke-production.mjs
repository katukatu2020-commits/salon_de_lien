import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const screenshotDir = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'store-inbound-auto-v587')
fs.mkdirSync(screenshotDir, { recursive:true })
const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })

try {
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 } })
  const ready = await context.request.get(`${baseUrl}/api/health/ready`)
  assert.ok(ready.ok())
  assert.equal(ready.headers()['x-lien-store-inbound-auto'], 'v587')
  assert.equal(ready.headers()['x-lien-admin-product-tab-state'], 'v586')
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    headers:{ Origin:baseUrl },
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/settings' },
  })
  assert.ok(login.ok(), `demo login failed: ${login.status()}`)
  const profile = await context.request.get(`${baseUrl}/api/admin/store-profile`)
  assert.ok(profile.ok(), `store profile failed: ${profile.status()}`)
  const address = (await profile.json()).profile?.setup?.inboundAddress
  assert.match(address || '', /^booking-[a-f0-9]{24}@[a-z0-9.-]+$/)

  const page = await context.newPage()
  // Production verification may read settings, but must never issue or change an address.
  await page.route('**/api/lien-tenant-setup/inbound/address', route => route.abort())
  await page.goto(`${baseUrl}/admin/settings#settings-line`, { waitUntil:'domcontentloaded' })
  const card = page.locator('#lien-hotpepper-settings-v492')
  await card.waitFor({ state:'visible', timeout:30_000 })
  await page.waitForFunction(expected => document.querySelector('#lien-hotpepper-settings-v492 code')?.textContent === expected, address)
  assert.equal(await card.locator('[data-hotpepper-issue]').count(), 0)
  assert.equal(await card.locator('[data-hotpepper-copy]').isVisible(), true)
  await card.screenshot({ path:path.join(screenshotDir, 'hotpepper-address-desktop.png') })

  await page.setViewportSize({ width:390, height:844 })
  await card.scrollIntoViewIfNeeded()
  assert.equal(await card.locator('[data-hotpepper-copy]').isVisible(), true)
  const bounds = await card.boundingBox()
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391, 'settings card overflows mobile viewport')
  await card.screenshot({ path:path.join(screenshotDir, 'hotpepper-address-mobile.png') })
  const reloaded = await context.request.get(`${baseUrl}/api/admin/store-profile`)
  assert.ok(reloaded.ok())
  assert.equal((await reloaded.json()).profile?.setup?.inboundAddress, address)
  console.log(JSON.stringify({ release:'store-inbound-auto-v587', issuedAddressVisible:true, manualIssuanceNotRequired:true, desktop:true, mobile:true, addressStable:true }))
} finally {
  await browser.close()
}
