import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3146').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-customer-chart-route-scope-v571')
const knownHydrationNoise = /Minified React error #(418|423)/
fs.mkdirSync(artifactRoot, { recursive:true })

const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))
const sampleImage = customerId => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760"><rect width="1200" height="760" fill="#f5f0ed"/><rect x="36" y="36" width="1128" height="688" rx="8" fill="#fff" stroke="#b94662" stroke-width="4"/><path d="M76 170H1124M76 280H1124M76 390H1124M76 500H1124M390 170V680M790 170V680" stroke="#d6c7c0" stroke-width="3"/><text x="76" y="118" font-family="sans-serif" font-size="35" fill="#73394a">CUSTOMER CHART</text><text x="76" y="650" font-family="sans-serif" font-size="22" fill="#68574f">${customerId}</text></svg>`)}`

function watch(page, label, errors) {
  page.on('console', message => {
    if (message.type() === 'error' && !knownHydrationNoise.test(message.text())) errors.push(`${label}:console:${message.text()}`)
  })
  page.on('pageerror', error => {
    if (!knownHydrationNoise.test(String(error))) errors.push(`${label}:pageerror:${error}`)
  })
}

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' },
  })
  assert.ok(response.ok(), `login failed with ${response.status()}`)
}

async function detailLinks(page) {
  await page.waitForFunction(() => [...document.querySelectorAll('main a')].some(link => {
    const href = link.getAttribute('href') || ''
    return /^\/admin\/customers\/[^/?]+(?:\?.*)?$/.test(href) && !href.startsWith('/admin/customers/messages')
  }), null, { timeout:15_000 })
  return page.locator('main a').evaluateAll(links => [...new Set(links.map(link => link.getAttribute('href') || '').filter(href => (
    /^\/admin\/customers\/[^/?]+(?:\?.*)?$/.test(href)
    && !href.startsWith('/admin/customers/messages')
  )))].slice(0, 3))
}

async function clickDestination(page, destination) {
  const target = new URL(destination, baseUrl)
  const clicked = await page.locator('a').evaluateAll((links, expected) => {
    const targetUrl = new URL(expected, location.origin)
    const link = links.find(candidate => {
      const href = candidate.getAttribute('href')
      if (!href) return false
      const candidateUrl = new URL(href, location.origin)
      return candidateUrl.pathname === targetUrl.pathname && (
        !targetUrl.search || candidateUrl.search === targetUrl.search
      )
    })
    if (!link) return false
    link.click()
    return true
  }, target.href)
  assert.equal(clicked, true, `link was not found: ${target.pathname}${target.search}`)
  await page.waitForURL(url => url.pathname === target.pathname && (!target.search || url.search === target.search), { timeout:15_000 })
}

async function waitForTransition(page) {
  await page.waitForFunction(() => {
    const labels = new Set(['ページを移動しています', '画面を準備しています'])
    return ![...document.querySelectorAll('body *')].some(node => {
      if (!labels.has(node.textContent?.trim())) return false
      const style = getComputedStyle(node)
      const rect = node.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0
    })
  }, null, { timeout:15_000 })
  await page.waitForTimeout(250)
}

function customerIdFromHref(href) {
  return decodeURIComponent(new URL(href, baseUrl).pathname.split('/').filter(Boolean).at(-1))
}

async function waitForChart(page, customerId) {
  await page.waitForFunction(id => {
    const card = document.querySelector('[data-chart-latest-card-v561]')
    return card?.dataset.chartCustomerV571 === id && card.textContent.includes(`${id}-chart.jpg`)
  }, customerId, { timeout:15_000 })
  const state = await page.evaluate(id => {
    const main = [...document.querySelectorAll('.admin-app-shell .admin-main-content')].find(candidate => (
      [...candidate.querySelectorAll('input[name="customerId"]')].some(input => input.value === id)
    ))
    const card = document.querySelector('[data-chart-latest-card-v561]')
    const headings = main ? [...main.querySelectorAll('h2,h3')] : []
    const nameSection = headings.find(node => node.textContent.trim() === '実際のお名前')?.closest('section')
    const profileSection = headings.find(node => node.textContent.trim() === '髪・接客情報')?.closest('section')
    return {
      release:window.__lienCustomerChartRouteScopeV571 === true,
      cardCount:document.querySelectorAll('[data-chart-latest-card-v561]').length,
      owner:card?.dataset.chartCustomerV571,
      sameContainer:Boolean(card && nameSection && profileSection && card.parentElement === nameSection.parentElement && card.parentElement === profileSection.parentElement),
      immediatelyAfterName:Boolean(card && nameSection && nameSection.nextElementSibling === card),
      insideSharedHeader:Boolean(card?.closest('.admin-desktop-header,.admin-mobile-header')),
      mainMatches:Boolean(main),
    }
  }, customerId)
  assert.deepEqual(state, {
    release:true,
    cardCount:1,
    owner:customerId,
    sameContainer:true,
    immediatelyAfterName:true,
    insideSharedHeader:false,
    mainMatches:true,
  })
}

async function assertNoChartUi(page, label) {
  await page.waitForFunction(() => (
    !document.querySelector('[data-chart-latest-card-v561],[data-chart-history-page-v561],[data-chart-hidden-v561],[data-chart-preview-v561],[data-chart-delete-dialog-v567]')
  ), null, { timeout:10_000 })
  const headings = await page.locator('main h1,main h2,main h3').allTextContents()
  assert.equal(headings.some(text => text.trim() === 'カルテファイル'), false, `${label}: chart heading leaked`)
}

async function installChartMock(page, requests) {
  await page.route(/\/api\/admin\/customers\/[^/]+\/chart-photos(?:\?.*)?$/, async route => {
    const request = route.request()
    if (request.method() !== 'GET') return route.continue()
    const url = new URL(request.url())
    const match = /\/api\/admin\/customers\/([^/]+)\/chart-photos$/.exec(url.pathname)
    const customerId = decodeURIComponent(match?.[1] || '')
    requests.push(customerId)
    await sleep(140)
    const image = sampleImage(customerId)
    await route.fulfill({
      status:200,
      contentType:'application/json',
      body:JSON.stringify({
        ok:true,
        count:1,
        limit:Number(url.searchParams.get('limit') || 1),
        offset:Number(url.searchParams.get('offset') || 0),
        items:[{
          id:`chart-${customerId}`,
          url:image,
          downloadUrl:image,
          originalFileName:`${customerId}-chart.jpg`,
          contentType:'image/jpeg',
          kind:'image',
          byteSize:428000,
          uploadedByName:'テスト担当者',
          createdAt:'2026-09-07T09:30:00.000Z',
        }],
      }),
    })
  })
}

const browser = await chromium.launch({ executablePath, headless:true })
const errors = []

try {
  const desktopContext = await browser.newContext({ viewport:{ width:1440, height:1000 }, deviceScaleFactor:1 })
  await login(desktopContext)
  const desktop = await desktopContext.newPage()
  watch(desktop, 'desktop', errors)
  const desktopRequests = []
  await installChartMock(desktop, desktopRequests)
  await desktop.goto(`${baseUrl}/admin/customers?verify=v571-desktop`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const links = await detailLinks(desktop)
  assert.ok(links.length >= 2, 'two customer detail links are required')

  const firstCustomerId = customerIdFromHref(links[0])
  await clickDestination(desktop, links[0])
  await waitForChart(desktop, firstCustomerId)
  await waitForTransition(desktop)
  const card = desktop.locator('[data-chart-latest-card-v561]')
  await card.scrollIntoViewIfNeeded()
  await desktop.screenshot({ path:path.join(artifactRoot, 'customer-chart-desktop.png'), fullPage:false })

  const callsBeforeRemount = desktopRequests.filter(id => id === firstCustomerId).length
  await card.evaluate(node => node.remove())
  await waitForChart(desktop, firstCustomerId)
  assert.ok(desktopRequests.filter(id => id === firstCustomerId).length > callsBeforeRemount, 'removed chart card was not remounted')

  await desktop.locator('[data-chart-history]').click()
  await desktop.waitForURL(url => url.searchParams.get('chart') === 'history', { timeout:10_000 })
  await desktop.locator('[data-chart-history-page-v561]').waitFor({ state:'visible', timeout:10_000 })
  assert.ok(await desktop.locator('[data-chart-hidden-v561]').count() > 0)

  await clickDestination(desktop, '/admin/products?section=menus')
  await assertNoChartUi(desktop, 'products')

  await clickDestination(desktop, '/admin/customers')
  await detailLinks(desktop)
  const messageRequestsBefore = desktopRequests.filter(id => id === 'messages').length
  await clickDestination(desktop, '/admin/customers/messages')
  await desktop.waitForTimeout(700)
  await assertNoChartUi(desktop, 'messages')
  await waitForTransition(desktop)
  assert.equal(desktopRequests.filter(id => id === 'messages').length, messageRequestsBefore, 'messages route requested a customer chart')
  assert.equal(await desktop.getByText('顧客へのお知らせ・クーポン配信', { exact:true }).count(), 1)
  await desktop.screenshot({ path:path.join(artifactRoot, 'messages-without-chart-desktop.png'), fullPage:false })

  await clickDestination(desktop, '/admin/customers')
  const secondLinks = await detailLinks(desktop)
  const secondCustomerId = customerIdFromHref(secondLinks[1])
  await clickDestination(desktop, secondLinks[1])
  await waitForChart(desktop, secondCustomerId)
  assert.notEqual(firstCustomerId, secondCustomerId)
  assert.equal(await desktop.locator(`[data-chart-customer-v571="${secondCustomerId}"]`).count(), 1)
  assert.equal(await desktop.locator(`[data-chart-customer-v571="${firstCustomerId}"]`).count(), 0)
  await desktopContext.close()

  const mobileContext = await browser.newContext({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 })
  await login(mobileContext)
  const mobile = await mobileContext.newPage()
  watch(mobile, 'mobile', errors)
  const mobileRequests = []
  await installChartMock(mobile, mobileRequests)
  await mobile.goto(`${baseUrl}/admin/customers?verify=v571-mobile`, { waitUntil:'domcontentloaded', timeout:30_000 })
  const mobileLinks = await detailLinks(mobile)
  const mobileCustomerId = customerIdFromHref(mobileLinks[0])
  await clickDestination(mobile, mobileLinks[0])
  await waitForChart(mobile, mobileCustomerId)
  await waitForTransition(mobile)
  await mobile.locator('[data-chart-latest-card-v561]').scrollIntoViewIfNeeded()
  const overflow = await mobile.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth)
  assert.ok(overflow <= 1, `mobile chart overflowed by ${overflow}px`)
  await mobile.screenshot({ path:path.join(artifactRoot, 'customer-chart-mobile.png'), fullPage:false })

  await mobile.goto(`${baseUrl}/admin/customers/messages?verify=v571-mobile`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await mobile.waitForTimeout(700)
  await assertNoChartUi(mobile, 'mobile messages')
  await waitForTransition(mobile)
  assert.equal(mobileRequests.includes('messages'), false)
  await mobile.screenshot({ path:path.join(artifactRoot, 'messages-without-chart-mobile.png'), fullPage:false })
  await mobileContext.close()

  for (const file of fs.readdirSync(artifactRoot).filter(name => name.endsWith('.png'))) {
    assert.ok(fs.statSync(path.join(artifactRoot, file)).size > 10_000, `${file} appears blank`)
  }
  assert.deepEqual(errors, [], errors.join('\n'))

  console.log(JSON.stringify({
    release:'customer-chart-route-scope-v571',
    browserVerified:true,
    desktop:true,
    mobile:true,
    cardRemount:true,
    customerSwitch:true,
    historyCleanup:true,
    messagesExcluded:true,
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
