import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'billing-display-mask-v531')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/owner-analytics?section=billing' },
    })
    assert.equal(login.ok(), true, `${viewport.name} login failed with ${login.status()}`)
    const page = await context.newPage()
    const response = await page.goto(`${baseUrl}/admin/owner-analytics?section=billing`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
    assert.equal(response?.ok(), true, `billing page returned ${response?.status()}`)
    await page.getByRole('heading', { name: 'システム利用料', exact: true }).waitFor({ timeout: 12_000 })
    await page.waitForTimeout(500)

    const text = await page.locator('main').innerText()
    const masks = text.match(/\*{5}円/g) || []
    assert.ok(masks.length >= 4, `${viewport.name} only showed ${masks.length} masked amounts`)
    assert.doesNotMatch(text, /-?\d[\d,]*円/, `${viewport.name} still contains a numeric yen amount`)
    assert.match(text, /システム利用料/)

    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-billing.png`), fullPage: true })
    console.log(JSON.stringify({ viewport: viewport.name, maskedAmounts: masks.length }))
    await context.close()
  }

  console.log(JSON.stringify({ release: 'billing-display-mask-v531', browserVerified: true, screenshotDir }))
} finally {
  await browser.close()
}
