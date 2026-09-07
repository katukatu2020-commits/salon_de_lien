import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3147').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-admin-shared-page-format-v572')
const knownHydrationNoise = /Minified React error #(329|418|423)/
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
    if (/admin-workspace-layout-v572|inventory-orders-common-layout-v572|wholesale-ordering-client/.test(pathname)) {
      errors.push(`${label}:requestfailed:${pathname}:${request.failure()?.errorText}`)
    }
  })
}

async function login(context, next) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function standardMetrics(page, pathname) {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.admin-main-content > .mx-auto.grid.max-w-7xl.gap-6').waitFor({ state:'visible', timeout:15_000 })
  await page.waitForTimeout(600)
  return page.evaluate(() => {
    const main = document.querySelector('.admin-main-content')
    const root = main.querySelector(':scope > .mx-auto.grid.max-w-7xl.gap-6')
    const mainStyle = getComputedStyle(main)
    const rootStyle = getComputedStyle(root)
    return {
      rootClass:root.className,
      maxWidth:rootStyle.maxWidth,
      gap:rootStyle.gap,
      padding:[mainStyle.paddingTop, mainStyle.paddingRight, mainStyle.paddingBottom, mainStyle.paddingLeft],
    }
  })
}

async function openInventory(page) {
  await page.goto(`${baseUrl}/admin/products/orders`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('[data-inventory-orders-page-header-v572]').waitFor({ state:'visible', timeout:15_000 })
  await page.locator('.wo-tabs').waitFor({ state:'visible', timeout:15_000 })
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.admin-main-content')).visibility === 'visible', null, { timeout:15_000 })
  await page.waitForTimeout(500)
}

async function inspectInventory(page) {
  return page.evaluate(() => {
    const main = document.querySelector('.admin-main-content')
    const root = main?.querySelector(':scope > .mx-auto.grid.max-w-7xl.gap-6')
    const host = root?.querySelector(':scope > [data-orimia-admin-workspace-host-v572="inventory-orders"]')
    const nav = root?.querySelector(':scope > nav[aria-label="商品ページ切替"]')
    const mainStyle = getComputedStyle(main)
    const rootStyle = getComputedStyle(root)
    return {
      pathname:location.pathname,
      api:window.__orimiaAdminWorkspaceV572?.version,
      shell:document.querySelectorAll('.admin-app-shell').length,
      sidebar:document.querySelectorAll('.admin-desktop-sidebar').length,
      header:document.querySelectorAll('.admin-desktop-header').length,
      rootClass:root?.className,
      rootOwner:root?.dataset.orimiaAdminWorkspaceRootV572,
      rootMaxWidth:rootStyle.maxWidth,
      rootGap:rootStyle.gap,
      mainPadding:[mainStyle.paddingTop, mainStyle.paddingRight, mainStyle.paddingBottom, mainStyle.paddingLeft],
      mainVisibility:mainStyle.visibility,
      mainPointerEvents:mainStyle.pointerEvents,
      hostParent:host?.parentElement === root,
      hostDisplay:host && getComputedStyle(host).display,
      visibleProductNav:Boolean(nav && getComputedStyle(nav).display !== 'none'),
      productNavCount:document.querySelectorAll('nav[aria-label="商品ページ切替"]').length,
      productActive:nav?.querySelector('[aria-current="page"]')?.textContent.trim(),
      hiddenSource:root?.querySelectorAll(':scope > [data-orimia-admin-workspace-source-v572="inventory-orders"]').length,
      legacyHost:document.querySelectorAll('#orimia-inventory-orders-host-v570').length,
      legacyShell:document.querySelectorAll('.wo-admin-layout,.wo-admin-sidebar,.wo-admin-topbar').length,
      tabs:document.querySelectorAll('.wo-tabs [role="tab"]').length,
      title:document.title,
      headerLabels:[...document.querySelectorAll('.admin-desktop-header > .min-w-0 > p')].map(node => node.textContent.trim()),
      overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  })
}

async function exerciseInventoryTabs(page) {
  for (const view of ['inventory', 'history', 'order']) {
    await page.locator(`[data-action="salon-tab"][data-view="${view}"]`).click()
    await page.waitForTimeout(120)
    const query = new URL(page.url()).searchParams.get('view')
    assert.equal(query, view === 'order' ? null : view)
  }
}

async function openLedger(page) {
  await page.goto(`${baseUrl}/admin/owner-analytics?salesLedger=1`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.sl-daily-card').waitFor({ state:'visible', timeout:15_000 })
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.admin-main-content')).visibility === 'visible', null, { timeout:15_000 })
  await page.waitForTimeout(500)
}

async function inspectLedger(page) {
  return page.evaluate(() => {
    const main = document.querySelector('.admin-main-content')
    const root = main?.querySelector(':scope > .mx-auto.grid.max-w-7xl.gap-6')
    const host = root?.querySelector(':scope > [data-orimia-admin-workspace-host-v572="sales-ledger"]')
    const portal = document.querySelector('[data-sl-ledger-portal]')
    const nav = root?.querySelector(':scope > nav[aria-label="経営ページ切替"]')
    const mainStyle = getComputedStyle(main)
    const rootStyle = getComputedStyle(root)
    return {
      pathname:location.pathname,
      query:new URLSearchParams(location.search).get('salesLedger'),
      api:window.__orimiaAdminWorkspaceV572?.version,
      shell:document.querySelectorAll('.admin-app-shell').length,
      rootClass:root?.className,
      rootOwner:root?.dataset.orimiaAdminWorkspaceRootV572,
      rootMaxWidth:rootStyle.maxWidth,
      rootGap:rootStyle.gap,
      mainPadding:[mainStyle.paddingTop, mainStyle.paddingRight, mainStyle.paddingBottom, mainStyle.paddingLeft],
      mainVisibility:mainStyle.visibility,
      mainPointerEvents:mainStyle.pointerEvents,
      mainInlineStyle:main?.getAttribute('style'),
      hostParent:host?.parentElement === root,
      hostDisplay:host && getComputedStyle(host).display,
      portalParent:portal?.parentElement === host,
      portalPosition:portal && getComputedStyle(portal).position,
      pageDisplay:getComputedStyle(document.querySelector('.sl-page')).display,
      directBodyPortal:[...document.body.children].includes(portal),
      visibleAnalyticsNav:Boolean(nav && getComputedStyle(nav).display !== 'none'),
      analyticsNavCount:document.querySelectorAll('nav[aria-label="経営ページ切替"]').length,
      active:nav?.querySelector('[aria-current="page"]')?.textContent.trim(),
      generatedTabs:document.querySelectorAll('.sl-tabs').length,
      hiddenSource:root?.querySelectorAll(':scope > [data-orimia-admin-workspace-source-v572="sales-ledger"]').length,
      dailyVisible:getComputedStyle(document.querySelector('.sl-daily-card')).display !== 'none',
      title:document.title,
      headerLabels:[...document.querySelectorAll('.admin-desktop-header > .min-w-0 > p')].map(node => node.textContent.trim()),
      overflow:document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }
  })
}

function assertFormat(state, standard, key) {
  assert.equal(state.api, 'v572')
  assert.equal(state.shell, 1)
  assert.equal(state.rootClass, standard.rootClass)
  assert.equal(state.rootOwner, key)
  assert.equal(state.rootMaxWidth, standard.maxWidth)
  assert.equal(state.rootGap, standard.gap)
  assert.deepEqual(state.mainPadding, standard.padding)
  assert.equal(state.mainVisibility, 'visible')
  assert.notEqual(state.mainPointerEvents, 'none')
  assert.equal(state.hostParent, true)
  assert.equal(state.hostDisplay, 'contents')
  assert.equal(state.overflow, false)
}

const browser = await chromium.launch({ executablePath, headless:true })
const errors = []

try {
  for (const [name, viewport, mobile] of [
    ['desktop', { width:1440, height:1000 }, false],
    ['mobile', { width:390, height:844 }, true],
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
    await login(context, '/admin/products/orders')
    const page = await context.newPage()
    watch(page, name, errors)

    const productsFormat = await standardMetrics(page, '/admin/products')
    await openInventory(page)
    const inventory = await inspectInventory(page)
    assertFormat(inventory, productsFormat, 'inventory-orders')
    assert.equal(inventory.pathname, '/admin/products/orders')
    assert.equal(inventory.visibleProductNav, true)
    assert.equal(inventory.productNavCount, 1)
    assert.equal(inventory.productActive, '商品棚')
    assert.ok(inventory.hiddenSource >= 3)
    assert.equal(inventory.legacyHost, 0)
    assert.equal(inventory.legacyShell, 0)
    assert.equal(inventory.tabs, 3)
    assert.equal(inventory.title, '在庫管理・発注 | ORIMIA')
    assert.equal(inventory.headerLabels[1], '在庫管理・発注')
    await exerciseInventoryTabs(page)
    await page.screenshot({ path:path.join(artifactRoot, `${name}-inventory.png`), fullPage:!mobile })

    await page.locator('[data-inventory-orders-back-v572]').click()
    await page.waitForURL(url => url.pathname === '/admin/products', { timeout:15_000 })
    await page.locator('[data-wholesale-entry-v543]').waitFor({ state:'visible', timeout:15_000 })
    assert.equal(await page.locator('[data-orimia-admin-workspace-host-v572="inventory-orders"]').count(), 0)

    const analyticsFormat = await standardMetrics(page, '/admin/owner-analytics')
    await openLedger(page)
    const ledger = await inspectLedger(page)
    assertFormat(ledger, analyticsFormat, 'sales-ledger')
    assert.equal(ledger.query, '1')
    assert.equal(ledger.mainInlineStyle, null)
    assert.equal(ledger.portalParent, true)
    assert.equal(ledger.portalPosition, 'static')
    assert.equal(ledger.pageDisplay, 'contents')
    assert.equal(ledger.directBodyPortal, false)
    assert.equal(ledger.visibleAnalyticsNav, true)
    assert.equal(ledger.analyticsNavCount, 1)
    assert.equal(ledger.active, '会計データ管理')
    assert.equal(ledger.generatedTabs, 0)
    assert.ok(ledger.hiddenSource >= 5)
    assert.equal(ledger.dailyVisible, true)
    assert.equal(ledger.title, '会計データ管理 | ORIMIA')
    assert.equal(ledger.headerLabels[1], '会計データ管理')

    await page.locator('[data-sl-staff-trigger]').click()
    assert.equal(await page.locator('[data-sl-staff-popover]').isVisible(), true)
    await page.keyboard.press('Escape')
    assert.equal(await page.locator('[data-sl-staff-popover]').isHidden(), true)
    await page.screenshot({ path:path.join(artifactRoot, `${name}-sales-ledger.png`), fullPage:!mobile })

    await page.locator('nav[aria-label="経営ページ切替"] a[href="/admin/owner-analytics"]').click()
    await page.waitForURL(url => url.pathname === '/admin/owner-analytics' && !url.searchParams.has('salesLedger'), { timeout:15_000 })
    await page.locator('.admin-main-content > .mx-auto.grid.max-w-7xl.gap-6 > header').waitFor({ state:'visible', timeout:15_000 })
    assert.equal(await page.locator('[data-orimia-admin-workspace-host-v572="sales-ledger"]').count(), 0)
    assert.equal(await page.locator('.admin-main-content [data-orimia-admin-workspace-source-v572]').count(), 0)

    await context.close()
  }

  for (const filename of fs.readdirSync(artifactRoot).filter(name => name.endsWith('.png'))) {
    assert.ok(fs.statSync(path.join(artifactRoot, filename)).size > 15_000, `${filename} appears blank`)
  }
  assert.deepEqual(errors, [], errors.join('\n'))
  console.log(JSON.stringify({
    release:'admin-shared-page-format-v572',
    browserVerified:true,
    desktop:true,
    mobile:true,
    nativeNavigation:true,
    routeCleanup:true,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
