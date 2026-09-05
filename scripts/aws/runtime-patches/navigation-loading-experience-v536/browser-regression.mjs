import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3115').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v536')
fs.mkdirSync(screenshotRoot, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })

function screenshotPath(name) {
  return path.join(screenshotRoot, `orimia-loading-v536-${name}.png`)
}

async function login(context, endpoint, form) {
  const result = await context.request.post(`${baseUrl}${endpoint}`, { form })
  assert.ok(result.ok(), `${endpoint}: login failed with ${result.status()}`)
}

async function installRecorder(page) {
  await page.addInitScript(() => {
    window.__v536Transitions = []
    window.addEventListener('orimia:ui-transition-started', event => {
      window.__v536Transitions.push({ kind: 'start', mode: event.detail?.mode, reason: event.detail?.reason, href: location.pathname + location.search })
    })
    window.addEventListener('orimia:ui-transition-finished', event => {
      window.__v536Transitions.push({ kind: 'finish', mode: event.detail?.mode, reason: event.detail?.reason, href: location.pathname + location.search })
    })
  })
}

async function loaderState(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const loader = document.getElementById('orimia-ui-loader-v536')
    const shell = document.querySelector('body > .admin-app-shell, body > .app')
    const firstContent = shell?.firstElementChild || Array.from(document.body.children).find(element => (
      element !== loader && element.tagName !== 'SCRIPT' && element.tagName !== 'STYLE'
    ))
    const mark = loader?.querySelector('.orimia-ui-loader-v536__mark')
    const rail = loader?.querySelector('.orimia-ui-loader-v536__rail > span')
    const rect = loader?.getBoundingClientRect()
    return {
      ready: root.dataset.orimiaUiReady || null,
      mode: root.dataset.orimiaUiTransition || null,
      loadingRuntime: window.__orimiaUiTransitionV536 ? 'v536' : root.dataset.orimiaLoadingExperience || null,
      busy: root.getAttribute('aria-busy'),
      loader: Boolean(loader),
      loaderVisibility: loader ? getComputedStyle(loader).visibility : null,
      loaderOpacity: loader ? getComputedStyle(loader).opacity : null,
      loaderWidth: rect?.width || 0,
      loaderHeight: rect?.height || 0,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      copy: loader?.querySelector('[data-orimia-loader-copy]')?.textContent?.trim() || null,
      markAnimation: mark ? getComputedStyle(mark).animationName : null,
      markTransform: mark ? getComputedStyle(mark).transform : null,
      railAnimation: rail ? getComputedStyle(rail).animationName : null,
      railTransform: rail ? getComputedStyle(rail).transform : null,
      contentVisibility: firstContent ? getComputedStyle(firstContent).visibility : null,
      contentOpacity: firstContent ? getComputedStyle(firstContent).opacity : null,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      events: (window.__v536Transitions || []).slice(),
    }
  })
}

async function verifyInitialLoader(page, pathname, delayPattern, label) {
  const delayedUrls = []
  const delay = async route => {
    delayedUrls.push(route.request().url())
    await new Promise(resolve => setTimeout(resolve, 2600))
    await route.continue()
  }
  await page.route(delayPattern, delay)
  const expectedPathname = new URL(pathname, baseUrl).pathname
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForURL(url => url.pathname === expectedPathname, { timeout: 5000 })
  try {
    await page.locator('#orimia-ui-loader-v536').waitFor({ state: 'visible', timeout: 5000 })
  } catch (error) {
    console.error(JSON.stringify({ label, href: page.url(), delayPattern, delayedUrls, state: await loaderState(page) }, null, 2))
    throw error
  }
  await page.waitForFunction(() => window.__orimiaUiTransitionV536 === true)
  const first = await loaderState(page)
  assert.equal(first.ready, null, `${label}: page was revealed before enhancement`)
  assert.equal(first.loadingRuntime, 'v536')
  assert.equal(first.loaderVisibility, 'visible')
  assert.equal(first.loaderOpacity, '1')
  assert.equal(first.copy, '画面を準備しています')
  assert.match(first.markAnimation, /orimia-ui-mark-v536/)
  assert.match(first.railAnimation, /orimia-ui-progress-v536/)
  assert.equal(first.contentVisibility, 'hidden')
  assert.ok(
    first.loaderWidth >= first.viewportWidth - 1 && first.loaderHeight >= first.viewportHeight - 1,
    `${label}: loader ${first.loaderWidth}x${first.loaderHeight} does not cover viewport ${first.viewportWidth}x${first.viewportHeight}`,
  )
  await page.waitForTimeout(220)
  const animated = await loaderState(page)
  assert.notEqual(animated.railTransform, first.railTransform, `${label}: progress rail did not move`)
  await page.screenshot({ path: screenshotPath(`${label}-loading`), fullPage: false })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout: 9000 })
  await page.locator('#orimia-ui-loader-v536').waitFor({ state: 'hidden', timeout: 1500 })
  const ready = await loaderState(page)
  assert.equal(ready.loaderVisibility, 'hidden')
  assert.equal(ready.contentVisibility, 'visible')
  assert.equal(ready.contentOpacity, '1')
  assert.ok(ready.overflow <= 1, `${label}: horizontal overflow is ${ready.overflow}px`)
  await page.screenshot({ path: screenshotPath(`${label}-ready`), fullPage: false })
  await page.unroute(delayPattern, delay)
  return { first, animated, ready }
}

async function verifySamePageChange(page, action, expectedUrl, label) {
  await page.evaluate(() => { window.__v536Transitions = [] })
  await action()
  await page.waitForURL(expectedUrl, { timeout: 5000 })
  await page.waitForTimeout(450)
  const state = await loaderState(page)
  assert.equal(state.ready, 'v516', `${label}: same-page action cleared readiness`)
  assert.equal(state.busy, null, `${label}: same-page action marked the document busy`)
  assert.equal(state.loaderVisibility, 'hidden', `${label}: same-page action displayed the loader`)
  assert.equal(state.events.filter(event => event.kind === 'start').length, 0, `${label}: same-page action started a transition`)
  return state
}

async function verifyPageChange(page, action, destinationPattern, label, hardNavigationHref = null) {
  if (hardNavigationHref) {
    await page.evaluate(href => {
      window.__v536BlockedNavigation = event => {
        const link = event.target instanceof Element ? event.target.closest('a[href]') : null
        if (link && new URL(link.href, location.href).pathname === href) event.preventDefault()
      }
      window.addEventListener('click', window.__v536BlockedNavigation)
    }, hardNavigationHref)
  }
  await page.evaluate(() => { window.__v536Transitions = [] })
  const transitionStarted = page.waitForFunction(
    () => document.documentElement.dataset.orimiaUiTransition === 'navigation',
  )
  const actionResult = action()
  await transitionStarted
  await page.waitForTimeout(220)
  const loading = await loaderState(page)
  assert.equal(loading.ready, null)
  assert.equal(loading.copy, 'ページを移動しています')
  assert.equal(loading.loaderVisibility, 'visible')
  assert.ok(Number(loading.loaderOpacity) >= 0.9, `${label}: navigation loader did not fade in`)
  assert.match(loading.markAnimation, /orimia-ui-mark-v536/)
  assert.match(loading.railAnimation, /orimia-ui-progress-v536/)
  assert.ok(loading.events.some(event => event.kind === 'start' && event.mode === 'navigation'))
  await page.screenshot({ path: screenshotPath(`${label}-navigation`), fullPage: false })
  await actionResult
  if (hardNavigationHref) {
    await page.evaluate(() => {
      window.removeEventListener('click', window.__v536BlockedNavigation)
      delete window.__v536BlockedNavigation
    })
    await page.goto(`${baseUrl}${hardNavigationHref}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  }
  await page.waitForURL(destinationPattern, { timeout: 8000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout: 9000 })
  await page.locator('#orimia-ui-loader-v536').waitFor({ state: 'hidden', timeout: 1500 })
  const ready = await loaderState(page)
  assert.equal(ready.loaderVisibility, 'hidden')
  assert.equal(ready.contentVisibility, 'visible')
  return { loading, ready }
}

const results = {}

try {
  const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await login(admin, '/api/auth/login', { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products' })
  const adminPage = await admin.newPage()
  await installRecorder(adminPage)
  results.adminInitial = await verifyInitialLoader(adminPage, '/admin/products?verify=v536', '**/commercial-admin-v136.js*', 'admin-desktop')

  const feedbackLink = adminPage.locator('a[href*="/admin/products?section=feedback"]').first()
  await feedbackLink.waitFor({ state: 'visible', timeout: 5000 })
  results.adminSamePageTab = await verifySamePageChange(
    adminPage,
    () => feedbackLink.click({ noWaitAfter: true }),
    url => url.pathname === '/admin/products' && url.searchParams.get('section') === 'feedback',
    'admin same-page tab',
  )
  results.adminSamePageSetting = await verifySamePageChange(
    adminPage,
    () => adminPage.evaluate(() => history.replaceState(history.state, '', `${location.pathname}${location.search}&display=compact`)),
    url => url.searchParams.get('display') === 'compact',
    'admin same-page setting',
  )

  const customersLink = adminPage.locator('a[href="/admin/customers"]').first()
  await customersLink.waitFor({ state: 'visible', timeout: 5000 })
  results.adminPageChange = await verifyPageChange(
    adminPage,
    () => customersLink.click({ noWaitAfter: true }),
    url => url.pathname === '/admin/customers',
    'admin-page-change',
  )
  await admin.close()

  const customer = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await login(customer, '/api/customer-auth/login', { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' })
  const customerPage = await customer.newPage()
  await installRecorder(customerPage)
  results.customerInitial = await verifyInitialLoader(customerPage, '/u/home?verify=v536', '**/customer-experience-v503.js*', 'customer-mobile')
  results.customerSamePage = await verifySamePageChange(
    customerPage,
    () => customerPage.evaluate(() => history.pushState({ filter: 'all' }, '', `${location.pathname}?campaign=all`)),
    url => url.pathname === '/u/home' && url.searchParams.get('campaign') === 'all',
    'customer same-page filter',
  )

  const bookingLink = customerPage.locator('a[href="/u/appointments"]').first()
  await bookingLink.waitFor({ state: 'visible', timeout: 5000 })
  results.customerPageChange = await verifyPageChange(
    customerPage,
    () => bookingLink.click({ noWaitAfter: true }),
    url => url.pathname === '/u/appointments',
    'customer-page-change',
    '/u/appointments',
  )
  const customerReady = await loaderState(customerPage)
  assert.ok(customerReady.overflow <= 1, `customer mobile overflow is ${customerReady.overflow}px`)
  await customer.close()

  const adminMobile = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await login(adminMobile, '/api/auth/login', { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products' })
  const adminMobilePage = await adminMobile.newPage()
  await installRecorder(adminMobilePage)
  results.adminMobile = await verifyInitialLoader(adminMobilePage, '/admin/products?verify=v536-mobile', '**/commercial-admin-v136.js*', 'admin-mobile')
  await adminMobile.close()

  console.log(JSON.stringify({ release: 'navigation-loading-experience-v536', browserVerified: true, results }, null, 2))
} finally {
  await browser.close()
}
