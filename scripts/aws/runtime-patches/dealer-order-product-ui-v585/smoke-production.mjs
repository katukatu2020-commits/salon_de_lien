import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 24; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v585-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200 &&
    response.headers.get('x-lien-dealer-order-product-ui') === 'v585' &&
    response.headers.get('x-lien-dealer-company-billing') === 'v584' &&
    response.headers.get('x-lien-receipt-height-calibrated') === 'v583'
  ) break
  if (attempt === 24) assert.fail(`production readiness did not reach v585; last status ${response.status}`)
  await sleep(1500)
}

const clientResponse = await fetch(`${baseUrl}/wholesale-ordering-client-v543.js?v=585-smoke-${Date.now()}`, { cache:'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
for (const invariant of [
  'dealer-order-product-ui-v585',
  '商品情報',
  '取引ディーラー',
  '契約価格（税抜）',
  'wo-line-subtotal',
]) assert.ok(client.includes(invariant), `client invariant missing: ${invariant}`)

const cssResponse = await fetch(`${baseUrl}/wholesale-ordering-v543.css?v=585-smoke-${Date.now()}`, { cache:'no-store' })
assert.equal(cssResponse.status, 200)
const css = await cssResponse.text()
assert.match(css, /dealer-order-product-ui-v585/)
assert.match(css, /\.wo-contract-product-row\.is-selected/)

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })
try {
  for (const [label, viewport] of [['desktop', { width:1440, height:900 }], ['mobile', { width:390, height:844 }]]) {
    const context = await browser.newContext({ viewport })
    const login = await context.request.post(`${baseUrl}/api/auth/login`, {
      headers:{ Origin:baseUrl },
      form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' },
    })
    assert.ok(login.ok(), `${label}: admin login failed with ${login.status()}`)
    const initialResponse = await context.request.get(`${baseUrl}/api/admin/wholesale/bootstrap`)
    assert.ok(initialResponse.ok(), `${label}: bootstrap failed with ${initialResponse.status()}`)
    const initial = await initialResponse.json()
    let dealerId = initial.catalogProducts?.length ? initial.selectedDealerId : null
    for (const contract of initial.contracts || []) {
      if (dealerId || contract.status !== 'ACTIVE') continue
      const response = await context.request.get(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(contract.dealerId)}`)
      if (!response.ok()) continue
      const payload = await response.json()
      if (payload.catalogProducts?.length) dealerId = contract.dealerId
    }
    assert.ok(dealerId, `${label}: no active dealer with configured products was found`)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => {
      if (!/Minified React error #(329|418|423)/.test(String(error))) errors.push(String(error))
    })
    await page.goto(`${baseUrl}/admin/products/orders?smoke=v585-${label}`, { waitUntil:'domcontentloaded', timeout:30_000 })
    const dealerSelect = page.locator('#dealer-select')
    if (await dealerSelect.count()) await dealerSelect.selectOption(dealerId)
    const row = page.locator('.wo-contract-product-row').first()
    await row.waitFor({ state:'visible', timeout:15_000 })
    assert.deepEqual(await page.locator('.wo-contract-product-head > span').allTextContents(), ['商品情報', '取引ディーラー', '契約価格（税抜）', '発注単位', '発注数'])
    const state = await row.evaluate(element => {
      const stepper = element.querySelector('.wo-stepper')
      return {
        overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        columns:getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
        productTop:element.querySelector('.wo-contract-product-main').getBoundingClientRect().top,
        quantityTop:element.querySelector('.wo-order-quantity').getBoundingClientRect().top,
        stepperHeight:stepper.getBoundingClientRect().height,
        icons:[...stepper.querySelectorAll('button svg')].map(svg => ({ width:svg.getBoundingClientRect().width, display:getComputedStyle(svg).display, visibility:getComputedStyle(svg).visibility })),
      }
    })
    assert.equal(state.overflow, false)
    assert.equal(state.columns, label === 'mobile' ? 2 : 5)
    if (label === 'mobile') assert.ok(state.quantityTop > state.productTop)
    assert.equal(state.stepperHeight, 46)
    assert.ok(state.icons.every(icon => icon.width >= 18 && icon.display === 'block' && icon.visibility === 'visible'))
    const before = Number(await row.locator('[data-action="quantity-input"]').inputValue())
    const unit = Number(await row.locator('.wo-stepper').getAttribute('data-unit'))
    await row.locator('[data-action="quantity-plus"]').click()
    const refreshed = page.locator('.wo-contract-product-row').first()
    assert.equal(Number(await refreshed.locator('[data-action="quantity-input"]').inputValue()), before + unit)
    assert.match(await refreshed.locator('.wo-line-subtotal').innerText(), /^小計 /)
    assert.deepEqual(errors, [])
    await context.close()
  }
  console.log(JSON.stringify({ release:'dealer-order-product-ui-v585', production:true, desktop:true, mobile:true, interaction:true, noOverflow:true }))
} finally {
  await browser.close()
}
