import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3591'
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-store-redirect-v591/browser'
fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] })
try {
  for (const viewport of [{ width: 1365, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    const login = await context.request.post(base + '/api/customer-auth/login', { maxRedirects: 0, headers: { Origin: base }, form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' } })
    assert.equal(login.status(), 303)
    const initial = await (await context.request.get(base + '/api/lien-customer-stores')).json()
    const original = initial.stores.find(store => store.current)
    const target = initial.stores.find(store => store.linked && !store.current)
    assert(original && target, 'demo requires two registered stores')
    const originalCookies = await context.cookies()
    const otherDevice = await browser.newContext()
    await otherDevice.addCookies(originalCookies)
    const page = await context.newPage()
    const ready = async () => {
      await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')
      await page.locator('#orimia-ui-loader-v536').waitFor({ state: 'hidden' })
    }
    const failures = []
    page.on('requestfailed', req => { if (/ERR_TOO_MANY_REDIRECTS/i.test(req.failure()?.errorText || '')) failures.push(req.url()) })
    try {
      for (const store of [target, original]) {
        await page.goto(base + '/u/stores', { waitUntil: 'domcontentloaded' })
        await ready()
        const button = page.locator('[data-switch-store]').filter({ hasNotText: '利用中' })
        await page.locator(`[data-switch-store="${store.organizationId}"]`).waitFor({ state: 'visible' })
        assert(await button.count() >= 1)
        await page.locator(`[data-switch-store="${store.organizationId}"]`).click()
        await page.waitForURL('**/u/home', { waitUntil: 'domcontentloaded', timeout: 20000 })
        await ready()
        assert.equal(new URL(page.url()).pathname, '/u/home')
        const selected = await (await context.request.get(base + '/api/lien-customer-stores')).json()
        assert.equal(selected.stores.find(item => item.current).organizationId, store.organizationId)
        const unchanged = await (await otherDevice.request.get(base + '/api/lien-customer-stores')).json()
        assert.equal(unchanged.stores.find(item => item.current).organizationId, original.organizationId)
        for (const route of ['/u/appointments', '/u/history', '/u/profile']) {
          const response = await page.goto(base + route, { waitUntil: 'domcontentloaded' })
          assert.equal(response.status(), 200, route)
          assert.equal(new URL(page.url()).pathname, route)
          await ready()
        }
        await page.goto(base + '/u/stores', { waitUntil: 'domcontentloaded' })
        await ready()
        await page.screenshot({ path: path.join(output, `${viewport.width}-${store === target ? 'switched' : 'restored'}.png`), fullPage: true, animations: 'disabled' })
        await page.reload({ waitUntil: 'domcontentloaded' })
        await ready()
        assert.equal(new URL(page.url()).pathname, '/u/stores')
      }
      assert.deepEqual(failures, [])
      console.log(JSON.stringify({ viewport, switchedAndRestored: true, otherDeviceUnchanged: true, nextPages: true, reload: true }))
    } finally { await otherDevice.close(); await context.close() }
  }
} finally { await browser.close() }
