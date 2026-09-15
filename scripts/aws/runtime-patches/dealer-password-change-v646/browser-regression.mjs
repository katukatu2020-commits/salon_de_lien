import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const requireRuntime = createRequire(path.join(runtimeRoot, 'business-account-approvals-v643.js'))
const { createBusinessAccountApprovalService } = requireRuntime('./business-account-approvals-v643.js')
const crypto = requireRuntime('node:crypto')
const requirePlaywright = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = requirePlaywright('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const output = process.env.SCREENSHOT_DIR || 'artifacts/dealer-password-change-v646/browser'
fs.mkdirSync(output, { recursive: true })

const dealer = { id: 'dealer-existing-v646', name: '既存ディーラー', loginId: 'existing-dealer' }
const prisma = {
  async $executeRawUnsafe() { return 1 },
  async $queryRawUnsafe(query) {
    const sql = String(query)
    if (sql.includes('FROM "ManagedBusinessAccess"') && sql.includes('"principalId"=$2')) return []
    if (sql.includes('SELECT "id","name","loginId" FROM "WholesaleDealer"')) return [dealer]
    if (sql.includes('FROM "BusinessAccountControl"')) return []
    return []
  },
}

const service = createBusinessAccountApprovalService({
  prisma,
  crypto,
  operatorSession: () => null,
  adminSessionProvider: async () => null,
  dealerSessionProvider: async () => dealer,
  renderPlatformPage: (_title, body) => '<html><body>' + body + '</body></html>',
  baseDashboardProvider: async () => ({}),
  renderBaseDashboard: () => '<html><body><main></main></body></html>',
  mailSender: async () => 'unused',
})

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    if (await service.handle(req, res, url)) return
    res.statusCode = 404
    res.end('not found')
  } catch (error) {
    res.statusCode = 500
    res.end(String(error && (error.stack || error)))
  }
})
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const response = await page.goto(base + '/dealer/password-change', { waitUntil: 'networkidle' })
    assert.equal(response.status(), 200)
    assert.equal(await page.locator('h1').innerText(), 'パスワード変更')
    assert.equal(await page.locator('.identity code').innerText(), dealer.loginId)
    assert.equal(await page.locator('form[action="/api/dealer/managed-password-change"]').count(), 1)
    assert.equal(await page.locator('input[type=password]').count(), 3)

    const current = page.locator('input[name=currentPassword]')
    await current.fill('ExistingDealer!2026')
    await current.locator('xpath=..').locator('[data-password-toggle]').click()
    assert.equal(await current.getAttribute('type'), 'text')
    assert.equal(await current.inputValue(), 'ExistingDealer!2026')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await page.screenshot({ path: path.join(output, `password-${viewport.width}.png`), fullPage: true })
    results.push({ width: viewport.width, status: response.status(), formVisible: true, passwordToggle: true, noOverflow: true })
    await context.close()
  }
  console.log(JSON.stringify({ release: 'dealer-password-change-v646', results }, null, 2))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
