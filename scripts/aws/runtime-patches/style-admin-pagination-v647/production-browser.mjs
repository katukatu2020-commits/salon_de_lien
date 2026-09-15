import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-admin-pagination-v647/production'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

function unexpected(messages) {
  return messages.filter(message => (
    !/Minified React error #(329|418|423)/.test(message)
    && !message.includes('status of 404')
    && !message.includes('net::ERR_NAME_NOT_RESOLVED')
  ))
}

const browser = await chromium.launch({ executablePath, headless: true })

try {
  const context = await browser.newContext({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 1 })
  const login = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(login.ok(), `Staff login returned ${login.status()}`)

  const page = await context.newPage()
  const errors = []
  const listRequests = []
  const documents = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()) })
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.pathname === '/api/lien-style-admin-v618') listRequests.push(url.pathname + url.search)
    if (request.resourceType() === 'document') documents.push(request.url())
  })
  await page.addInitScript(() => {
    window.__v647StyleEvents = []
    window.__v647ScrollCalls = []
    window.addEventListener('orimia:style-list-state-v640', event => window.__v647StyleEvents.push(event.detail))
    const nativeScrollIntoView = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function(options) {
      window.__v647ScrollCalls.push({ className: String(this.className || ''), options })
      return nativeScrollIntoView.call(this, options)
    }
  })

  const initialResponsePromise = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname === '/api/lien-style-admin-v618' && !url.searchParams.has('page') && response.status() === 200
  }, { timeout: 15_000 })
  await page.goto(base + '/admin/community?verify=v647', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const initialResponse = await initialResponsePromise
  const initialPayload = await initialResponse.json()
  const root = page.locator('.orimia-style-admin-v618')
  const cards = root.locator('.orimia-admin-style-card-v618')
  await cards.first().waitFor({ state: 'visible', timeout: 8_000 })
  await page.waitForFunction(() => window.__v647StyleEvents.some(event => event.state === 'ready'))
  await page.waitForTimeout(250)

  assert.equal(initialPayload.pageSize, 15)
  assert.equal(initialPayload.posts.length, Math.min(15, initialPayload.totalCount))
  assert.equal(await cards.count(), initialPayload.posts.length)
  assert.equal(await page.evaluate(() => window.__orimiaStyleAdminPaginationV647), true)
  assert.equal(await root.locator('[data-orimia-style-delete-v625]').count(), initialPayload.posts.length)
  assert.equal(await root.locator('input[name="displayOrder"]').count(), initialPayload.posts.length)
  assert.equal(documents.length, 1)

  const grid = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.orimia-admin-style-card-v618')]
    const rows = new Set(cards.map(card => Math.round(card.getBoundingClientRect().top)))
    const element = document.querySelector('.orimia-admin-style-grid-v618')
    const columns = element ? getComputedStyle(element).gridTemplateColumns.trim().split(/\s+/).length : 0
    return { columns, rows: rows.size, cardCount: cards.length }
  })
  assert.equal(grid.columns, 5)
  if (initialPayload.posts.length === 15) assert.equal(grid.rows, 3)

  if (initialPayload.totalPages > 1) {
    const next = root.locator('[data-page-v618="2"]')
    await next.scrollIntoViewIfNeeded()
    await page.waitForTimeout(50)
    const beforePageChange = await page.evaluate(() => window.scrollY)
    await page.evaluate(() => { window.__v647ScrollCalls.length = 0 })
    const pageTwoResponsePromise = page.waitForResponse(response => {
      const url = new URL(response.url())
      return url.pathname === '/api/lien-style-admin-v618' && url.searchParams.get('page') === '2' && response.status() === 200
    }, { timeout: 12_000 })
    await next.click()
    const pageTwoResponse = await pageTwoResponsePromise
    const pageTwoPayload = await pageTwoResponse.json()
    await page.waitForFunction(id => document.querySelector('.orimia-admin-style-card-v618')?.getAttribute('href')?.includes(id), pageTwoPayload.posts[0].id)
    await page.waitForTimeout(300)

    const afterPageChange = await page.evaluate(() => window.scrollY)
    const scrollCalls = await page.evaluate(() => window.__v647ScrollCalls)
    assert.equal(scrollCalls.length, 0, 'Pagination called scrollIntoView')
    assert.ok(Math.abs(afterPageChange - beforePageChange) <= 120, `Pagination moved scroll from ${beforePageChange} to ${afterPageChange}`)
    assert.equal(new URL(page.url()).searchParams.get('page'), '2')
    assert.equal(pageTwoPayload.pageSize, 15)
    assert.equal(await cards.count(), pageTwoPayload.posts.length)

    const settledScroll = await page.evaluate(() => {
      const target = Math.max(0, document.documentElement.scrollHeight - innerHeight - 180)
      scrollTo(0, target)
      return target
    })
    await page.waitForTimeout(700)
    const afterManualScroll = await page.evaluate(() => window.scrollY)
    assert.ok(Math.abs(afterManualScroll - settledScroll) <= 3, `Page snapped from ${settledScroll} to ${afterManualScroll}`)
  }

  assert.equal(listRequests.length, initialPayload.totalPages > 1 ? 2 : 1)
  assert.equal(documents.length, 1)
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
  assert.deepEqual(unexpected(errors), [])
  await page.screenshot({ path: path.join(output, 'staff-pagination.png'), fullPage: false })

  console.log(JSON.stringify({
    release: 'style-admin-pagination-v647',
    productionBrowserVerified: true,
    pageSize: initialPayload.pageSize,
    totalCount: initialPayload.totalCount,
    totalPages: initialPayload.totalPages,
    desktopGrid: grid,
    listRequests: listRequests.length,
    documentRequests: documents.length,
  }, null, 2))
  await context.close()
} finally {
  await browser.close()
}
