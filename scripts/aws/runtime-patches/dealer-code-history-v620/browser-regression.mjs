import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')

const baseUrl = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3620').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const screenshotDir = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'dealer-code-history-v620')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch(executablePath ? { executablePath, headless: true } : { headless: true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    headers: { Origin: baseUrl },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products/orders' },
  })
  assert.ok(response.ok(), `admin login failed with ${response.status()}`)
}

async function verifyViewport(label, viewport) {
  const context = await browser.newContext({ viewport })
  await login(context)

  const bootstrapResponse = await context.request.get(`${baseUrl}/api/admin/wholesale/bootstrap`)
  assert.ok(bootstrapResponse.ok(), `bootstrap failed with ${bootstrapResponse.status()}`)
  const bootstrap = await bootstrapResponse.json()
  const activeContracts = (bootstrap.contracts || []).filter(contract => contract.status === 'ACTIVE')
  assert.ok(activeContracts.length > 0, 'an active dealer contract is required')

  for (const contract of activeContracts) {
    assert.match(contract.dealerCode || '', /^DLR-[A-Z0-9]{8,}$/)
    assert.notEqual(contract.dealerCode, contract.customerCode)
  }
  assert.equal(new Set(activeContracts.map(contract => contract.dealerCode)).size, activeContracts.length)

  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => {
    if (!/Minified React error #(329|418|423)/.test(String(error))) pageErrors.push(String(error))
  })
  await page.goto(`${baseUrl}/admin/products/orders?view=history&ui=v620-${label}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })

  const connectedCodes = page.locator('.wo-contract-list small')
  await connectedCodes.first().waitFor({ state: 'visible', timeout: 20_000 })
  const expectedCodes = activeContracts.map(contract => `ディーラー固有コード ${contract.dealerCode}`)
  assert.deepEqual(await connectedCodes.allTextContents(), expectedCodes)
  assert.equal(await page.locator('.wo-contract-list').getByText('得意先コード', { exact: false }).count(), 0)
  assert.equal(await page.locator('.wo-contract-list').getByText('LIEN-YOHAKU', { exact: false }).count(), 0)

  await page.locator('[data-action="salon-tab"][data-view="history"]').click()
  const history = page.locator('.wo-order-history')
  if (bootstrap.orders?.length) await history.waitFor({ state: 'visible', timeout: 10_000 })

  assert.deepEqual(
    await page.locator('.wo-history-header > span').allTextContents(),
    ['発注番号 / 発注日', '発注先', '内容', '金額', '状態'],
  )
  assert.equal(await page.locator('.wo-order-history a[href*="/delivery-note"]').count(), 0)
  assert.equal(await page.locator('.wo-order-history [aria-label*="納品書"]').count(), 0)

  let layout = { articleCount: 0, documentOverflow: false, gridColumns: 0, childCount: 0 }
  const firstArticle = page.locator('.wo-order-history article').first()
  if (await firstArticle.count()) {
    layout = await firstArticle.evaluate(element => ({
      articleCount: element.parentElement.querySelectorAll('article').length,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      gridColumns: getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
      childCount: element.children.length,
    }))
    assert.equal(layout.childCount, 5)
    assert.equal(layout.gridColumns, label === 'mobile' ? 2 : 5)
    assert.equal(layout.documentOverflow, false)

    const directNote = await context.request.get(
      `${baseUrl}/dealer/orders/${encodeURIComponent(bootstrap.orders[0].id)}/delivery-note`,
      { maxRedirects: 0 },
    )
    assert.equal(directNote.status(), 302)
    assert.equal(directNote.headers().location, '/admin/products/orders?view=history')
  }

  await page.screenshot({ path: path.join(screenshotDir, `salon-wholesale-${label}.png`), fullPage: true })
  assert.deepEqual(pageErrors, [])
  await context.close()
  return { activeContracts: activeContracts.length, ...layout }
}

try {
  const desktop = await verifyViewport('desktop', { width: 1440, height: 900 })
  const mobile = await verifyViewport('mobile', { width: 390, height: 844 })
  console.log(JSON.stringify({
    release: 'dealer-code-history-v620',
    dealerCodes: true,
    uniqueDealerCodes: true,
    salonDeliveryNoteRemoved: true,
    legacySalonDeliveryNoteBlocked: true,
    desktop,
    mobile,
    screenshots: screenshotDir,
  }))
} finally {
  await browser.close()
}
