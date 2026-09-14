import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-list-performance-v640/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const publicRoot = path.join(runtimeRoot, 'public')
const customerClient = fs.readFileSync(path.join(publicRoot, 'style-community-controls-v610.js'), 'utf8')
const adminClient = fs.readFileSync(path.join(publicRoot, 'style-admin-controls-v618.js'), 'utf8')
const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')
const apiRequests = { customer: [], staff: [] }
fs.mkdirSync(output, { recursive: true })

function fixturePosts(audience, page) {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `${audience}-${page}-${index + 1}`,
    displayOrder: (page - 1) * 12 + index + 1,
    published: index % 4 !== 0,
    title: `Style ${index + 1}`,
    staffKey: 'staff-1',
    stylistName: 'Demo Stylist',
    gender: index % 2 ? '男性' : '女性',
    course: 'Cut',
    publishedAt: '2026-09-14T00:00:00.000Z',
    coverPhotoUrl: `/fixtures/style-${index + 1}.gif`,
    likeCount: index,
    commentCount: index + 1,
    liked: index % 2 === 0,
  }))
}

function listPayload(audience, url) {
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const sort = url.searchParams.get('sort') || 'manual'
  if (audience === 'customer') {
    return {
      release: 'style-community-controls-v610',
      filters: {
        sort,
        stylist: url.searchParams.get('stylist') || '',
        gender: url.searchParams.get('gender') || '',
        likedOnly: url.searchParams.get('liked') === '1',
      },
      options: { stylists: [{ value: 'Demo Stylist', label: 'Demo Stylist' }] },
      posts: fixturePosts(audience, page),
      page,
      pageSize: 12,
      totalCount: 29,
      totalPages: 3,
    }
  }
  return {
    release: 'style-admin-controls-v618',
    filters: {
      sort,
      staffKey: url.searchParams.get('staff') || '',
      course: url.searchParams.get('course') || '',
      gender: url.searchParams.get('gender') || '',
    },
    options: {
      staff: [{ key: 'staff-1', name: 'Demo Stylist', role: 'Stylist' }],
      courses: [{ value: 'Cut', label: 'Cut' }],
      genders: [],
    },
    posts: fixturePosts(audience, page),
    page,
    pageSize: 12,
    totalCount: 29,
    totalPages: 3,
  }
}

function html(audience) {
  const customer = audience === 'customer'
  const rootClass = customer ? 'orimia-style-community-v610' : 'orimia-style-admin-v618'
  const clientPath = customer ? '/style-community-controls-v610.js' : '/style-admin-controls-v618.js'
  return `<!doctype html><html lang="ja" data-orimia-ui-ready="v516"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    *{box-sizing:border-box}body{margin:0;font-family:sans-serif;color:#292522}main{max-width:1180px;margin:auto;padding:20px}.orimia-style-grid-v610,.orimia-admin-style-grid-v618{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:12px}img{display:block;width:100%;max-width:100%;height:180px;object-fit:cover}a{color:inherit}.orimia-admin-style-card-shell-v625{min-width:0}
  </style></head><body><main><h1>Style list</h1><section class="${rootClass}" data-orimia-style-list-shell-v640="true"></section></main><script>
    window.__styleListEventsV640=[];window.addEventListener('orimia:style-list-state-v640',event=>window.__styleListEventsV640.push(event.detail));
    const nativeFetchV640=window.fetch.bind(window);window.fetch=(input,options)=>{const url=String(input);if(!window.__styleShellReplacedV640&&url.includes('/api/lien-style-')){window.__styleShellReplacedV640=true;setTimeout(()=>{const root=document.querySelector('.${rootClass}');if(!root)return;const replacement=root.cloneNode(false);replacement.removeAttribute('data-orimia-style-list-mounted-v640');root.replaceWith(replacement)},0)}return nativeFetchV640(input,options)};
  </script><script src="${clientPath}"></script></body></html>`
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/style-community-controls-v610.js' || url.pathname === '/style-admin-controls-v618.js') {
    response.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' })
    response.end(url.pathname.includes('community') ? customerClient : adminClient)
    return
  }
  if (url.pathname.startsWith('/fixtures/')) {
    response.writeHead(200, { 'content-type': 'image/gif', 'content-length': pixel.length, 'cache-control': 'no-store' })
    response.end(pixel)
    return
  }
  if (url.pathname === '/api/lien-style-community-v610' || url.pathname === '/api/lien-style-admin-v618') {
    const audience = url.pathname.includes('community') ? 'customer' : 'staff'
    apiRequests[audience].push(url.pathname + url.search)
    const payload = listPayload(audience, url)
    setTimeout(() => {
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      response.end(JSON.stringify(payload))
    }, 40)
    return
  }
  const audience = url.pathname.startsWith('/u/') ? 'customer' : 'staff'
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
  response.end(html(audience))
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const address = server.address()
const base = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

async function verify(audience, width) {
  apiRequests[audience].length = 0
  const context = await browser.newContext({ viewport: { width, height: 850 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = []
  const documentRequests = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()) })
  page.on('request', request => { if (request.resourceType() === 'document') documentRequests.push(request.url()) })

  const pathname = audience === 'customer' ? '/u/community' : '/admin/community'
  const rootSelector = audience === 'customer' ? '.orimia-style-community-v610' : '.orimia-style-admin-v618'
  const cardSelector = audience === 'customer' ? '.orimia-style-card-v610' : '.orimia-admin-style-card-v618'
  const gridSelector = audience === 'customer' ? '.orimia-style-grid-v610' : '.orimia-admin-style-grid-v618'
  const startedAt = Date.now()
  await page.goto(base + pathname, { waitUntil: 'domcontentloaded', timeout: 10_000 })
  await page.locator(gridSelector).waitFor({ state: 'visible', timeout: 3_000 })
  const readyMs = Date.now() - startedAt
  await page.waitForTimeout(180)

  const root = page.locator(rootSelector)
  assert.equal(await page.locator(rootSelector).count(), 1, `${audience}/${width}: duplicate list roots`)
  assert.equal(await root.locator(cardSelector).count(), 12, `${audience}/${width}: list did not stay at 12 cards`)
  assert.equal(apiRequests[audience].length, 1, `${audience}/${width}: initial list API was not called exactly once`)
  assert.equal(await page.evaluate(() => window.__styleShellReplacedV640), true, `${audience}/${width}: hydration replacement fixture did not run`)
  assert.equal(documentRequests.length, 1, `${audience}/${width}: unexpected document navigation`)

  const imagePolicy = await root.locator(`${cardSelector} img`).evaluateAll(images => images.map(image => ({
    loading: image.getAttribute('loading') || '',
    priority: image.getAttribute('fetchpriority') || '',
  })))
  const eagerCount = audience === 'customer' ? 2 : 4
  assert.equal(imagePolicy.length, 12)
  assert.ok(imagePolicy.slice(0, eagerCount).every(image => image.priority === 'high' && image.loading === ''))
  assert.ok(imagePolicy.slice(eagerCount).every(image => image.priority === 'low' && image.loading === 'lazy'))

  if (audience === 'staff') {
    await page.waitForFunction(() => document.querySelectorAll('[data-orimia-style-visibility-v625]').length === 12)
    assert.equal(await root.locator('[data-orimia-style-delete-v625]').count(), 12, 'Delete controls disappeared')
    assert.equal(await root.locator('input[name="displayOrder"]').count(), 12, 'Order controls disappeared')
  } else {
    assert.equal(await root.locator('select').count(), 3, 'Customer filters disappeared')
    assert.equal(await root.locator('input[name="liked"]').count(), 1, 'Liked-only filter disappeared')
  }

  const initialEvents = await page.evaluate(() => window.__styleListEventsV640)
  assert.deepEqual(initialEvents, [{ audience, state: 'ready' }])
  await page.evaluate(() => { window.__v640DocumentMarker = 'same-document' })
  await root.locator('select[name="sort"]').selectOption('latest')
  await page.waitForFunction(() => window.__styleListEventsV640.length === 2)
  await page.waitForTimeout(180)
  assert.equal(apiRequests[audience].length, 2, `${audience}/${width}: filter caused duplicate API calls`)
  assert.match(apiRequests[audience][1], /sort=latest/)
  assert.equal(documentRequests.length, 1, `${audience}/${width}: filter caused a document navigation`)
  assert.equal(await page.evaluate(() => window.__v640DocumentMarker), 'same-document')
  assert.equal(await root.locator(cardSelector).count(), 12)

  const layout = await page.evaluate(selector => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    domNodes: document.querySelectorAll('*').length,
    listNodes: document.querySelector(selector)?.querySelectorAll('*').length || 0,
  }), rootSelector)
  assert.ok(layout.documentWidth <= layout.viewport + 1, `${audience}/${width}: horizontal overflow`)
  assert.ok(layout.listNodes < 500, `${audience}/${width}: list DOM is unexpectedly large`)
  assert.deepEqual(errors, [], `${audience}/${width}: unexpected browser errors`)
  await page.screenshot({ path: path.join(output, `${audience}-${width}.png`), fullPage: false })
  results.push({ audience, width, readyMs, apiCalls: apiRequests[audience].length, cards: 12, layout })
  await context.close()
}

try {
  for (const width of [390, 1440]) {
    await verify('staff', width)
    await verify('customer', width)
  }
  console.log(JSON.stringify({ release: 'style-list-performance-v640', browserVerified: true, results }, null, 2))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
