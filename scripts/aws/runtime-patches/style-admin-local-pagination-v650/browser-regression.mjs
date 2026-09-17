import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-admin-local-pagination-v650/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const client = fs.readFileSync(path.join(runtimeRoot, 'public', 'style-admin-controls-v618.js'), 'utf8')
const stylesheet = fs.readFileSync(path.join(runtimeRoot, 'public', 'style-admin-controls-v618.css'), 'utf8')
const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')
const listRequests = []
fs.mkdirSync(output, { recursive: true })

function posts(page) {
  return Array.from({ length: 15 }, (_, index) => ({
    id: `staff-${page}-${index + 1}`,
    displayOrder: (page - 1) * 15 + index + 1,
    postKind: 'STORE',
    published: true,
    title: `Style ${page}-${index + 1}`,
    staffKey: 'staff-1',
    stylistName: 'Demo Stylist',
    gender: '',
    course: 'Cut',
    publishedAt: '2026-09-17T00:00:00.000Z',
    coverPhotoUrl: `/fixtures/style-${page}-${index + 1}.gif`,
    likeCount: index,
    commentCount: index + 1,
  }))
}

function payload(url) {
  const page = Math.min(3, Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1))
  return {
    release: 'style-admin-controls-v618',
    filters: { sort: 'manual', staffKey: '', course: '', gender: '' },
    options: {
      staff: [{ key: 'staff-1', name: 'Demo Stylist', role: 'Stylist' }],
      courses: [{ value: 'Cut', label: 'Cut' }],
      genders: [],
    },
    posts: posts(page),
    page,
    pageSize: 15,
    totalCount: 45,
    totalPages: 3,
  }
}

function html() {
  return `<!doctype html><html lang="ja" data-orimia-ui-ready="v516"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style-admin-controls-v618.css"><style>
    *{box-sizing:border-box}body{margin:0;background:#fffaf7;color:#292522;font-family:sans-serif}.test-banner{height:720px;padding:32px;background:#f7eee9}main{max-width:1560px;margin:auto;padding:24px}img{background:#eee}
  </style></head><body><div class="test-banner"><h1>Style community</h1></div><main><section class="orimia-style-admin-v618" data-orimia-style-list-shell-v640="true"></section></main><script>
    window.__routeWrapperCallsV650 = []
    window.__navigationEventsV650 = []
    const nativePushStateV650Harness = History.prototype.pushState
    const nativeReplaceStateV650Harness = History.prototype.replaceState
    nativeReplaceStateV650Harness.call(history, { sentinel: 'keep-v650' }, '', location.href)
    Object.defineProperty(history, 'pushState', { configurable: true, writable: true, value: function(...args) {
      window.__routeWrapperCallsV650.push({ method: 'pushState', url: String(args[2] || '') })
      const result = nativePushStateV650Harness.apply(this, args)
      setTimeout(() => scrollTo(0, 0), 350)
      return result
    } })
    Object.defineProperty(history, 'replaceState', { configurable: true, writable: true, value: function(...args) {
      window.__routeWrapperCallsV650.push({ method: 'replaceState', url: String(args[2] || '') })
      const result = nativeReplaceStateV650Harness.apply(this, args)
      setTimeout(() => scrollTo(0, 0), 350)
      return result
    } })
    if (window.navigation) {
      navigation.addEventListener('navigate', () => window.__navigationEventsV650.push('navigate'))
      navigation.addEventListener('currententrychange', () => window.__navigationEventsV650.push('currententrychange'))
    }
  </script><script src="/style-admin-controls-v618.js"></script></body></html>`
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/style-admin-controls-v618.js') {
    response.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' })
    response.end(client)
    return
  }
  if (url.pathname === '/style-admin-controls-v618.css') {
    response.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' })
    response.end(stylesheet)
    return
  }
  if (url.pathname.startsWith('/fixtures/')) {
    response.writeHead(200, { 'content-type': 'image/gif', 'content-length': pixel.length, 'cache-control': 'no-store' })
    response.end(pixel)
    return
  }
  if (url.pathname === '/api/lien-style-admin-v618') {
    listRequests.push(url.pathname + url.search)
    setTimeout(() => {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      response.end(JSON.stringify(payload(url)))
    }, 180)
    return
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
  response.end(html())
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})

const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath, headless: true })

async function verifyViewport(viewport, label, expectedColumns) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  const documents = []
  const requestStart = listRequests.length
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()) })
  page.on('request', request => { if (request.resourceType() === 'document') documents.push(request.url()) })

  await page.goto(base + '/admin/community?source=v650', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.orimia-style-admin-v618')
  const cards = root.locator('.orimia-admin-style-card-v618')
  await cards.first().waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelectorAll('[data-orimia-style-visibility-v625]').length === 15)
  const initialUrl = page.url()

  const initial = await page.evaluate(() => ({
    marker: window.__orimiaStyleAdminLocalPaginationV650,
    state: history.state,
    columns: getComputedStyle(document.querySelector('.orimia-admin-style-grid-v618')).gridTemplateColumns.trim().split(/\s+/).length,
    overflow: document.documentElement.scrollWidth - innerWidth,
  }))
  assert.equal(initial.marker, true)
  assert.deepEqual(initial.state, { sentinel: 'keep-v650' })
  assert.equal(initial.columns, expectedColumns)
  assert.ok(initial.overflow <= 2)

  await page.evaluate(() => {
    const pager = document.querySelector('.orimia-admin-style-pager-v618')
    const target = Math.max(0, pager.getBoundingClientRect().top + scrollY - innerHeight + 100)
    scrollTo(0, target)
    window.__routeWrapperCallsV650.length = 0
    window.__navigationEventsV650.length = 0
  })

  const transitions = []
  for (const nextPage of [2, 3]) {
    const before = await page.evaluate(() => window.scrollY)
    const responsePromise = page.waitForResponse(response => {
      const url = new URL(response.url())
      return url.pathname === '/api/lien-style-admin-v618' && url.searchParams.get('page') === String(nextPage)
    })
    await root.locator(`[data-page-v618="${nextPage}"]`).evaluate(button => button.click())
    await responsePromise
    await page.waitForFunction(id => document.querySelector('.orimia-admin-style-card-v618')?.getAttribute('href')?.includes(id), `staff-${nextPage}-1`)
    await page.waitForFunction(() => document.querySelectorAll('[data-orimia-style-visibility-v625]').length === 15)
    await page.waitForTimeout(750)
    const after = await page.evaluate(() => window.scrollY)
    assert.ok(Math.abs(after - before) <= 3, `${label} page ${nextPage} moved scroll from ${before} to ${after}`)
    assert.equal(page.url(), initialUrl, `${label} pagination changed the URL`)
    transitions.push({ page: nextPage, before, after })
  }

  const manualTarget = await page.evaluate(() => {
    const maximum = document.documentElement.scrollHeight - innerHeight
    const target = Math.max(0, Math.min(maximum, Math.round(maximum * 0.58)))
    scrollTo(0, target)
    return target
  })
  await page.waitForTimeout(900)
  const settled = await page.evaluate(() => ({
    y: window.scrollY,
    wrappers: window.__routeWrapperCallsV650,
    navigationEvents: window.__navigationEventsV650,
    state: history.state,
  }))
  assert.ok(Math.abs(settled.y - manualTarget) <= 3, `${label} snapped from ${manualTarget} to ${settled.y}`)
  assert.deepEqual(settled.wrappers, [], `${label} invoked a history wrapper`)
  assert.deepEqual(settled.navigationEvents, [], `${label} emitted a Navigation API event`)
  assert.deepEqual(settled.state, { sentinel: 'keep-v650' })
  assert.equal(listRequests.length - requestStart, 3)
  assert.equal(documents.length, 1)
  assert.equal(await cards.count(), 15)
  assert.deepEqual(errors, [])
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))

  await page.screenshot({ path: path.join(output, `${label}-page-3.png`), fullPage: false })
  await context.close()
  return { label, viewport, columns: initial.columns, transitions, manualTarget, settled: settled.y }
}

try {
  const desktop = await verifyViewport({ width: 1680, height: 760 }, 'desktop', 5)
  const mobile = await verifyViewport({ width: 390, height: 844 }, 'mobile', 2)
  console.log(JSON.stringify({
    release: 'style-admin-local-pagination-v650',
    browserVerified: true,
    urlNavigationRemoved: true,
    viewports: [desktop, mobile],
  }, null, 2))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
