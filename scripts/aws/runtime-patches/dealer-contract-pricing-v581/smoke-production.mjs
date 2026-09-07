import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 20; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v581-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200
      && response.headers.get('x-lien-dealer-contract-pricing') === 'v581'
      && response.headers.get('x-lien-admin-chat-read-position') === 'v580'
  ) break
  if (attempt === 20) assert.fail(`production readiness did not reach v581; last status ${response.status}`)
  await sleep(1500)
}

const clientResponse = await fetch(`${baseUrl}/wholesale-ordering-client-v543.js?v=581-smoke-${Date.now()}`, { cache:'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
assert.match(client, /dealer-contract-pricing-v581/)
assert.match(client, /美容室別の取扱・割引設定/)
assert.match(client, /定価（税抜）/)
assert.match(client, /契約単価（税抜）/)
assert.match(client, /ディーラーがこの店舗向けに設定した商品/)
assert.match(client, /data-pricing-enabled/)

const cssResponse = await fetch(`${baseUrl}/wholesale-ordering-v543.css?v=581-smoke-${Date.now()}`, { cache:'no-store' })
assert.equal(cssResponse.status, 200)
const css = await cssResponse.text()
assert.match(css, /dealer-contract-pricing-v581/)
assert.match(css, /\.wo-contract-product-table/)
assert.match(css, /\.wo-pricing-table/)

const dealerLogin = await fetch(`${baseUrl}/dealer/pricing?smoke=v581`, { cache:'no-store' })
assert.equal(dealerLogin.status, 200)
assert.match(await dealerLogin.text(), /ディーラーログイン/)

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })
try {
  for (const [label, viewport] of [['desktop', { width:1440, height:900 }], ['mobile', { width:390, height:844 }]]) {
    const context = await browser.newContext({ viewport })
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      headers:{ Origin:baseUrl },
      form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' },
    })
    assert.ok(login.ok(), `${label}: admin login failed with ${login.status()}`)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => {
      if (!/Minified React error #(329|418|423)/.test(String(error))) errors.push(String(error))
    })
    page.on('requestfailed', request => {
      if (/wholesale-ordering|inventory-orders-common-layout/.test(request.url())) errors.push(`${request.url()}:${request.failure()?.errorText}`)
    })
    await page.goto(`${baseUrl}/admin/products/orders?smoke=v581-${label}`, { waitUntil:'domcontentloaded', timeout:30_000 })
    await page.locator('.wo-tabs').waitFor({ state:'visible', timeout:15_000 })
    await page.waitForFunction(() => {
      const main = document.querySelector('.admin-main-content')
      return main && getComputedStyle(main).visibility === 'visible' && !document.documentElement.classList.contains('orimia-inventory-orders-pending-v572')
    }, null, { timeout:15_000 })
    await page.getByRole('heading', { name:'契約商品を発注' }).waitFor({ state:'visible' })
    assert.equal(await page.locator('.wo-admin-layout,.wo-admin-sidebar,.wo-admin-topbar').count(), 0)
    assert.equal(await page.locator('[data-orimia-admin-workspace-host-v572="inventory-orders"]').count(), 1)
    const state = await page.evaluate(() => ({
      overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      clientScript:[...document.scripts].map(script => script.src).find(src => src.includes('wholesale-ordering-client-v543.js')) || '',
      oldCards:document.querySelectorAll('.wo-product-grid').length,
    }))
    assert.equal(state.overflow, false)
    assert.equal(state.oldCards, 0)
    assert.match(state.clientScript, /v=581-contract-pricing1/)
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log(JSON.stringify({
    release:'dealer-contract-pricing-v581',
    production:true,
    assets:true,
    configuredCatalogOnly:true,
    sharedSalonLayout:true,
    desktop:true,
    mobile:true,
    readOnly:true,
  }))
} finally {
  await browser.close()
}
