import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-registration-profile-v533')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const response = await page.goto(`${baseUrl}/u/register`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
    assert.equal(response?.ok(), true, `${viewport.name} registration returned ${response?.status()}`)
    await page.locator('form[action="/api/customer-auth/registration-link/request"] input[name="email"]').waitFor({ state: 'visible', timeout: 12_000 })
    assert.equal(await page.locator('form[action="/api/customer-auth/registration-link/request"] button[type="submit"]').count(), 1)
    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-registration.png`), fullPage: true })
    await context.close()
  }

  console.log(JSON.stringify({ release: 'customer-registration-profile-v533', browserVerified: true, screenshotDir }))
} finally {
  await browser.close()
}
