import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3134').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-home-branding-v528-integration')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const customer = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const customerLogin = await customer.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' },
  })
  assert.equal(customerLogin.ok(), true, `customer login failed with ${customerLogin.status()}`)
  const initialResponse = await customer.request.get(`${baseUrl}/u/home?integration=v528`)
  assert.equal(initialResponse.ok(), true)
  const initialHtml = await initialResponse.text()
  assert.match(initialHtml, /data-customer-home-branding="v528"/)
  assert.equal((initialHtml.match(/class="quick-card"/g) || []).length, 9)
  assert.match(initialHtml, /quick-service-icon/)

  const customerPage = await customer.newPage()
  await customerPage.goto(`${baseUrl}/u/home?integration-browser=v528`, { waitUntil: 'networkidle' })
  await customerPage.locator('[data-customer-home-branding="v528"]').waitFor()
  assert.equal(await customerPage.locator('.quick-card').count(), 9)
  const customerState = await customerPage.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    imageReady: document.querySelector('[data-customer-home-branding] img')?.naturalWidth > 0,
    phrase: document.querySelector('[data-customer-home-branding] .hero-copy')?.innerText || '',
    iconCount: document.querySelectorAll('.quick-icon .quick-service-icon').length,
  }))
  assert.ok(customerState.overflow <= 0)
  assert.equal(customerState.imageReady, true)
  assert.ok(customerState.phrase.trim().length > 0)
  assert.equal(customerState.iconCount, 9)
  await customerPage.screenshot({ path: path.join(screenshotDir, 'actual-customer-home-mobile.png'), fullPage: true })
  await customer.close()

  const admin = await browser.newContext({ viewport: { width: 1365, height: 900 }, deviceScaleFactor: 1 })
  const adminLogin = await admin.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/settings' },
  })
  assert.equal(adminLogin.ok(), true, `admin login failed with ${adminLogin.status()}`)
  const adminBrandingResponse = await admin.request.get(`${baseUrl}/api/lien-customer-home-branding?audience=staff`)
  const adminBrandingBody = await adminBrandingResponse.text()
  assert.equal(
    adminBrandingResponse.ok(),
    true,
    `admin branding request failed with ${adminBrandingResponse.status()}: ${adminBrandingBody}`,
  )
  const adminPage = await admin.newPage()
  const adminPageErrors = []
  adminPage.on('pageerror', (error) => adminPageErrors.push(error.message))
  await adminPage.goto(`${baseUrl}/admin/settings`, { waitUntil: 'domcontentloaded' })
  try {
    await adminPage.locator('[data-ohb-panel="customer-home-branding-v528"]').waitFor({ timeout: 12_000 })
  } catch (error) {
    const diagnostics = await adminPage.evaluate(() => ({
      pathname: location.pathname,
      scripts: [...document.scripts].map((script) => script.src || '[inline]'),
      brandingClientStarted: Boolean(window.__orimiaCustomerHomeBrandingV528),
      storeProfileExists: Boolean(document.querySelector('#store-profile')),
      storeSettingsExists: Boolean(document.querySelector('[data-ca-store-settings]')),
      settingsPanel: document.querySelector('#store-profile')?.dataset.settingsPanel || '',
    }))
    console.error(JSON.stringify({ diagnostics, adminPageErrors }, null, 2))
    throw error
  }
  try {
    await adminPage.waitForFunction(() => document.querySelector('[data-ohb-panel]')?.getAttribute('aria-busy') === 'false')
  } catch (error) {
    const diagnostics = await adminPage.evaluate(() => ({
      busy: document.querySelector('[data-ohb-panel]')?.getAttribute('aria-busy') || '',
      error: document.querySelector('[data-ohb-error]')?.textContent || '',
      phrase: document.querySelector('[data-ohb-phrase]')?.value || '',
      previewSource: document.querySelector('[data-ohb-preview-image]')?.getAttribute('src') || '',
    }))
    console.error(JSON.stringify({ diagnostics, adminPageErrors }, null, 2))
    throw error
  }
  const adminState = await adminPage.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    panels: document.querySelectorAll('[data-ohb-panel]').length,
    phrase: document.querySelector('[data-ohb-phrase]')?.value || '',
    imageReady: document.querySelector('[data-ohb-preview-image]')?.naturalWidth > 0,
    inStorePanel: Boolean(document.querySelector('#store-profile > [data-ohb-panel]')),
  }))
  assert.ok(adminState.overflow <= 0)
  assert.equal(adminState.panels, 1)
  assert.ok(adminState.phrase.length > 0)
  assert.equal(adminState.imageReady, true)
  assert.equal(adminState.inStorePanel, true)
  await adminPage.screenshot({ path: path.join(screenshotDir, 'actual-settings-desktop.png'), fullPage: true })

  await adminPage.setViewportSize({ width: 390, height: 844 })
  await adminPage.reload({ waitUntil: 'domcontentloaded' })
  await adminPage.locator('[data-ohb-panel="customer-home-branding-v528"]').waitFor({ timeout: 12_000 })
  const mobileOverflow = await adminPage.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  assert.ok(mobileOverflow <= 0)
  await adminPage.screenshot({ path: path.join(screenshotDir, 'actual-settings-mobile.png'), fullPage: true })
  await admin.close()

  console.log(JSON.stringify({ release: 'customer-home-branding-v528', integrationVerified: true, screenshotDir }))
} finally {
  await browser.close()
}
