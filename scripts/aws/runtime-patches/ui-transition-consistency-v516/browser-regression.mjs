import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3122'
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || os.tmpdir()

const browser = await chromium.launch({ executablePath, headless: true })

function screenshotPath(name) {
  return path.join(screenshotRoot, `orimia-ui-v516-${name}.png`)
}

async function shellState(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const shell = document.querySelector('body > .admin-app-shell, body > .app')
    const child = shell?.firstElementChild
    const loader = shell ? getComputedStyle(shell, '::after') : null
    return {
      href: location.pathname + location.search,
      ready: root.dataset.orimiaUiReady || null,
      transition: root.dataset.orimiaUiTransition || null,
      shell: Boolean(shell),
      visibility: child ? getComputedStyle(child).visibility : null,
      opacity: child ? getComputedStyle(child).opacity : null,
      loaderImage: loader?.backgroundImage || null,
      heading: document.querySelector('main h1')?.textContent?.trim() || null,
      overflow: document.body.scrollWidth - innerWidth,
      runtimeEvents: (window.__v516RuntimeEvents || []).slice(-12),
    }
  })
}

async function shellStateDuringNavigation(page) {
  try {
    return await shellState(page)
  } catch (error) {
    if (/Execution context was destroyed|Cannot find context|Target page, context or browser has been closed/.test(String(error?.message || error))) {
      return null
    }
    throw error
  }
}

async function verifyInitialGate(page, url, screenshotName) {
  const delayedLayout = url.startsWith('/admin')
  const layoutPattern = '**/layout-runtime-v516-release5.js'
  const delayLayout = async route => {
    await new Promise(resolve => setTimeout(resolve, 900))
    await route.continue()
  }
  if (delayedLayout) await page.route(layoutPattern, delayLayout)
  await page.goto(`${baseUrl}${url}`, { waitUntil: delayedLayout ? 'commit' : 'domcontentloaded' })
  try {
    await page.locator('body > .admin-app-shell, body > .app').waitFor({ state: 'attached', timeout: 4000 })
  } catch {
    const diagnostic = await page.locator('body').evaluate(body => ({
      url: location.href,
      children: [...body.children].map(child => ({ tag: child.tagName, className: child.className, id: child.id })),
      text: body.innerText.slice(0, 180),
    }))
    throw new Error(`${url}: application shell was not found ${JSON.stringify(diagnostic)}`)
  }
  await page.waitForFunction(() => {
    if (document.documentElement.dataset.orimiaUiReady === 'v516') return true
    const shell = document.querySelector('body > .admin-app-shell, body > .app')
    return shell && getComputedStyle(shell, '::after').backgroundImage.includes('orimia-icon-192.png')
  })
  const gated = await shellState(page)
  if (gated.ready === 'v516') {
    assert.equal(gated.visibility, 'visible', `${url}: completed current UI remained hidden`)
  } else {
    assert.equal(gated.ready, null, `${url}: invalid UI readiness state`)
    assert.equal(gated.visibility, 'hidden', `${url}: server layout remained visible during initialization`)
    assert.match(gated.loaderImage, /orimia-icon-192\.png/)
  }
  await page.screenshot({ path: screenshotPath(`${screenshotName}-loading`), fullPage: false })

  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout: 8000 })
  if (delayedLayout) await page.unroute(layoutPattern, delayLayout)
  const ready = await shellState(page)
  assert.equal(ready.visibility, 'visible')
  assert.equal(ready.opacity, '1')
  await page.screenshot({ path: screenshotPath(`${screenshotName}-ready`), fullPage: false })
  return { gated, ready }
}

async function verifyClientTransition(page, activate, expected, label) {
  await activate()
  const startedAt = Date.now()
  let committedAt = 0
  let sawGate = false
  let visibleIntermediate = null
  let lastState = null

  while (Date.now() - startedAt < 4500) {
    const nextState = await shellStateDuringNavigation(page)
    if (!nextState) {
      await page.waitForTimeout(20)
      continue
    }
    lastState = nextState
    const committed = expected.href(lastState.href)
    if (committed && !committedAt) committedAt = Date.now()

    if (committed && lastState.ready !== 'v516') {
      if (!lastState.loaderImage?.includes('orimia-icon-192.png')) {
        await page.waitForTimeout(20)
        continue
      }
      sawGate = true
      assert.equal(lastState.visibility, 'hidden', `${label}: an intermediate layout became visible`)
      assert.equal(lastState.opacity, '0', `${label}: an intermediate layout became opaque`)
    }

    if (committed && lastState.ready === 'v516') {
      assert.equal(lastState.visibility, 'visible')
      if (lastState.heading !== expected.heading) {
        visibleIntermediate ||= { elapsedMs: Date.now() - committedAt, heading: lastState.heading }
        await page.waitForTimeout(40)
        continue
      }
      assert.ok(sawGate, `${label}: transition guard was never activated`)
      assert.equal(visibleIntermediate, null, `${label}: intermediate UI became visible ${JSON.stringify(visibleIntermediate)}`)
      assert.ok(Date.now() - committedAt <= 2500, `${label}: transition guard stayed active too long; ${JSON.stringify(lastState.runtimeEvents)}`)
      return { revealMs: Date.now() - committedAt, state: lastState }
    }
    await page.waitForTimeout(40)
  }

  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
  await page.waitForTimeout(900)
  const awakenedState = await shellState(page)
  assert.fail(`${label}: current UI did not become ready; last state ${JSON.stringify(lastState)}; after pageshow ${JSON.stringify(awakenedState)}`)
}

async function login(context, endpoint, form) {
  const response = await context.request.post(`${baseUrl}${endpoint}`, { form })
  assert.ok(response.ok(), `${endpoint}: login failed with ${response.status()}`)
}

const results = {}

try {
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const adminPage = await desktop.newPage()
  await adminPage.addInitScript(() => {
    window.__v516RuntimeEvents = []
    window.addEventListener('orimia:ui-runtime-ready', event => {
      window.__v516RuntimeEvents.push({
        kind: 'ready',
        source: event.detail?.source || '',
        href: location.pathname + location.search,
        at: Date.now(),
      })
    })
    window.addEventListener('orimia:ui-transition-started', event => {
      window.__v516RuntimeEvents.push({
        kind: 'start',
        reason: event.detail?.reason || '',
        href: location.pathname + location.search,
        at: Date.now(),
      })
    })
  })
  await login(desktop, '/api/auth/login', {
    email: 'demo.owner',
    password: 'LienDemo2026!',
    next: '/admin/products?section=feedback',
  })
  results.adminInitial = await verifyInitialGate(adminPage, '/admin/products?section=feedback&verify=v516-browser', 'admin-desktop')
  assert.equal(results.adminInitial.ready.heading, '商品分析・レビュー')

  results.adminShelf = await verifyClientTransition(
    adminPage,
    () => adminPage.getByRole('link', { name: '商品棚', exact: true }).click({ noWaitAfter: true }),
    { href: value => value === '/admin/products', heading: '商品・価格・在庫を管理' },
    'admin product shelf',
  )
  results.adminInsights = await verifyClientTransition(
    adminPage,
    () => adminPage.getByRole('link', { name: '集計', exact: true }).click({ noWaitAfter: true }),
    { href: value => value.startsWith('/admin/products?section=feedback'), heading: '商品分析・レビュー' },
    'admin product insights',
  )
  results.adminBack = await verifyClientTransition(
    adminPage,
    () => adminPage.evaluate(() => history.back()),
    { href: value => value === '/admin/products', heading: '商品・価格・在庫を管理' },
    'admin browser back',
  )
  await adminPage.close()

  const customerPage = await desktop.newPage()
  await login(desktop, '/api/customer-auth/login', {
    loginId: 'demo.hana',
    password: 'Mypage2026!',
    next: '/u/home',
  })
  results.customerInitial = await verifyInitialGate(customerPage, '/u/home?verify=v516-browser', 'customer-desktop')
  const customerRuntimePattern = '**/customer-experience-v508.js?v=516-release3'
  const delayCustomerRuntime = async route => {
    await new Promise(resolve => setTimeout(resolve, 650))
    await route.continue()
  }
  await customerPage.route(customerRuntimePattern, delayCustomerRuntime)
  results.customerAppointments = await verifyClientTransition(
    customerPage,
    () => customerPage.locator('a[href="/u/appointments"]').first().click({ noWaitAfter: true }),
    { href: value => value.startsWith('/u/appointments'), heading: 'サロン予約' },
    'customer appointments',
  )
  results.customerBack = await verifyClientTransition(
    customerPage,
    () => customerPage.evaluate(() => history.back()),
    { href: value => value.startsWith('/u/home'), heading: null },
    'customer browser back',
  )
  await customerPage.unroute(customerRuntimePattern, delayCustomerRuntime)
  await desktop.close()

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await login(mobile, '/api/customer-auth/login', {
    loginId: 'demo.hana',
    password: 'Mypage2026!',
    next: '/u/home',
  })
  const mobilePage = await mobile.newPage()
  results.mobileCustomer = await verifyInitialGate(mobilePage, '/u/home?verify=v516-mobile', 'customer-mobile')
  assert.ok(results.mobileCustomer.ready.overflow <= 1, `mobile customer overflowed by ${results.mobileCustomer.ready.overflow}px`)
  await mobile.close()

  const mobileAdmin = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await login(mobileAdmin, '/api/auth/login', {
    email: 'demo.owner',
    password: 'LienDemo2026!',
    next: '/admin/products?section=feedback',
  })
  const mobileAdminPage = await mobileAdmin.newPage()
  results.mobileAdmin = await verifyInitialGate(
    mobileAdminPage,
    '/admin/products?section=feedback&verify=v516-mobile',
    'admin-mobile',
  )
  assert.ok(results.mobileAdmin.ready.overflow <= 1, `mobile admin overflowed by ${results.mobileAdmin.ready.overflow}px`)
  await mobileAdmin.close()

  console.log(JSON.stringify({ release: 'ui-transition-consistency-v516', verified: true, results }, null, 2))
} finally {
  await browser.close()
}
