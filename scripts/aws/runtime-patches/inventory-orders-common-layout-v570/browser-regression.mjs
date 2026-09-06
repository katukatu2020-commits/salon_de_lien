import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3145').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-inventory-orders-common-layout-v570')
const knownHydrationNoise = /Minified React error #(418|423)/
fs.mkdirSync(artifactRoot, { recursive:true })

function watch(page, label, errors) {
  page.on('console', message => {
    if (message.type() === 'error' && !knownHydrationNoise.test(message.text())) errors.push(`${label}:console:${message.text()}`)
  })
  page.on('pageerror', error => {
    if (!knownHydrationNoise.test(String(error))) errors.push(`${label}:pageerror:${error}`)
  })
  page.on('requestfailed', request => {
    const pathname = new URL(request.url()).pathname
    if (pathname.includes('inventory-orders-common-layout') || pathname.includes('wholesale-ordering')) {
      errors.push(`${label}:requestfailed:${pathname}:${request.failure()?.errorText}`)
    }
  })
}

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/products/orders' },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function openWorkspace(context, label, errors) {
  const page = await context.newPage()
  watch(page, label, errors)
  await page.goto(`${baseUrl}/admin/products/orders`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.waitForFunction(() => Boolean(window.__orimiaInventoryOrdersCommonLayoutV570), null, { timeout:15_000 })
  await page.locator('#orimia-inventory-orders-host-v570 .wo-tabs').waitFor({ state:'visible', timeout:15_000 })
  await page.waitForTimeout(2500)
  return page
}

async function inspect(page, mobile) {
  return page.evaluate(isMobile => {
    const sidebar = document.querySelector('.admin-desktop-sidebar')
    const bottomNav = document.querySelector('#admin-mobile-bottom-nav-v518,.orimia-admin-bottom-nav-v518')
    const back = document.querySelector('[data-inventory-orders-back-v570]')
    const visibleInViewport = element => {
      if (!element || getComputedStyle(element).display === 'none' || getComputedStyle(element).visibility === 'hidden') return false
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < innerWidth && rect.bottom > 0 && rect.top < innerHeight
    }
    const visibleSource = [...document.querySelectorAll('[data-orimia-inventory-orders-source-v570]')].filter(element => getComputedStyle(element).display !== 'none')
    const headerLabels = [...document.querySelectorAll('.admin-desktop-header > .min-w-0 > p')].map(element => element.textContent.trim())
    return {
      pathname:location.pathname,
      shell:document.querySelectorAll('.admin-app-shell').length,
      sidebarCount:document.querySelectorAll('.admin-desktop-sidebar').length,
      headerCount:document.querySelectorAll('.admin-desktop-header').length,
      legacyShell:document.querySelectorAll('.wo-admin-layout,.wo-admin-sidebar,.wo-admin-topbar').length,
      host:document.querySelectorAll('#orimia-inventory-orders-host-v570').length,
      tabs:document.querySelectorAll('#orimia-inventory-orders-host-v570 [role="tab"]').length,
      bodyPage:document.body.dataset.wholesalePage,
      pending:document.documentElement.classList.contains('orimia-inventory-orders-pending-v570'),
      visibleSource:visibleSource.length,
      horizontalOverflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      sidebarVisible:visibleInViewport(sidebar),
      bottomNavVisible:visibleInViewport(bottomNav),
      backVisible:Boolean(back && getComputedStyle(back).display !== 'none' && back.getBoundingClientRect().width > 0),
      backWhiteSpace:back ? getComputedStyle(back).whiteSpace : '',
      backOverflow:back ? back.scrollWidth > back.clientWidth + 1 : true,
      headerLabels,
      title:document.title,
      expectedMobile:isMobile,
    }
  }, mobile)
}

function assertWorkspace(state, mobile) {
  assert.equal(state.pathname, '/admin/products/orders')
  assert.equal(state.shell, 1)
  assert.equal(state.sidebarCount, 1)
  assert.equal(state.headerCount, 1)
  assert.equal(state.legacyShell, 0)
  assert.equal(state.host, 1)
  assert.equal(state.tabs, 3)
  assert.equal(state.bodyPage, 'salon')
  assert.equal(state.pending, false)
  assert.equal(state.visibleSource, 0)
  assert.equal(state.horizontalOverflow, false)
  assert.equal(state.sidebarVisible, !mobile)
  assert.equal(state.bottomNavVisible, mobile)
  assert.equal(state.backVisible, !mobile)
  if (!mobile) {
    assert.equal(state.backWhiteSpace, 'nowrap')
    assert.equal(state.backOverflow, false)
  }
  assert.equal(state.headerLabels[0], 'ORIMIA for Salon')
  assert.equal(state.headerLabels[1], '在庫管理・発注')
  assert.equal(state.title, '在庫管理・発注 | ORIMIA')
}

async function exerciseTabs(page) {
  await page.locator('[data-action="salon-tab"][data-view="inventory"]').click()
  await page.locator('.wo-inventory-list').waitFor({ state:'visible' })
  assert.equal(new URL(page.url()).searchParams.get('view'), 'inventory')

  await page.locator('[data-action="salon-tab"][data-view="history"]').click()
  await page.locator('.wo-workspace').waitFor({ state:'visible' })
  assert.equal(new URL(page.url()).searchParams.get('view'), 'history')

  await page.locator('[data-action="salon-tab"][data-view="order"]').click()
  await page.locator('.wo-workspace').waitFor({ state:'visible' })
  assert.equal(new URL(page.url()).searchParams.has('view'), false)
}

const browser = await chromium.launch({ executablePath, headless:true })
const errors = []

try {
  const desktopContext = await browser.newContext({ viewport:{ width:2048, height:1100 }, deviceScaleFactor:1 })
  await login(desktopContext)
  const desktop = await openWorkspace(desktopContext, 'desktop', errors)
  const desktopState = await inspect(desktop, false)
  assertWorkspace(desktopState, false)
  await desktop.screenshot({ path:path.join(artifactRoot, 'inventory-orders-common-layout-desktop-viewport.png'), fullPage:false })
  await exerciseTabs(desktop)
  await desktop.screenshot({ path:path.join(artifactRoot, 'inventory-orders-common-layout-desktop.png'), fullPage:true })

  await desktop.locator('[data-inventory-orders-back-v570]').click()
  await desktop.waitForURL(url => url.pathname === '/admin/products', { timeout:15_000 })
  await desktop.locator('[data-wholesale-entry-v543]').waitFor({ state:'visible', timeout:15_000 })
  assert.equal(await desktop.locator('#orimia-inventory-orders-host-v570').count(), 0)
  await desktop.locator('[data-wholesale-entry-v543]').click()
  await desktop.waitForURL(url => url.pathname === '/admin/products/orders', { timeout:15_000 })
  await desktop.locator('#orimia-inventory-orders-host-v570 .wo-tabs').waitFor({ state:'visible', timeout:15_000 })
  await desktop.waitForTimeout(2500)
  assertWorkspace(await inspect(desktop, false), false)
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  await login(mobileContext)
  const mobile = await openWorkspace(mobileContext, 'mobile', errors)
  const mobileState = await inspect(mobile, true)
  assertWorkspace(mobileState, true)
  await mobile.screenshot({ path:path.join(artifactRoot, 'inventory-orders-common-layout-mobile-viewport.png'), fullPage:false })
  await exerciseTabs(mobile)
  await mobile.screenshot({ path:path.join(artifactRoot, 'inventory-orders-common-layout-mobile.png'), fullPage:true })
  await mobileContext.close()

  for (const file of fs.readdirSync(artifactRoot).filter(name => name.endsWith('.png'))) {
    assert.ok(fs.statSync(path.join(artifactRoot, file)).size > 15_000, `${file} appears blank`)
  }
  assert.deepEqual(errors, [], errors.join('\n'))
  console.log(JSON.stringify({
    release:'inventory-orders-common-layout-v570',
    browserVerified:true,
    desktop:true,
    mobile:true,
    navigation:true,
    tabs:['order', 'inventory', 'history'],
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
