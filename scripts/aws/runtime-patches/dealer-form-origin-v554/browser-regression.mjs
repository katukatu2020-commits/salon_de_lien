import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3125').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v554')
fs.mkdirSync(screenshotRoot, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
    const page = await context.newPage()
    await page.goto(`${baseUrl}/dealer/register?verify=v554`, { waitUntil: 'networkidle', timeout: 35_000 })
    await page.getByRole('heading', { name: 'ディーラー新規設定' }).waitFor()
    await page.getByRole('button', { name: /確認メールを送る/ }).waitFor()
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    assert.ok(dimensions.width <= dimensions.client + 1, `${viewport.name} registration overflows horizontally`)
    await page.screenshot({ path: path.join(screenshotRoot, `dealer-register-${viewport.name}.png`), fullPage: true })
    await context.close()
  }
} finally {
  await browser.close()
}

console.log(JSON.stringify({ release: 'dealer-form-origin-v554', browserVerified: true, screenshots: screenshotRoot }))
