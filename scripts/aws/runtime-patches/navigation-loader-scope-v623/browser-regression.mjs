import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { scopeNavigationLoader } from './loader-scope-transform.mjs'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const liveBaseUrl = process.env.SMOKE_BASE_URL ? String(process.env.SMOKE_BASE_URL).replace(/\/$/, '') : ''
const screenshotDir = process.env.SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-navigation-loader-v623')
const releaseRoot = path.dirname(fileURLToPath(import.meta.url))
const baselinePath = path.resolve(releaseRoot, '../navigation-loading-experience-v536/ui-transition-v536.js')
const transitionScript = scopeNavigationLoader(fs.readFileSync(baselinePath, 'utf8'))
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })

function recorderScript() {
  window.__v623Transitions = []
  window.addEventListener('orimia:ui-transition-started', event => {
    window.__v623Transitions.push({ kind: 'start', reason: event.detail?.reason, mode: event.detail?.mode })
  })
  window.addEventListener('orimia:ui-transition-finished', event => {
    window.__v623Transitions.push({ kind: 'finish', reason: event.detail?.reason, mode: event.detail?.mode })
  })
}

async function loaderState(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const loader = document.getElementById('orimia-ui-loader-v536')
    return {
      marker: window.__orimiaUiTransitionV623 === true,
      scope: root.dataset.orimiaNavigationLoaderScope || null,
      ready: root.dataset.orimiaUiReady || null,
      transition: root.dataset.orimiaUiTransition || null,
      busy: root.getAttribute('aria-busy'),
      visibility: loader ? getComputedStyle(loader).visibility : null,
      opacity: loader ? getComputedStyle(loader).opacity : null,
      events: [...(window.__v623Transitions || [])],
    }
  })
}

async function resetTransitions(page) {
  await page.evaluate(() => { window.__v623Transitions = [] })
}

async function assertNoLoader(page, action, label) {
  await resetTransitions(page)
  await action()
  await page.waitForTimeout(220)
  const state = await loaderState(page)
  assert.equal(state.ready, 'v516', `${label}: readiness was cleared`)
  assert.equal(state.transition, null, `${label}: a navigation transition started`)
  assert.equal(state.busy, null, `${label}: document was marked busy`)
  assert.equal(state.visibility, 'hidden', `${label}: loader became visible`)
  assert.equal(state.events.filter(event => event.kind === 'start').length, 0, `${label}: transition event was emitted`)
  return state
}

function syntheticHtml() {
  return `<!doctype html>
<html data-orimia-ui-ready="v516"><head><meta charset="utf-8"><style>
#orimia-ui-loader-v536{visibility:hidden;opacity:0}
html:not([data-orimia-ui-ready="v516"]) #orimia-ui-loader-v536{visibility:visible;opacity:1}
</style></head><body><main class="admin-app-shell">
<a id="open-add" href="/admin/add">Add</a>
<button id="quantity" type="button">+</button>
<select id="filter"><option value="all">All</option><option value="one">One</option></select>
<div id="dialog" hidden>Dialog</div>
<a id="navigate" href="/admin/destination">Navigate</a>
</main><script>
(${recorderScript.toString()})();
document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest('#open-add') : null;
  if (!link) return;
  event.preventDefault();
  document.getElementById('dialog').hidden = false;
});
</script><script src="/ui-transition-v623.js"></script></body></html>`
}

async function withSyntheticServer(run) {
  const server = http.createServer((request, response) => {
    if (request.url === '/ui-transition-v623.js') {
      response.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' })
      response.end(transitionScript)
      return
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(syntheticHtml())
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  try {
    return await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

async function verifySyntheticScope() {
  return withSyntheticServer(async baseUrl => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto(`${baseUrl}/admin/source`, { waitUntil: 'load' })
    await page.waitForFunction(() => window.__orimiaUiTransitionV623 === true)

    const initial = await loaderState(page)
    assert.equal(initial.scope, 'v623')
    assert.equal(initial.ready, 'v516')

    const cancelledAdd = await assertNoLoader(page, () => page.locator('#open-add').click(), 'cancelled add link')
    assert.equal(await page.locator('#dialog').isVisible(), true)
    const quantity = await assertNoLoader(page, () => page.locator('#quantity').click(), 'quantity change')
    const filter = await assertNoLoader(page, () => page.locator('#filter').selectOption('one'), 'filter change')
    const queryState = await assertNoLoader(
      page,
      () => page.evaluate(() => history.replaceState(history.state, '', '/admin/source?filter=one')),
      'same-page query update',
    )

    await resetTransitions(page)
    await page.evaluate(() => history.pushState({}, '', '/admin/destination'))
    await page.waitForFunction(() => document.documentElement.dataset.orimiaUiTransition === 'navigation')
    const routeNavigation = await loaderState(page)
    assert.equal(routeNavigation.ready, null)
    assert.equal(routeNavigation.visibility, 'visible')
    assert.ok(routeNavigation.events.some(event => event.kind === 'start' && event.reason === 'history-pushState'))
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('orimia:ui-runtime-ready', {
      detail: { source: 'admin-commercial-v516' },
    })))
    await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')

    await page.screenshot({ path: path.join(screenshotDir, 'synthetic-scope-mobile.png'), fullPage: false })
    await context.close()
    return { initial, cancelledAdd, quantity, filter, queryState, routeNavigation }
  })
}

async function loginAdmin(context) {
  const response = await context.request.post(`${liveBaseUrl}/api/auth/login`, {
    headers: { Origin: liveBaseUrl },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products/orders' },
  })
  assert.ok(response.ok(), `admin login failed with ${response.status()}`)
}

async function verifyLiveViewport(label, viewport) {
  const context = await browser.newContext({ viewport })
  await loginAdmin(context)
  const page = await context.newPage()
  await page.addInitScript(recorderScript)
  const pageErrors = []
  page.on('pageerror', error => {
    if (!/Minified React error #(329|418|423)/.test(String(error))) pageErrors.push(String(error))
  })
  await page.goto(`${liveBaseUrl}/admin/products/orders?loaderScope=v623-${label}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  await page.locator('#dealer-select').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForFunction(() => (
    window.__orimiaUiTransitionV623 === true &&
    document.documentElement.dataset.orimiaUiReady === 'v516'
  ), null, { timeout: 10_000 })

  const dealerResponse = page.waitForResponse(response => (
    response.url().includes('/api/admin/wholesale/bootstrap') &&
    new URL(response.url()).searchParams.get('dealerId') === 'all'
  ))
  const dealerFilter = await assertNoLoader(
    page,
    async () => {
      await page.locator('#dealer-select').selectOption('all')
      assert.ok((await dealerResponse).ok(), `${label}: dealer filter request failed`)
      await page.locator('.wo-contract-product-row').first().waitFor({ state: 'visible', timeout: 15_000 })
    },
    `${label} dealer filter`,
  )

  const manufacturer = await page.locator('#manufacturer-filter option').nth(1).getAttribute('value')
  assert.ok(manufacturer, `${label}: manufacturer fixture is missing`)
  const manufacturerFilter = await assertNoLoader(
    page,
    () => page.locator('#manufacturer-filter').selectOption(manufacturer),
    `${label} manufacturer filter`,
  )
  await page.locator('#manufacturer-filter').selectOption('')

  const firstRow = page.locator('.wo-contract-product-row').first()
  const quantityChange = await assertNoLoader(
    page,
    () => firstRow.locator('[data-action="quantity-plus"]').click(),
    `${label} quantity change`,
  )
  const confirmation = await assertNoLoader(
    page,
    () => page.locator('[data-action="confirm-order"]').click(),
    `${label} confirmation dialog`,
  )
  await page.locator('#wo-dialog').waitFor({ state: 'visible' })
  await page.screenshot({ path: path.join(screenshotDir, `same-page-${label}.png`), fullPage: false })
  await page.locator('#wo-dialog header button[value="cancel"]').click()

  await page.evaluate(() => {
    const link = document.createElement('a')
    link.id = 'v623-cancelled-add'
    link.href = '/admin/products/orders/new'
    link.textContent = 'Add'
    link.style.position = 'fixed'
    link.style.left = '-9999px'
    document.body.appendChild(link)
    document.addEventListener('click', event => {
      const candidate = event.target instanceof Element ? event.target.closest('#v623-cancelled-add') : null
      if (!candidate) return
      event.preventDefault()
      document.documentElement.dataset.v623DialogOpened = 'true'
    })
  })
  const cancelledAdd = await assertNoLoader(
    page,
    () => page.evaluate(() => document.getElementById('v623-cancelled-add').click()),
    `${label} cancelled add link`,
  )
  assert.equal(await page.evaluate(() => document.documentElement.dataset.v623DialogOpened), 'true')

  const destination = `/admin/appointments?loaderScope=v623-${label}-navigation`
  await resetTransitions(page)
  await page.evaluate(href => history.pushState({ loaderScope: 'v623' }, '', href), destination)
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiTransition === 'navigation')
  const realNavigation = await loaderState(page)
  assert.equal(realNavigation.ready, null)
  assert.equal(realNavigation.visibility, 'visible')
  assert.ok(realNavigation.events.some(event => event.kind === 'start' && event.reason === 'history-pushState'))

  assert.deepEqual(pageErrors, [])
  await context.close()
  return { dealerFilter, manufacturerFilter, quantityChange, confirmation, cancelledAdd, realNavigation }
}

const results = {}
try {
  results.synthetic = await verifySyntheticScope()
  if (liveBaseUrl) {
    results.desktop = await verifyLiveViewport('desktop', { width: 1440, height: 900 })
    results.mobile = await verifyLiveViewport('mobile', { width: 390, height: 844 })
  }
  console.log(JSON.stringify({
    release: 'navigation-loader-scope-v623',
    browserVerified: true,
    liveVerified: Boolean(liveBaseUrl),
    screenshots: screenshotDir,
    results,
  }))
} finally {
  await browser.close()
}
