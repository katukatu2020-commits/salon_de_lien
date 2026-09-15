import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-admin-pagination-v647/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const client = fs.readFileSync(path.join(runtimeRoot, 'public', 'style-admin-controls-v618.js'), 'utf8')
const stylesheet = fs.readFileSync(path.join(runtimeRoot, 'public', 'style-admin-controls-v618.css'), 'utf8')
const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')
const listRequests = []
fs.mkdirSync(output, { recursive: true })

function posts(page) {
  return Array.from({ length: page < 3 ? 15 : 2 }, (_, index) => ({
    id: `staff-${page}-${index + 1}`,
    displayOrder: (page - 1) * 15 + index + 1,
    postKind: 'STORE',
    published: index % 3 !== 0,
    title: `Style ${page}-${index + 1}`,
    staffKey: 'staff-1',
    stylistName: 'Demo Stylist',
    gender: index % 2 ? '男性' : '女性',
    course: 'Cut',
    publishedAt: '2026-09-15T00:00:00.000Z',
    coverPhotoUrl: `/fixtures/style-${page}-${index + 1}.gif`,
    likeCount: index,
    commentCount: index + 1,
  }))
}

function payload(url) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1)
  return {
    release: 'style-admin-controls-v618',
    filters: {
      sort: url.searchParams.get('sort') || 'manual',
      staffKey: url.searchParams.get('staff') || '',
      course: url.searchParams.get('course') || '',
      gender: url.searchParams.get('gender') || '',
    },
    options: {
      staff: [{ key: 'staff-1', name: 'Demo Stylist', role: 'Stylist' }],
      courses: [{ value: 'Cut', label: 'Cut' }],
      genders: [],
    },
    posts: posts(page),
    page,
    pageSize: 15,
    totalCount: 32,
    totalPages: 3,
  }
}

function html() {
  return `<!doctype html><html lang="ja" data-orimia-ui-ready="v516"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style-admin-controls-v618.css"><style>
    *{box-sizing:border-box}body{margin:0;background:#fffaf7;color:#292522;font-family:sans-serif}.test-banner{height:260px;padding:32px;background:#f7eee9}main{max-width:1560px;margin:auto;padding:24px}img{background:#eee}
  </style></head><body><div class="test-banner"><h1>Style community</h1></div><main><section class="orimia-style-admin-v618" data-orimia-style-list-shell-v640="true"></section></main><script>
    window.__styleReadyEvents=[];window.addEventListener('orimia:style-list-state-v640',event=>window.__styleReadyEvents.push(event.detail));
    window.__styleScrollIntoViewCalls=[];const nativeScrollIntoView=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(options){window.__styleScrollIntoViewCalls.push({className:this.className,options});return nativeScrollIntoView.call(this,options)};
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
    }, 80)
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

try {
  const context = await browser.newContext({ viewport: { width: 1680, height: 760 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  const documents = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()) })
  page.on('request', request => { if (request.resourceType() === 'document') documents.push(request.url()) })

  await page.goto(base + '/admin/community', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.orimia-style-admin-v618')
  const cards = root.locator('.orimia-admin-style-card-v618')
  await cards.first().waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelectorAll('[data-orimia-style-visibility-v625]').length === 15)
  assert.equal(await cards.count(), 15)
  assert.equal(await root.locator('input[name="displayOrder"]').count(), 15)
  assert.equal(await root.locator('[data-orimia-style-delete-v625]').count(), 15)
  assert.match(await root.locator('.orimia-admin-style-result-v618').innerText(), /32件\s+1〜15件を表示/)

  const grid = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.orimia-admin-style-card-v618')]
    const rows = new Set(cards.map(card => Math.round(card.getBoundingClientRect().top)))
    const columns = getComputedStyle(document.querySelector('.orimia-admin-style-grid-v618')).gridTemplateColumns.trim().split(/\s+/).length
    return { columns, rows: rows.size }
  })
  assert.deepEqual(grid, { columns: 5, rows: 3 })

  const next = root.locator('[data-page-v618="2"]')
  await next.scrollIntoViewIfNeeded()
  await page.waitForTimeout(50)
  const beforePageChange = await page.evaluate(() => window.scrollY)
  await page.evaluate(() => { window.__styleScrollIntoViewCalls.length = 0 })
  const nextResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/lien-style-admin-v618' && url.searchParams.get('page') === '2'
  })
  await next.click()
  await nextResponse
  await page.waitForFunction(() => document.querySelector('.orimia-admin-style-card-v618')?.getAttribute('href')?.includes('staff-2-1'))
  await page.waitForTimeout(200)

  const afterPageChange = await page.evaluate(() => window.scrollY)
  const forcedScrollCalls = await page.evaluate(() => window.__styleScrollIntoViewCalls)
  assert.equal(new URL(page.url()).searchParams.get('page'), '2')
  assert.equal(await cards.count(), 15)
  assert.equal(forcedScrollCalls.length, 0, 'Pagination still calls scrollIntoView')
  assert.ok(Math.abs(afterPageChange - beforePageChange) <= 80, `Scroll changed from ${beforePageChange} to ${afterPageChange}`)

  const settledScroll = await page.evaluate(() => {
    const maximum = document.documentElement.scrollHeight - innerHeight
    const target = Math.max(0, maximum - 180)
    scrollTo(0, target)
    return target
  })
  await page.waitForTimeout(650)
  const afterManualScroll = await page.evaluate(() => window.scrollY)
  assert.ok(Math.abs(afterManualScroll - settledScroll) <= 3, `Page snapped from ${settledScroll} to ${afterManualScroll}`)
  assert.equal(listRequests.length, 2)
  assert.equal(documents.length, 1)
  assert.equal(await page.evaluate(() => window.__orimiaStyleAdminPaginationV647), true)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
  assert.deepEqual(errors, [])

  await page.screenshot({ path: path.join(output, 'staff-1680-page-2.png'), fullPage: false })
  console.log(JSON.stringify({
    release: 'style-admin-pagination-v647',
    browserVerified: true,
    cardsPerPage: 15,
    desktopGrid: grid,
    scroll: { beforePageChange, afterPageChange, settledScroll, afterManualScroll },
    documentRequests: documents.length,
  }, null, 2))
  await context.close()
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
