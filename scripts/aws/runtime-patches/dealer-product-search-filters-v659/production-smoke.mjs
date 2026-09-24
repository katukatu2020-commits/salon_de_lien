import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'dealer-product-search-filters-v659', 'production')
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/chromium')
fs.mkdirSync(output, { recursive:true })

const health = await fetch(`${baseUrl}/api/health/ready`, { redirect:'manual' })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-dealer-product-search-filters'), 'v659')
assert.equal(health.headers.get('x-lien-dealer-monthly-calendar'), 'v658')
assert.equal(health.headers.get('x-lien-mobile-workspaces'), 'v657')

const stylesheet = await fetch(`${baseUrl}/wholesale-ordering-v543.css?v=659-product-search-filters1`)
assert.equal(stylesheet.status, 200)
const css = await stylesheet.text()
assert.match(css, /dealer-product-search-filters-v659/)
assert.match(css, /\.wo-product-filters-v659/)
assert.match(css, /#dealer-pricing-form/)

const clientAsset = await fetch(`${baseUrl}/wholesale-ordering-client-v543.js?v=659-product-search-filters1`)
assert.equal(clientAsset.status, 200)
const client = await clientAsset.text()
assert.match(client, /pricingSelection: new Set/)
assert.match(client, /dealer-product-manufacturer-filter/)
assert.match(client, /dealer-pricing-category-filter/)

for (const route of ['/dealer/products', '/dealer/pricing']) {
  const protectedPage = await fetch(`${baseUrl}${route}`, { redirect:'manual' })
  assert.ok([302, 303].includes(protectedPage.status), `${route} did not redirect to login`)
  assert.match(protectedPage.headers.get('location') || '', /^\/dealer\/login/)
}

const loginPage = await fetch(`${baseUrl}/dealer/login`)
assert.equal(loginPage.status, 200)
const loginHtml = await loginPage.text()
assert.match(loginHtml, /wholesale-ordering-v543\.css\?v=659-product-search-filters1/)
assert.match(loginHtml, /orimia-dealer-monthly-calendar-v658/)

const loginId = String(process.env.DEALER_SMOKE_LOGIN_ID || '').trim()
const password = String(process.env.DEALER_SMOKE_PASSWORD || '')
let authenticated = false

if (loginId && password) {
  const browser = await chromium.launch({ executablePath, headless:true })
  try {
    for (const viewport of [
      { name:'desktop', width:1440, height:960 },
      { name:'mobile', width:390, height:844 },
    ]) {
      const context = await browser.newContext({ viewport:{ width:viewport.width, height:viewport.height }, deviceScaleFactor:1 })
      const login = await context.request.post(`${baseUrl}/api/dealer/auth/login`, {
        form:{ loginId, password, next:'/dealer/products' },
      })
      assert.ok(login.ok(), `Dealer login failed: ${login.status()}`)
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))

      await page.goto(`${baseUrl}/dealer/products`, { waitUntil:'networkidle', timeout:45_000 })
      await page.locator('.wo-product-management').waitFor({ state:'visible', timeout:20_000 })
      assert.ok(await page.locator('#dealer-product-manufacturer-filter option').count() > 1)
      assert.ok(await page.locator('#dealer-product-category-filter option').count() > 1)
      const searchResponse = page.waitForResponse(response => {
        const url = new URL(response.url())
        return url.pathname === '/api/dealer/bootstrap' && url.searchParams.get('productSearch') === 'オルディーブ'
      })
      await page.locator('#dealer-product-search').fill('オルディーブ')
      await searchResponse
      await page.waitForFunction(() => document.querySelectorAll('.wo-catalog-table article').length > 0)
      assert.match(await page.locator('.wo-catalog-table').textContent(), /オルディーブ|ｵﾙﾃﾞｨｰﾌﾞ/)

      await page.goto(`${baseUrl}/dealer/pricing`, { waitUntil:'networkidle', timeout:45_000 })
      await page.locator('.wo-pricing-management').waitFor({ state:'visible', timeout:20_000 })
      assert.ok(await page.locator('[data-pricing-selected]').count() > 0)
      assert.equal(await page.locator('[data-pricing-selected]').count(), await page.locator('[data-pricing-enabled]').count())
      const metrics = await page.evaluate(() => ({ overflow:document.documentElement.scrollWidth - document.documentElement.clientWidth }))
      assert.ok(metrics.overflow <= 2, `${viewport.name} overflowed by ${metrics.overflow}px`)
      assert.deepEqual(errors, [])
      await page.screenshot({ path:path.join(output, `${viewport.name}.png`), fullPage:viewport.width >= 768 })
      await context.close()
    }
    authenticated = true
  } finally {
    await browser.close()
  }
}

console.log(JSON.stringify({ release:'dealer-product-search-filters-v659', productionVerified:true, authenticated, output }))
