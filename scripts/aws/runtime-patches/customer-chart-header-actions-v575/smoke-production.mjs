import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 20; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v575-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200
      && response.headers.get('x-lien-customer-chart-header-actions') === 'v575'
      && response.headers.get('x-lien-customer-booking-check') === 'v574'
      && response.headers.get('x-lien-customer-chart-route-scope') === 'v571'
  ) break
  if (attempt === 20) assert.fail(`production readiness did not reach v575; last status ${response.status}`)
  await sleep(1500)
}

const clientResponse = await fetch(`${baseUrl}/commercial-admin-v101.js?v=575-chart-actions1`, { cache:'no-store' })
assert.equal(clientResponse.status, 200)
const client = await clientResponse.text()
assert.match(client, /customer-chart-header-actions-v575/)
assert.match(client, /margin: 0 !important;/)

async function firstCustomerHref(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('main a')].some(link => {
    const href = link.getAttribute('href') || ''
    return /^\/admin\/customers\/[^/?]+(?:\?.*)?$/.test(href) && !href.startsWith('/admin/customers/messages')
  }), null, { timeout:15_000 })
  return page.locator('main a').evaluateAll(links => links.map(link => link.getAttribute('href') || '').find(href => (
    /^\/admin\/customers\/[^/?]+(?:\?.*)?$/.test(href)
      && !href.startsWith('/admin/customers/messages')
  )))
}

async function inspectViewport(browser, viewport, label) {
  const context = await browser.newContext({ viewport })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' },
  })
  assert.ok(login.ok(), `${label}: login failed with ${login.status()}`)
  const page = await context.newPage()
  await page.goto(`${baseUrl}/admin/customers?smoke=v575-${label}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const href = await firstCustomerHref(page)
  await page.goto(new URL(href, baseUrl).href, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('[data-chart-latest-card-v561]').waitFor({ state:'visible', timeout:15_000 })
  const layout = await page.evaluate(() => {
    const rect = selector => {
      const node = document.querySelector(selector)
      const box = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return { x:box.x, y:box.y, bottom:box.bottom, width:box.width, height:box.height, marginTop:style.marginTop }
    }
    return {
      card:rect('[data-chart-latest-card-v561]'),
      actions:rect('.lien-chart-actions'),
      history:rect('[data-chart-history]'),
      upload:rect('[data-chart-upload]'),
    }
  })
  assert.equal(layout.history.marginTop, '0px', `${label}: history margin`)
  assert.equal(layout.upload.marginTop, '0px', `${label}: upload margin`)
  assert.equal(layout.history.height, 44, `${label}: history height`)
  assert.equal(layout.upload.height, 44, `${label}: upload height`)
  assert.ok(layout.actions.x >= layout.card.x - 0.75, `${label}: actions exceed the card's left edge`)
  assert.ok(layout.actions.x + layout.actions.width <= layout.card.x + layout.card.width + 0.75, `${label}: actions exceed the card's right edge`)
  if (viewport.width <= 640) {
    assert.ok(Math.abs(layout.history.x - layout.upload.x) <= 0.75, `${label}: button left edges differ`)
    assert.ok(Math.abs(layout.history.width - layout.upload.width) <= 0.75, `${label}: button widths differ`)
    assert.ok(Math.abs(layout.upload.y - layout.history.bottom - 8) <= 0.75, `${label}: button gap differs`)
  } else {
    assert.ok(Math.abs(layout.history.y - layout.upload.y) <= 0.75, `${label}: button tops differ`)
    assert.equal(layout.actions.height, 44, `${label}: action row height`)
  }
  if (label === 'desktop') {
    await page.locator('[data-chart-history]').click()
    await page.waitForURL(url => url.searchParams.get('chart') === 'history', { timeout:10_000 })
    const historyPage = page.locator('[data-chart-history-page-v561]')
    await historyPage.waitFor({ state:'visible', timeout:10_000 })
    const historyUpload = await historyPage.locator('[data-chart-upload]').evaluate(button => {
      const box = button.getBoundingClientRect()
      return { height:box.height, marginTop:getComputedStyle(button).marginTop }
    })
    assert.equal(historyUpload.height, 44, 'desktop history: upload height')
    assert.equal(historyUpload.marginTop, '0px', 'desktop history: upload margin')
  }
  await context.close()
  return layout
}

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })
try {
  const desktop = await inspectViewport(browser, { width:1440, height:900 }, 'desktop')
  const tablet = await inspectViewport(browser, { width:820, height:900 }, 'tablet')
  const mobile = await inspectViewport(browser, { width:390, height:844 }, 'mobile')
  console.log(JSON.stringify({
    release:'customer-chart-header-actions-v575',
    production:true,
    aligned:true,
    heights:{ desktop:desktop.actions.height, tablet:tablet.actions.height, mobileButton:mobile.history.height },
    readOnly:true,
  }))
} finally {
  await browser.close()
}
