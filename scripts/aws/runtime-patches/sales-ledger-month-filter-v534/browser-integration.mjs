import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium } from 'playwright-core'

const require = createRequire(import.meta.url)
const { monthValueInTokyo, monthRange, shiftMonth } = require('./sales-ledger-month-filter-v534.js')
const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'sales-ledger-month-filter-v534')
fs.mkdirSync(screenshotDir, { recursive: true })

const currentMonth = monthValueInTokyo()
const previousMonth = shiftMonth(currentMonth, -1)
const previousRange = monthRange(previousMonth)

const browser = await chromium.launch({ executablePath, headless: true })
try {
  for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/owner-analytics?salesLedger=1' },
    })
    assert.equal(login.ok(), true, `${viewport.name} login failed with ${login.status()}`)

    const page = await context.newPage()
    const response = await page.goto(`${baseUrl}/admin/owner-analytics?salesLedger=1`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
    assert.equal(response?.ok(), true, `sales ledger returned ${response?.status()}`)
    const monthInput = page.locator('[data-sl-month]')
    await monthInput.waitFor({ state: 'visible', timeout: 15_000 })
    await page.locator('[data-sl-status]').getByText(/表示しています/).waitFor({ timeout: 15_000 })

    assert.equal(await monthInput.inputValue(), currentMonth)
    assert.deepEqual(await page.locator('[name=from],[name=to]').evaluateAll(nodes => nodes.map(node => node.value)), [monthRange(currentMonth).from, monthRange(currentMonth).to])
    assert.equal(await page.locator('[data-sl-month-shift="1"]').isDisabled(), true)
    assert.equal(await page.locator('[data-sl-current-month]').isDisabled(), true)

    const monthlyResponse = page.waitForResponse(candidate => {
      if (!candidate.url().includes('/api/admin/sales-ledger?')) return false
      const url = new URL(candidate.url())
      return url.searchParams.get('from') === previousRange.from && url.searchParams.get('to') === previousRange.to
    }, { timeout: 15_000 })
    await monthInput.fill(previousMonth)
    await monthInput.dispatchEvent('change')
    assert.equal((await monthlyResponse).status(), 200)
    await page.locator('[data-sl-status]').getByText(new RegExp(`${Number(previousMonth.slice(0, 4))}年${Number(previousMonth.slice(5))}月.*表示しています`)).waitFor({ timeout: 15_000 })
    assert.deepEqual(await page.locator('[name=from],[name=to]').evaluateAll(nodes => nodes.map(node => node.value)), [previousRange.from, previousRange.to])
    assert.equal(await page.locator('[data-sl-month-shift="1"]').isEnabled(), true)
    assert.equal(await page.locator('[data-sl-current-month]').isEnabled(), true)

    const beforePrevious = shiftMonth(previousMonth, -1)
    const beforePreviousRange = monthRange(beforePrevious)
    const previousResponse = page.waitForResponse(candidate => {
      if (!candidate.url().includes('/api/admin/sales-ledger?')) return false
      const url = new URL(candidate.url())
      return url.searchParams.get('from') === beforePreviousRange.from && url.searchParams.get('to') === beforePreviousRange.to
    }, { timeout: 15_000 })
    await page.locator('[data-sl-month-shift="-1"]').click()
    assert.equal((await previousResponse).status(), 200)
    assert.equal(await monthInput.inputValue(), beforePrevious)

    await page.locator('[name=from]').fill('2026-01-15')
    await page.locator('[name=from]').dispatchEvent('change')
    await page.locator('[name=to]').fill('2026-02-10')
    await page.locator('[name=to]').dispatchEvent('change')
    assert.equal(await monthInput.inputValue(), '')
    assert.equal(await page.locator('[data-sl-month-caption]').textContent(), '日付を個別指定中')
    assert.equal(await page.locator('[data-sl-month-shift="-1"]').isDisabled(), true)

    const currentResponse = page.waitForResponse(candidate => {
      if (!candidate.url().includes('/api/admin/sales-ledger?')) return false
      const url = new URL(candidate.url())
      const range = monthRange(currentMonth)
      return url.searchParams.get('from') === range.from && url.searchParams.get('to') === range.to
    }, { timeout: 15_000 })
    await page.locator('[data-sl-current-month]').click()
    assert.equal((await currentResponse).status(), 200)

    await page.locator('.sl-month-filter').scrollIntoViewIfNeeded()
    const layout = await page.locator('.sl-month-filter').evaluate(node => {
      const rect = node.getBoundingClientRect()
      return { left: rect.left, right: rect.right, viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth }
    })
    assert.ok(layout.left >= -1 && layout.right <= layout.viewport + 1, `${viewport.name} month filter overflows viewport`)
    assert.ok(layout.scrollWidth <= layout.viewport + 1, `${viewport.name} document has horizontal overflow`)
    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-sales-ledger-month.png`) })

    console.log(JSON.stringify({ viewport: viewport.name, currentMonth, previousMonth, monthlyFilterVerified: true }))
    await context.close()
  }

  console.log(JSON.stringify({ release: 'sales-ledger-month-filter-v534', browserVerified: true, screenshotDir }))
} finally {
  await browser.close()
}
