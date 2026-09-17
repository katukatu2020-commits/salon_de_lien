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
const output = process.env.SCREENSHOT_DIR || 'artifacts/dealer-password-common-layout-v653/browser'
fs.mkdirSync(output, { recursive: true })

const dealer = { id: 'dealer-layout-v653', name: 'スーパーヤマモト', loginId: 'dealer-layout-demo' }
const stylesheet = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-v543.css'))
let stylesheetRequests = 0
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
    if (url.pathname === '/wholesale-ordering-v543.css') {
      stylesheetRequests += 1
      res.setHeader('Content-Type', 'text/css; charset=utf-8')
      res.end(stylesheet)
      return
    }
    if (url.pathname.startsWith('/brand/')) {
      res.statusCode = 204
      res.end()
      return
    }
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
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    const response = await page.goto(base + '/dealer/password-change?verify=v653', { waitUntil: 'networkidle' })
    assert.equal(response.status(), 200)
    assert.equal(await page.locator('body[data-dealer-view="password"]').count(), 1)
    assert.equal(await page.locator('.wo-dealer-sidebar').count(), 1)
    assert.equal(await page.locator('.wo-dealer-topbar').count(), 1)
    assert.equal(await page.locator('.wo-page-head h1').innerText(), 'パスワード変更')
    assert.equal(await page.locator('.wo-workspace.wo-password-workspace-v653').count(), 1)
    assert.equal(await page.locator('nav a.active[href="/dealer/password-change"]').count(), 2)
    assert.equal(await page.locator('.wo-password-summary-v653 dd').first().innerText(), dealer.loginId)
    assert.equal(await page.locator('form[action="/api/dealer/managed-password-change"]').count(), 1)
    assert.equal(await page.locator('input[type=password]').count(), 3)
    assert.equal(await page.locator('[data-password-toggle-v653]').count(), 3)

    const current = page.locator('input[name=currentPassword]')
    await current.fill('ExistingDealer!2026')
    await current.locator('xpath=..').locator('[data-password-toggle-v653]').click()
    assert.equal(await current.getAttribute('type'), 'text')
    assert.equal(await current.inputValue(), 'ExistingDealer!2026')
    assert.equal(await current.locator('xpath=..').locator('[data-password-toggle-v653]').getAttribute('aria-pressed'), 'true')

    const layout = await page.evaluate(() => {
      const sidebar = document.querySelector('.wo-dealer-sidebar')
      const mobile = document.querySelector('.wo-dealer-mobile-nav')
      const workspace = document.querySelector('.wo-password-workspace-v653')
      const control = document.querySelector('.wo-password-control-v653')
      const input = control.querySelector('input')
      const button = control.querySelector('button')
      const inputBox = input.getBoundingClientRect()
      const buttonBox = button.getBoundingClientRect()
      return {
        viewport: document.documentElement.clientWidth,
        width: document.documentElement.scrollWidth,
        sidebarDisplay: getComputedStyle(sidebar).display,
        mobileDisplay: getComputedStyle(mobile).display,
        workspaceRadius: getComputedStyle(workspace).borderRadius,
        commonStylesheet: [...document.styleSheets].some(sheet => String(sheet.href || '').includes('/wholesale-ordering-v543.css')),
        toggleInsideInput: buttonBox.right <= inputBox.right + 1 && buttonBox.left >= inputBox.left,
      }
    })
    assert.ok(layout.width <= layout.viewport + 2, `Page overflows at ${viewport.width}px`)
    assert.equal(layout.workspaceRadius, '8px')
    assert.equal(layout.commonStylesheet, true)
    assert.equal(layout.toggleInsideInput, true)
    if (viewport.width <= 900) {
      assert.equal(layout.sidebarDisplay, 'none')
      assert.equal(layout.mobileDisplay, 'grid')
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(50)
      const actionLayout = await page.evaluate(() => {
        const button = document.querySelector('.wo-password-actions-v653 .wo-button').getBoundingClientRect()
        const navigation = document.querySelector('.wo-dealer-mobile-nav').getBoundingClientRect()
        return { buttonBottom: button.bottom, navigationTop: navigation.top }
      })
      assert.ok(actionLayout.buttonBottom <= actionLayout.navigationTop - 4, 'Submit button is covered by the mobile navigation')
      await page.screenshot({ path: path.join(output, `dealer-password-${viewport.width}-actions.png`), fullPage: false })
    } else {
      assert.equal(layout.sidebarDisplay, 'flex')
      assert.equal(layout.mobileDisplay, 'none')
    }
    assert.deepEqual(errors, [])
    await page.evaluate(() => scrollTo(0, 0))
    await page.screenshot({ path: path.join(output, `dealer-password-${viewport.width}.png`), fullPage: viewport.width > 900 })
    results.push({ width: viewport.width, commonShell: true, commonWorkspace: true, passwordToggle: true, noOverflow: true })
    await context.close()
  }
  assert.ok(stylesheetRequests >= 2)
  console.log(JSON.stringify({ release: 'dealer-password-common-layout-v653', results }, null, 2))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
