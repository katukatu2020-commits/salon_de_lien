import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-list-performance-v640/production'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

function unexpected(messages) {
  return messages.filter(message => (
    !/Minified React error #(329|418|423)/.test(message)
    && !message.includes('status of 404')
    && !message.includes('net::ERR_NAME_NOT_RESOLVED')
  ))
}

async function login(context, audience) {
  const customer = audience === 'customer'
  const response = await context.request.post(base + (customer ? '/api/customer-auth/login' : '/api/auth/login'), {
    headers: { Origin: base },
    form: customer
      ? { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/community' }
      : { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(response.ok(), `${audience}: login returned ${response.status()}`)
}

async function verify(audience, width) {
  const customer = audience === 'customer'
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await login(context, audience)
  const page = await context.newPage()
  const errors = []
  const listRequests = []
  const oldPostScopeRequests = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()) })
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname === (customer ? '/api/lien-style-community-v610' : '/api/lien-style-admin-v618')) {
      listRequests.push(url.pathname + url.search)
    }
    if (url.pathname === '/api/lien-content-management' && url.searchParams.get('scope') === 'posts') {
      oldPostScopeRequests.push(url.pathname + url.search)
    }
  })
  await page.addInitScript(() => {
    window.__styleListEventsV640 = []
    window.addEventListener('orimia:style-list-state-v640', event => {
      window.__styleListEventsV640.push({ ...event.detail, at: performance.now() })
    })
  })

  const pathname = customer ? '/u/community' : '/admin/community'
  const apiPath = customer ? '/api/lien-style-community-v610' : '/api/lien-style-admin-v618'
  const rootSelector = customer ? '.orimia-style-community-v610' : '.orimia-style-admin-v618'
  const cardSelector = customer ? '.orimia-style-card-v610' : '.orimia-admin-style-card-v618'
  const readySelector = customer
    ? '.orimia-style-grid-v610,.orimia-style-empty-v610,.orimia-style-list-error-v610'
    : '.orimia-admin-style-grid-v618,.orimia-admin-style-empty-v618,.orimia-admin-style-error-v618'
  const startedAt = Date.now()
  const firstResponsePromise = page.waitForResponse(response => new URL(response.url()).pathname === apiPath && response.status() === 200, { timeout: 15_000 })
  await page.goto(`${base}${pathname}?verify=v640-${audience}-${width}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const firstResponse = await firstResponsePromise
  const payload = await firstResponse.json()
  await page.locator(readySelector).first().waitFor({ state: 'visible', timeout: 8_000 })
  await page.waitForFunction(() => window.__styleListEventsV640.some(event => event.state === 'ready'), null, { timeout: 8_000 })
  const readyMs = Date.now() - startedAt
  await page.waitForTimeout(300)

  const root = page.locator(rootSelector)
  const cards = root.locator(cardSelector)
  assert.ok(readyMs < 5_000, `${audience}/${width}: style list took ${readyMs}ms to become usable`)
  assert.equal(payload.pageSize, 12, `${audience}/${width}: API page size is not 12`)
  assert.ok(payload.posts.length > 0 && payload.posts.length <= 12, `${audience}/${width}: unexpected post count`)
  assert.equal(await page.locator(rootSelector).count(), 1, `${audience}/${width}: duplicate list roots`)
  assert.equal(await cards.count(), payload.posts.length, `${audience}/${width}: rendered/API post mismatch`)
  assert.equal(listRequests.length, 1, `${audience}/${width}: initial list API was called ${listRequests.length} times`)
  assert.deepEqual(oldPostScopeRequests, [], `${audience}/${width}: hidden legacy post API still ran`)

  const imagePolicy = await root.locator(`${cardSelector} img`).evaluateAll(images => images.map(image => ({
    loading: image.getAttribute('loading') || '',
    priority: image.getAttribute('fetchpriority') || '',
    src: image.getAttribute('src') || '',
  })))
  const eagerCount = Math.min(customer ? 2 : 4, imagePolicy.length)
  assert.ok(imagePolicy.slice(0, eagerCount).every(image => image.priority === 'high' && image.loading === ''))
  assert.ok(imagePolicy.slice(eagerCount).every(image => image.priority === 'low' && image.loading === 'lazy'))

  if (customer) {
    assert.equal(await root.locator('input[name="liked"]').count(), 1, 'Liked-only filter disappeared')
    assert.equal(await root.locator('select[name="stylist"]').count(), 1, 'Stylist filter disappeared')
  } else {
    await page.waitForFunction(count => document.querySelectorAll('[data-orimia-style-visibility-v625]').length === count, payload.posts.length)
    assert.equal(await root.locator('[data-orimia-style-delete-v625]').count(), payload.posts.length, 'Delete controls disappeared')
    assert.equal(await root.locator('input[name="displayOrder"]').count(), payload.posts.length, 'Order controls disappeared')
  }

  const optimizedUrl = payload.posts.map(post => String(post.coverPhotoUrl || '')).find(url => (
    url.startsWith('/generated/style-thumbnails-v640/')
    || url.startsWith('/api/lien-style-thumbnail-v640?')
    || url.startsWith('/_next/image?')
  ))
  assert.ok(optimizedUrl, `${audience}/${width}: no optimized list image was returned`)
  const imageResponse = await context.request.get(new URL(optimizedUrl, base).href, {
    headers: { Accept: 'image/avif,image/webp,image/*,*/*;q=0.8' },
  })
  assert.ok(imageResponse.ok(), `${audience}/${width}: optimized image returned ${imageResponse.status()}`)
  const imageBytes = (await imageResponse.body()).length
  assert.ok(imageBytes > 0 && imageBytes < 350_000, `${audience}/${width}: optimized image is ${imageBytes} bytes`)

  const state = await page.evaluate(selector => {
    const loader = document.getElementById('orimia-ui-loader-v536')
    return {
      scope: document.documentElement.dataset.orimiaNavigationLoaderScope || null,
      ready: document.documentElement.dataset.orimiaUiReady || null,
      busy: document.documentElement.getAttribute('aria-busy'),
      loaderVisibility: loader ? getComputedStyle(loader).visibility : null,
      domNodes: document.querySelectorAll('*').length,
      listNodes: document.querySelector(selector)?.querySelectorAll('*').length || 0,
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      events: window.__styleListEventsV640,
    }
  }, rootSelector)
  assert.equal(state.ready, 'v516', `${audience}/${width}: document is not ready`)
  assert.equal(state.busy, null, `${audience}/${width}: document remains busy`)
  if (state.scope !== null) assert.equal(state.scope, 'v640', `${audience}/${width}: old navigation runtime is active`)
  if (state.loaderVisibility !== null) {
    assert.equal(state.loaderVisibility, 'hidden', `${audience}/${width}: loader remains visible`)
  }
  assert.ok(state.documentWidth <= state.viewport + 2, `${audience}/${width}: horizontal overflow`)
  assert.ok(state.domNodes < 2_000, `${audience}/${width}: page DOM remains too large (${state.domNodes})`)
  assert.ok(state.listNodes < 900, `${audience}/${width}: list DOM remains too large (${state.listNodes})`)

  await page.evaluate(() => { window.__v640SameDocument = 'preserved' })
  const sort = root.locator('select[name="sort"]')
  const currentSort = await sort.inputValue()
  const nextSort = currentSort === 'latest' ? 'likes' : 'latest'
  const filteredResponsePromise = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === apiPath && url.searchParams.get('sort') === nextSort && response.status() === 200
  }, { timeout: 10_000 })
  await sort.selectOption(nextSort)
  const loaderDuringFilter = await page.evaluate(() => {
    const loader = document.getElementById('orimia-ui-loader-v536')
    return loader ? getComputedStyle(loader).visibility : null
  })
  if (loaderDuringFilter !== null) assert.equal(loaderDuringFilter, 'hidden', `${audience}/${width}: filter opened the full-page loader`)
  const filteredResponse = await filteredResponsePromise
  const filteredPayload = await filteredResponse.json()
  await page.waitForFunction(expected => window.__styleListEventsV640.filter(event => event.state === 'ready').length >= expected, 2)
  await page.waitForTimeout(250)
  assert.equal(listRequests.length, 2, `${audience}/${width}: filter generated duplicate list requests`)
  assert.equal(await page.evaluate(() => window.__v640SameDocument), 'preserved', `${audience}/${width}: filter navigated away`)
  assert.equal(new URL(page.url()).searchParams.get('sort'), nextSort)
  assert.equal(filteredPayload.pageSize, 12)
  assert.ok(await cards.count() <= 12)
  assert.deepEqual(unexpected(errors), [], `${audience}/${width}: unexpected browser errors`)

  await page.screenshot({ path: path.join(output, `${audience}-${width}.png`), fullPage: false })
  results.push({ audience, width, readyMs, initialApiCalls: 1, cards: payload.posts.length, domNodes: state.domNodes, imageBytes })
  await context.close()
}

try {
  for (const width of [390, 1440]) {
    await verify('staff', width)
    await verify('customer', width)
  }
  console.log(JSON.stringify({ release: 'style-list-performance-v640', productionBrowserVerified: true, results }, null, 2))
} finally {
  await browser.close()
}
