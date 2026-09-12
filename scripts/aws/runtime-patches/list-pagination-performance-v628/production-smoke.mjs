import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/list-pagination-performance-v628/production'
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
fs.mkdirSync(output, { recursive: true })

async function requiredText(pathname) {
  const response = await fetch(base + pathname)
  assert.equal(response.status, 200, pathname + ' returned ' + response.status)
  return response.text()
}

const dealerClient = await requiredText('/wholesale-ordering-client-v543.js?v=628-pagination1')
assert.match(dealerClient, /data-action="dealer-product-page"/)
assert.match(dealerClient, /bootstrapParams\.set\('view', 'products'\)/)
assert.match(dealerClient, /productSearchTimer = setTimeout/)
assert.match(dealerClient, /is-page-loading-v628/)

const dealerCss = await requiredText('/wholesale-ordering-v543.css?v=628-pagination1')
assert.match(dealerCss, /list-pagination-performance-v628: dealer product catalog/)
assert.match(dealerCss, /\.wo-list-pager-v628/)

const styleClient = await requiredText('/style-admin-controls-v618.js?v=628-pagination1')
assert.match(styleClient, /activateAfterHydrationV628/)
assert.match(styleClient, /new AbortController\(\)/)
assert.doesNotMatch(styleClient, /setTimeout\(activateList, 3000\)/)

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

function watch(page, width) {
  const errors = []
  page.on('pageerror', error => {
    if (!/Minified React error #(329|418|423)/.test(error.message)) errors.push('page: ' + error.message)
  })
  page.on('console', message => {
    if (message.type() === 'error' &&
        !message.text().includes('Failed to load resource: the server responded with a status of 404') &&
        !message.text().includes('net::ERR_NAME_NOT_RESOLVED')) errors.push('console: ' + message.text())
  })
  return () => assert.deepEqual(errors, [], width + ': unexpected browser errors')
}

async function login(context) {
  const response = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(response.ok(), 'Production staff login returned ' + response.status())
}

async function verifyViewport(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await login(context)
  const page = await context.newPage()
  const assertNoErrors = watch(page, width)
  let firstPayload = null
  page.on('response', async response => {
    if (!response.url().includes('/api/lien-style-admin-v618') || response.status() !== 200 || firstPayload) return
    try { firstPayload = await response.json() } catch {}
  })

  await page.goto(base + '/admin/community?verify=list-pagination-performance-v628-' + width, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  const root = page.locator('.orimia-style-admin-v618')
  await root.waitFor({ state: 'visible', timeout: 30_000 })
  const cards = root.locator('.orimia-admin-style-card-v618')
  await cards.first().waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForFunction(() => document.querySelectorAll('[data-orimia-style-visibility-v625]').length > 0)

  assert.ok(firstPayload, width + ': production style API response was not observed')
  assert.equal(firstPayload.pageSize, 20)
  assert.ok(firstPayload.posts.length > 0 && firstPayload.posts.length <= 20)
  assert.equal(await cards.count(), firstPayload.posts.length)
  assert.equal(await root.locator('[data-orimia-style-visibility-v625]').count(), firstPayload.posts.length)
  assert.equal(await root.locator('[data-orimia-style-delete-v625]').count(), firstPayload.posts.length)

  if (firstPayload.totalPages > 1) {
    await page.evaluate(() => { window.__v628ProductionMarker = 'same-document' })
    const response = page.waitForResponse(candidate => {
      const url = new URL(candidate.url())
      return url.pathname === '/api/lien-style-admin-v618' && url.searchParams.get('page') === '2' && candidate.status() === 200
    })
    await root.locator('[data-page-v618="2"]').click()
    const payload = await (await response).json()
    await page.waitForFunction(() => document.querySelector('.orimia-admin-style-pager-v618')?.textContent.includes('2 / '))
    assert.ok(payload.posts.length <= 20)
    assert.ok(await cards.count() <= 20)
    assert.equal(await page.evaluate(() => window.__v628ProductionMarker), 'same-document')
  }

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    cardCount: document.querySelectorAll('.orimia-style-admin-v618 .orimia-admin-style-card-v618').length,
    legacyVisible: [...document.querySelectorAll('.orimia-style-admin-legacy-hidden-v618')].some(node => getComputedStyle(node).display !== 'none'),
  }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, width + ': production style page has horizontal overflow')
  assert.ok(layout.cardCount <= 20, width + ': production rendered more than one page of styles')
  assert.equal(layout.legacyVisible, false)
  assertNoErrors()
  await page.screenshot({ path: path.join(output, 'style-posts-' + width + '.png'), fullPage: true })
  results.push({ width, totalCount: firstPayload.totalCount, totalPages: firstPayload.totalPages, layout })
  await context.close()
}

try {
  await verifyViewport(390)
  await verifyViewport(1440)
  console.log(JSON.stringify({
    release: 'list-pagination-performance-v628',
    productionVerified: true,
    dealerAssetsVerified: true,
    stylePaginationVerified: true,
    results,
  }, null, 2))
} finally {
  await browser.close()
}
