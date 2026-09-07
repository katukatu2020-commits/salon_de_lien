import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 20; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v572-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200
    && response.headers.get('x-lien-admin-shared-page-format') === 'v572'
    && response.headers.get('x-lien-customer-chart-route-scope') === 'v571'
    && response.headers.get('x-lien-inventory-orders-common-layout') === 'v570'
  ) break
  if (attempt === 20) assert.fail(`production readiness did not reach v572; last status ${response.status}`)
  await sleep(1500)
}

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })
try {
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 } })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' },
  })
  assert.ok(login.ok(), `owner login failed: ${login.status()}`)
  const page = await context.newPage()

  await page.goto(`${baseUrl}/admin/products/orders`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.wo-tabs').waitFor({ state:'visible', timeout:15_000 })
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.admin-main-content')).visibility === 'visible', null, { timeout:15_000 })
  const inventory = await page.evaluate(() => {
    const main = document.querySelector('.admin-main-content')
    const root = main?.querySelector(':scope > .mx-auto.grid.max-w-7xl.gap-6')
    return {
      version:window.__orimiaAdminWorkspaceV572?.version,
      root:root?.dataset.orimiaAdminWorkspaceRootV572,
      mainVisible:getComputedStyle(main).visibility,
      hostInside:Boolean(root?.querySelector(':scope > [data-orimia-admin-workspace-host-v572="inventory-orders"]')),
      navs:root?.querySelectorAll(':scope > nav[aria-label="商品ページ切替"]').length,
      legacy:document.querySelectorAll('.wo-admin-layout,#orimia-inventory-orders-host-v570').length,
    }
  })
  assert.deepEqual(inventory, { version:'v572', root:'inventory-orders', mainVisible:'visible', hostInside:true, navs:1, legacy:0 })

  await page.goto(`${baseUrl}/admin/owner-analytics?salesLedger=1`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.sl-daily-card').waitFor({ state:'visible', timeout:15_000 })
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.admin-main-content')).visibility === 'visible', null, { timeout:15_000 })
  const ledger = await page.evaluate(() => {
    const main = document.querySelector('.admin-main-content')
    const root = main?.querySelector(':scope > .mx-auto.grid.max-w-7xl.gap-6')
    const portal = document.querySelector('[data-sl-ledger-portal]')
    const nav = root?.querySelector(':scope > nav[aria-label="経営ページ切替"]')
    return {
      root:root?.dataset.orimiaAdminWorkspaceRootV572,
      mainVisible:getComputedStyle(main).visibility,
      mainInlineStyle:main?.getAttribute('style'),
      hostInside:Boolean(root?.querySelector(':scope > [data-orimia-admin-workspace-host-v572="sales-ledger"]')),
      directBodyPortal:[...document.body.children].includes(portal),
      active:nav?.querySelector('[aria-current="page"]')?.textContent.trim(),
      navs:document.querySelectorAll('nav[aria-label="経営ページ切替"]').length,
      generatedTabs:document.querySelectorAll('.sl-tabs').length,
    }
  })
  assert.deepEqual(ledger, {
    root:'sales-ledger',
    mainVisible:'visible',
    mainInlineStyle:null,
    hostInside:true,
    directBodyPortal:false,
    active:'会計データ管理',
    navs:1,
    generatedTabs:0,
  })
  await context.close()
} finally {
  await browser.close()
}

console.log(JSON.stringify({
  release:'admin-shared-page-format-v572',
  production:true,
  inventoryNativeLayout:true,
  salesLedgerNativeLayout:true,
  readOnly:true,
}))
