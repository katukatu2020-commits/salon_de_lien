import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3136').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-home-menu-order-v530')
const expected = [
  ['予約する', '/u/appointments'],
  ['ヘアスタイル', '/u/community'],
  ['私に合うアイテム', '/u/catalog'],
  ['クーポン', '/u/coupons'],
  ['マイページ', '/u/profile'],
  ['スタンプカード', '/u/stamps'],
  ['キャンペーン', '/u/campaigns'],
  ['お客様の声', '/u/reviews'],
  ['登録済みの店舗', '/u/stores'],
]

fs.mkdirSync(screenshotDir, { recursive: true })
const browser = await chromium.launch({ executablePath, headless: true })

try {
  for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const login = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
      form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' },
    })
    assert.equal(login.ok(), true, `${viewport.name} login failed with ${login.status()}`)
    const page = await context.newPage()
    const response = await page.goto(`${baseUrl}/u/home`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
    assert.equal(response?.ok(), true, `home returned ${response?.status()}`)
    await page.locator('.quick-grid .quick-card').first().waitFor({ timeout: 12_000 })
    if (viewport.name === 'desktop') await page.locator('#orimia-customer-desktop-nav-v529').waitFor({ timeout: 12_000 })
    await page.waitForTimeout(700)

    const cards = await page.locator('.quick-grid .quick-card').evaluateAll(nodes => nodes.map(node => ({
      label: node.querySelector('strong')?.textContent?.trim() || '',
      href: new URL(node.href).pathname,
    })))
    assert.deepEqual(cards, expected.map(([label, href]) => ({ label, href })))

    const shellState = await page.evaluate(() => ({
      desktopShell: document.querySelectorAll('#orimia-customer-desktop-nav-v529').length,
      desktopStyle: document.querySelectorAll('#orimia-customer-desktop-style-v529').length,
      overflow: document.documentElement.scrollWidth - innerWidth,
    }))
    assert.equal(shellState.desktopShell, viewport.name === 'desktop' ? 1 : 0)
    assert.equal(shellState.desktopStyle, viewport.name === 'desktop' ? 1 : 0)
    assert.ok(shellState.overflow <= 0, `${viewport.name} overflows by ${shellState.overflow}px`)

    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-home.png`), fullPage: true })
    await context.close()
  }

  console.log(JSON.stringify({ release: 'customer-home-menu-order-v530', browserVerified: true, shortcuts: expected.length, screenshotDir }))
} finally {
  await browser.close()
}
