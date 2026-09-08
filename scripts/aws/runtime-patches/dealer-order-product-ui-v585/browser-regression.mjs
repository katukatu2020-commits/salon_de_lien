import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3154').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const screenshotDir = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'dealer-order-product-ui-v585')
fs.mkdirSync(screenshotDir, { recursive:true })

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    headers:{ Origin:baseUrl },
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' },
  })
  assert.ok(response.ok(), `admin login failed with ${response.status()}`)
}

async function dealerWithProducts(context) {
  const initialResponse = await context.request.get(`${baseUrl}/api/admin/wholesale/bootstrap`)
  assert.ok(initialResponse.ok(), `bootstrap failed with ${initialResponse.status()}`)
  const initial = await initialResponse.json()
  if (initial.catalogProducts?.length) return initial.selectedDealerId
  for (const contract of initial.contracts || []) {
    if (contract.status !== 'ACTIVE') continue
    const response = await context.request.get(`${baseUrl}/api/admin/wholesale/bootstrap?dealerId=${encodeURIComponent(contract.dealerId)}`)
    if (!response.ok()) continue
    const payload = await response.json()
    if (payload.catalogProducts?.length) return contract.dealerId
  }
  assert.fail('no active dealer with configured products was found')
}

async function verifyViewport(label, viewport) {
  const context = await browser.newContext({ viewport })
  await login(context)
  const dealerId = await dealerWithProducts(context)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => {
    if (!/Minified React error #(329|418|423)/.test(String(error))) errors.push(String(error))
  })
  await page.goto(`${baseUrl}/admin/products/orders?ui=v585-${label}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const dealerSelect = page.locator('#dealer-select')
  if (await dealerSelect.count()) await dealerSelect.selectOption(dealerId)
  const row = page.locator('.wo-contract-product-row').first()
  await row.waitFor({ state:'visible', timeout:15_000 })

  const headings = await page.locator('.wo-contract-product-head > span').allTextContents()
  assert.deepEqual(headings, ['商品情報', '取引ディーラー', '契約価格（税抜）', '発注単位', '発注数'])

  const layout = await row.evaluate(element => {
    const stepper = element.querySelector('.wo-stepper')
    const stepperRect = stepper.getBoundingClientRect()
    const icons = [...stepper.querySelectorAll('button svg')].map(svg => {
      const rect = svg.getBoundingClientRect()
      const style = getComputedStyle(svg)
      return { width:rect.width, height:rect.height, display:style.display, visibility:style.visibility, opacity:style.opacity }
    })
    return {
      documentOverflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      gridColumns:getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
      rowWidth:element.getBoundingClientRect().width,
      productTop:element.querySelector('.wo-contract-product-main').getBoundingClientRect().top,
      quantityTop:element.querySelector('.wo-order-quantity').getBoundingClientRect().top,
      stepperWidth:stepperRect.width,
      stepperHeight:stepperRect.height,
      iconCount:icons.length,
      icons,
    }
  })
  assert.equal(layout.documentOverflow, false)
  assert.equal(layout.iconCount, 2)
  assert.equal(layout.stepperHeight, 46)
  for (const icon of layout.icons) {
    assert.ok(icon.width >= 18 && icon.height >= 18)
    assert.equal(icon.display, 'block')
    assert.equal(icon.visibility, 'visible')
    assert.equal(icon.opacity, '1')
  }
  assert.equal(layout.gridColumns, label === 'mobile' ? 2 : 5)
  if (label === 'mobile') {
    assert.ok(layout.quantityTop > layout.productTop)
    assert.ok(layout.stepperWidth > layout.rowWidth * .8)
  }

  const input = row.locator('[data-action="quantity-input"]')
  const step = Number(await row.locator('.wo-stepper').getAttribute('data-unit'))
  const before = Number(await input.inputValue())
  await row.locator('[data-action="quantity-plus"]').click()
  assert.equal(Number(await page.locator('.wo-contract-product-row').first().locator('[data-action="quantity-input"]').inputValue()), before + step)
  assert.ok(await page.locator('.wo-contract-product-row').first().evaluate(element => element.classList.contains('is-selected')))
  assert.match(await page.locator('.wo-contract-product-row').first().locator('.wo-line-subtotal').innerText(), /^小計 /)
  await page.locator('.wo-contract-product-row').first().locator('[data-action="quantity-minus"]').click()

  await page.screenshot({ path:path.join(screenshotDir, `product-table-${label}.png`), fullPage:true })
  assert.deepEqual(errors, [])
  await context.close()
  return layout
}

try {
  const desktop = await verifyViewport('desktop', { width:1440, height:900 })
  const mobile = await verifyViewport('mobile', { width:390, height:844 })
  console.log(JSON.stringify({
    release:'dealer-order-product-ui-v585',
    desktop:true,
    mobile:true,
    fiveColumnLayout:true,
    quantityInteraction:true,
    visibleIcons:true,
    noHorizontalOverflow:true,
    desktopStepperWidth:desktop.stepperWidth,
    mobileStepperWidth:mobile.stepperWidth,
    screenshots:screenshotDir,
  }))
} finally {
  await browser.close()
}
