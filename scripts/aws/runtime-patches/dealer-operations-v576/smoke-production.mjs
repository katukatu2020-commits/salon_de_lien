import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 20; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v576-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200
      && response.headers.get('x-lien-dealer-operations') === 'v576'
      && response.headers.get('x-lien-customer-chart-header-actions') === 'v575'
  ) break
  if (attempt === 20) assert.fail(`production readiness did not reach v576; last status ${response.status}`)
  await sleep(1500)
}

const clientResponse = await fetch(`${baseUrl}/wholesale-ordering-client-v543.js?v=576-smoke-${Date.now()}`, { cache:'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
assert.match(client, /dealer-operations-v576/)
assert.match(client, /美容室との連携に使う固有コード/)
assert.match(client, /契約美容室を管理/)
assert.match(client, /商品を登録/)
assert.match(client, /wo-order-note-link/)

const cssResponse = await fetch(`${baseUrl}/wholesale-ordering-v543.css?v=576-smoke-${Date.now()}`, { cache:'no-store' })
assert.equal(cssResponse.status, 200)
assert.match(await cssResponse.text(), /dealer-operations-v576/)

const dealerLogin = await fetch(`${baseUrl}/dealer/login?smoke=v576`, { cache:'no-store' })
assert.equal(dealerLogin.status, 200)
assert.match(await dealerLogin.text(), /ディーラーログイン/)

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })
try {
  for (const [label, viewport] of [['desktop', { width:1440, height:900 }], ['mobile', { width:390, height:844 }]]) {
    const context = await browser.newContext({ viewport })
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' },
    })
    assert.ok(login.ok(), `${label}: admin login failed with ${login.status()}`)
    const page = await context.newPage()
    await page.goto(`${baseUrl}/admin/products/orders?smoke=v576-${label}`, { waitUntil:'domcontentloaded', timeout:30_000 })
    await page.locator('.wo-tabs').waitFor({ state:'visible', timeout:15_000 })
    await page.waitForFunction(() => {
      const main = document.querySelector('.admin-main-content')
      return main && getComputedStyle(main).visibility === 'visible' && !document.documentElement.classList.contains('orimia-inventory-orders-pending-v572')
    }, null, { timeout:15_000 })
    assert.equal(await page.locator('#dealer-code-form').count(), 1)
    assert.equal(await page.locator('.wo-admin-layout,.wo-admin-sidebar,.wo-admin-topbar').count(), 0)
    assert.equal(await page.locator('[data-orimia-admin-workspace-host-v572="inventory-orders"]').count(), 1)
    const state = await page.evaluate(() => ({
      overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      clientScript:[...document.scripts].map(script => script.src).find(src => src.includes('wholesale-ordering-client-v543.js')) || '',
    }))
    assert.equal(state.overflow, false)
    assert.match(state.clientScript, /v=576-dealer-operations1/)
    await context.close()
  }
  console.log(JSON.stringify({
    release:'dealer-operations-v576',
    production:true,
    assets:true,
    salonCodeLink:true,
    sharedSalonLayout:true,
    desktop:true,
    mobile:true,
    readOnly:true,
  }))
} finally {
  await browser.close()
}
