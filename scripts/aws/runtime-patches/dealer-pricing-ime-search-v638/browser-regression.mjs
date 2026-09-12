import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/dealer-pricing-ime-search-v638/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const client = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-client-v543.js'), 'utf8')
const css = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-v543.css'), 'utf8')
fs.mkdirSync(output, { recursive: true })

const contractId = 'contract-v638'
const catalog = [
  { id:'product-aujua', active:true, manufacturerName:'ミルボン', name:'オージュア リペアリティ トリートメント', category:'ヘアケア', productCode:'AUA-001', janCode:'4954835111111', listPrice:5000 },
  { id:'product-orimia', active:true, manufacturerName:'オリミア', name:'スカルプ シャンプー', category:'シャンプー', productCode:'ORI-002', janCode:'4954835222222', listPrice:3200 },
  { id:'product-suncall', active:true, manufacturerName:'サンコール', name:'キートス ヘアクリーム', category:'スタイリング', productCode:'SUN-003', janCode:'4954835333333', listPrice:2800 },
]
const requests = []

function bootstrap(url) {
  const query = url.searchParams.get('pricingSearch') || ''
  const needle = query.trim().toLocaleLowerCase('ja')
  const products = catalog.filter(product => !needle || [product.manufacturerName, product.name, product.category, product.productCode, product.janCode].join(' ').toLocaleLowerCase('ja').includes(needle))
  return {
    ok: true,
    dealer: { id:'dealer-v638', name:'検証ディーラー', dealerCode:'DLR-V638' },
    contracts: [{ id:contractId, status:'ACTIVE', organizationName:'検証美容室', publicCode:'SALON-V638', customerCode:'CUSTOMER-V638' }],
    products,
    contractProductPrices: products.filter(product => product.id !== 'product-suncall').map(product => ({ contractId, dealerProductId:product.id, discountRate:20 })),
    orders: [],
    pricingPagination: {
      page: 1,
      pageSize: 30,
      totalCount: products.length,
      totalPages: 1,
      totalProductCount: catalog.length,
      configuredCount: 2,
      query,
      contractId,
    },
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/dealer/pricing') {
    res.writeHead(200, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' })
    res.end(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/wholesale-ordering-v543.css"></head><body class="wo-body wo-dealer-body" data-wholesale-page="dealer" data-dealer-view="pricing"><main class="wo-main"><div id="wholesale-app" class="wo-app-root"></div></main><script src="/wholesale-ordering-client-v543.js"></script></body></html>`)
    return
  }
  if (url.pathname === '/wholesale-ordering-client-v543.js') {
    res.writeHead(200, { 'content-type':'application/javascript; charset=utf-8' })
    res.end(client)
    return
  }
  if (url.pathname === '/wholesale-ordering-v543.css') {
    res.writeHead(200, { 'content-type':'text/css; charset=utf-8' })
    res.end(css)
    return
  }
  if (url.pathname === '/api/dealer/bootstrap') {
    const query = url.searchParams.get('pricingSearch') || ''
    requests.push({ query, at:Date.now() })
    const payload = JSON.stringify(bootstrap(url))
    setTimeout(() => {
      res.writeHead(200, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' })
      res.end(payload)
    }, query ? 70 : 10)
    return
  }
  res.writeHead(404)
  res.end('not found')
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const address = server.address()
const base = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch({ executablePath, headless:true })
const results = []

async function verifyViewport(width) {
  const context = await browser.newContext({ viewport:{ width, height:900 }, deviceScaleFactor:1 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('404')) errors.push('console: ' + message.text())
  })

  await page.goto(base + '/dealer/pricing', { waitUntil:'domcontentloaded', timeout:30_000 })
  const input = page.locator('#dealer-pricing-search')
  await input.waitFor({ state:'visible', timeout:10_000 })
  await page.locator('[data-pricing-row]').first().waitFor({ state:'visible' })
  const initialRequestCount = requests.length

  await page.evaluate(() => {
    const field = document.getElementById('dealer-pricing-search')
    window.__v638PricingInput = field
    window.__v638PricingSection = field.closest('.wo-pricing-management')
    field.focus()
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles:true, data:'' }))
    field.value = 'お'
    field.dispatchEvent(new InputEvent('input', { bubbles:true, data:'お', inputType:'insertCompositionText', isComposing:true }))
  })
  await page.waitForTimeout(650)
  assert.equal(requests.length, initialRequestCount, width + ': search ran before IME conversion completed')
  assert.deepEqual(await page.evaluate(() => ({
    value: document.getElementById('dealer-pricing-search').value,
    sameInput: window.__v638PricingInput === document.getElementById('dealer-pricing-search'),
    focused: document.activeElement === document.getElementById('dealer-pricing-search'),
  })), { value:'お', sameInput:true, focused:true })

  const katakanaResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/dealer/bootstrap' && url.searchParams.get('pricingSearch') === 'オージュア' && response.status() === 200
  })
  await page.evaluate(() => {
    const field = document.getElementById('dealer-pricing-search')
    field.value = 'オージュア'
    field.dispatchEvent(new CompositionEvent('compositionend', { bubbles:true, data:'オージュア' }))
    field.dispatchEvent(new InputEvent('input', { bubbles:true, data:'オージュア', inputType:'insertText', isComposing:false }))
  })
  await katakanaResponse
  await page.waitForFunction(() => document.querySelectorAll('[data-pricing-row]').length === 1)

  const state = await page.evaluate(() => ({
    value: document.getElementById('dealer-pricing-search').value,
    sameInput: window.__v638PricingInput === document.getElementById('dealer-pricing-search'),
    sameSection: window.__v638PricingSection === document.querySelector('.wo-pricing-management'),
    focused: document.activeElement === document.getElementById('dealer-pricing-search'),
    product: document.querySelector('.wo-pricing-product strong')?.textContent,
    query: new URL(location.href).searchParams.get('pricingSearch'),
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    busy: document.querySelector('.wo-pricing-management')?.getAttribute('aria-busy'),
  }))
  assert.equal(state.value, 'オージュア')
  assert.equal(state.product, 'オージュア リペアリティ トリートメント')
  assert.equal(state.query, 'オージュア')
  assert.equal(state.sameInput, true, width + ': pricing search input was replaced')
  assert.equal(state.sameSection, true, width + ': pricing workspace was replaced')
  assert.equal(state.focused, true, width + ': pricing search lost focus after results arrived')
  assert.equal(state.busy, null)
  assert.ok(state.documentWidth <= state.viewport + 2, width + ': pricing page has horizontal overflow')
  assert.equal(requests.slice(initialRequestCount).filter(request => request.query === 'オージュア').length, 1)
  assert.deepEqual(errors, [], width + ': unexpected browser errors')

  await page.screenshot({ path:path.join(output, 'dealer-pricing-ime-' + width + '.png'), fullPage:true })
  results.push({ width, composingRequestSuppressed:true, katakana:'オージュア', sameInput:state.sameInput, focused:state.focused, rows:1 })
  await context.close()
}

try {
  await verifyViewport(390)
  await verifyViewport(1440)
  console.log(JSON.stringify({ release:'dealer-pricing-ime-search-v638', browserVerified:true, results }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
