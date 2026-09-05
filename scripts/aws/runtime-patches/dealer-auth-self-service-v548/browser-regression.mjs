import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3120').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v548')
fs.mkdirSync(screenshotRoot, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
    const page = await context.newPage()

    await page.goto(`${baseUrl}/dealer/login?verify=v548`, { waitUntil: 'networkidle', timeout: 35_000 })
    await page.getByRole('heading', { name: 'ディーラーログイン' }).waitFor()
    await page.getByRole('link', { name: 'ID・パスワードを忘れた方' }).waitFor()
    await page.getByRole('link', { name: '新規アカウントを設定' }).waitFor()
    let dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    assert.ok(dimensions.width <= dimensions.client + 1, `${viewport.name} login overflows horizontally`)
    await page.screenshot({ path: path.join(screenshotRoot, `dealer-login-${viewport.name}.png`), fullPage: true })

    await page.getByRole('link', { name: '新規アカウントを設定' }).click()
    await page.waitForURL('**/dealer/register')
    await page.getByRole('heading', { name: 'ディーラー新規設定' }).waitFor()
    await page.getByLabel('登録メールアドレス').waitFor()
    dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    assert.ok(dimensions.width <= dimensions.client + 1, `${viewport.name} registration overflows horizontally`)
    await page.screenshot({ path: path.join(screenshotRoot, `dealer-register-${viewport.name}.png`), fullPage: true })

    await page.goto(`${baseUrl}/dealer/password-reset?verify=v548`, { waitUntil: 'networkidle', timeout: 35_000 })
    await page.getByRole('heading', { name: 'ログイン情報を再設定' }).waitFor()
    await page.getByRole('button', { name: /再設定メールを送る/ }).waitFor()
    dimensions = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }))
    assert.ok(dimensions.width <= dimensions.client + 1, `${viewport.name} reset page overflows horizontally`)
    await page.screenshot({ path: path.join(screenshotRoot, `dealer-password-reset-${viewport.name}.png`), fullPage: true })

    await context.close()
  }
  console.log(JSON.stringify({ release: 'dealer-auth-self-service-v548', browserVerified: true, screenshots: screenshotRoot }))
} finally {
  await browser.close()
}
