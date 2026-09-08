import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 24; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v584-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200 &&
    response.headers.get('x-lien-dealer-company-billing') === 'v584' &&
    response.headers.get('x-lien-receipt-height-calibrated') === 'v583' &&
    response.headers.get('x-lien-dealer-contract-pricing') === 'v581'
  ) break
  if (attempt === 24) assert.fail(`production readiness did not reach v584; last status ${response.status}`)
  await sleep(1500)
}

const clientResponse = await fetch(`${baseUrl}/wholesale-ordering-client-v543.js?v=584-smoke-${Date.now()}`, { cache:'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
for (const invariant of [
  'dealer-company-billing-v584',
  '会社・店舗情報',
  'システム利用料',
  'dealer-billing-agreement',
  'start-billing-checkout',
  'data-pricing-enabled',
]) assert.ok(client.includes(invariant), `client invariant missing: ${invariant}`)

const cssResponse = await fetch(`${baseUrl}/wholesale-ordering-v543.css?v=584-smoke-${Date.now()}`, { cache:'no-store' })
assert.equal(cssResponse.status, 200)
const css = await cssResponse.text()
assert.match(css, /dealer-company-billing-v584/)
assert.match(css, /\.wo-company-grid/)
assert.match(css, /\.wo-billing-layout/)

for (const path of ['/dealer/company', '/dealer/billing', '/dealer/products']) {
  const response = await fetch(`${baseUrl}${path}?smoke=v584`, { redirect:'manual', cache:'no-store' })
  assert.equal(response.status, 302, `${path} did not require dealer authentication`)
  assert.match(response.headers.get('location') || '', /^\/dealer\/login/)
}

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
    await page.goto(`${baseUrl}/admin/products/orders?smoke=v584-${label}`, { waitUntil:'domcontentloaded', timeout:30_000 })
    await page.locator('.wo-tabs').waitFor({ state:'visible', timeout:15_000 })
    await page.waitForFunction(() => {
      const main = document.querySelector('.admin-main-content')
      return main && getComputedStyle(main).visibility === 'visible' && !document.documentElement.classList.contains('orimia-inventory-orders-pending-v572')
    }, null, { timeout:15_000 })
    const state = await page.evaluate(() => ({
      overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      clientScript:[...document.scripts].map(script => script.src).find(src => src.includes('wholesale-ordering-client-v543.js')) || '',
      sharedHost:document.querySelectorAll('[data-orimia-admin-workspace-host-v572="inventory-orders"]').length,
    }))
    assert.equal(state.overflow, false)
    assert.equal(state.sharedHost, 1)
    assert.match(state.clientScript, /v=584-company-billing1/)
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log(JSON.stringify({
    release:'dealer-company-billing-v584',
    production:true,
    assets:true,
    authenticatedRoutes:true,
    salonWorkspacePreserved:true,
    desktop:true,
    mobile:true,
    readOnly:true,
  }))
} finally {
  await browser.close()
}
