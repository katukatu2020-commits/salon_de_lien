import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const interceptWorkspace = process.env.INTERCEPT_WORKSPACE === '1'
const requireReleaseHeader = process.env.REQUIRE_RELEASE_HEADER === '1'
const screenshotDir = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'admin-product-tab-state-v586')
const workspaceSource = fs.readFileSync(path.join(patchRoot, 'admin-workspace-layout-v572.js'), 'utf8')
fs.mkdirSync(screenshotDir, { recursive:true })

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    headers:{ Origin:baseUrl },
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' },
  })
  assert.ok(response.ok(), `admin login failed with ${response.status()}`)
}

async function verifyReleaseHeader(context) {
  if (!requireReleaseHeader) return
  const response = await context.request.get(`${baseUrl}/api/health/ready`)
  assert.ok(response.ok(), `readiness failed with ${response.status()}`)
  assert.equal(response.headers()['x-lien-admin-product-tab-state'], 'v586')
}

async function verifyTransition(targetHref, label) {
  const context = await browser.newContext({ viewport:{ width:1440, height:900 } })
  await login(context)
  await verifyReleaseHeader(context)
  const page = await context.newPage()
  const errors = []
  let interceptedAssets = 0
  page.on('pageerror', error => {
    if (!/Minified React error #(329|418|423)/.test(String(error))) errors.push(String(error))
  })
  if (interceptWorkspace) {
    await page.route('**/admin-workspace-layout-v572.js*', async route => {
      interceptedAssets += 1
      await route.fulfill({
        status:200,
        contentType:'application/javascript; charset=utf-8',
        body:workspaceSource,
      })
    })
  }

  await page.goto(`${baseUrl}/admin/products/orders`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const tabNav = page.locator('nav:has(a[href="/admin/products?section=menus"]):has(a[href="/admin/products?section=feedback"])').first()
  await tabNav.waitFor({ state:'visible', timeout:15_000 })
  await page.locator('[data-inventory-orders-page-header-v572]').waitFor({ state:'visible', timeout:15_000 })
  assert.equal(await tabNav.locator('a[href="/admin/products"]').getAttribute('aria-current'), 'page')
  if (interceptWorkspace) assert.ok(interceptedAssets > 0, 'workspace asset was not intercepted')

  await tabNav.locator(`a[href="${targetHref}"]`).click()
  await page.waitForURL(url => `${url.pathname}${url.search}` === targetHref, { timeout:15_000 })
  await page.waitForTimeout(500)

  const state = await tabNav.locator('a[href]').evaluateAll(links => links.map(link => ({
    href:new URL(link.getAttribute('href'), location.origin).pathname + new URL(link.getAttribute('href'), location.origin).search,
    ariaCurrent:link.getAttribute('aria-current'),
    className:link.className,
    backgroundColor:getComputedStyle(link).backgroundColor,
  })))
  const active = state.filter(link => link.ariaCurrent === 'page')
  assert.equal(active.length, 1, `expected one active tab: ${JSON.stringify(state)}`)
  assert.equal(active[0].href, targetHref)
  assert.ok(active[0].className.includes('bg-[color:var(--lien-primary)]'))
  const shelf = state.find(link => link.href === '/admin/products')
  assert.ok(shelf)
  assert.equal(shelf.ariaCurrent, null)
  assert.ok(!shelf.className.includes('bg-[color:var(--lien-primary)]'))
  assert.equal(await page.locator('[data-orimia-admin-workspace-host-v572]').count(), 0)
  assert.deepEqual(errors, [])

  await page.screenshot({ path:path.join(screenshotDir, `${label}.png`), fullPage:true })
  await context.close()
  return state
}

try {
  const menu = await verifyTransition('/admin/products?section=menus', 'menu-selected')
  const summary = await verifyTransition('/admin/products?section=feedback', 'summary-selected')
  console.log(JSON.stringify({
    release:'admin-product-tab-state-v586',
    baseUrl,
    intercepted:interceptWorkspace,
    menuActive:menu.find(link => link.ariaCurrent === 'page')?.href,
    summaryActive:summary.find(link => link.ariaCurrent === 'page')?.href,
    screenshots:screenshotDir,
  }))
} finally {
  await browser.close()
}
