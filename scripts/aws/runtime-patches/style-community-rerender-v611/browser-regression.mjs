import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3610').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-community-rerender-v611/browser'
const explicitPostId = String(process.env.STYLE_POST_ID || '').trim()
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

async function customerLogin(context) {
  const response = await context.request.post(base + '/api/customer-auth/login', {
    headers: { Origin: base },
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/community' },
  })
  assert.ok(response.ok(), 'Customer login returned ' + response.status())
}

async function staffLogin(context) {
  const response = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(response.ok(), 'Staff login returned ' + response.status())
}

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push('console: ' + message.text())
  })
  return errors
}

function unexpected(errors) {
  return errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
    && !message.includes('Minified React error #329')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
    && !message.includes('net::ERR_NAME_NOT_RESOLVED')
  ))
}

async function visibleTextCount(page, textValue) {
  return page.getByText(textValue, { exact: true }).evaluateAll(nodes => nodes.filter(node => {
    const style = getComputedStyle(node)
    const box = node.getBoundingClientRect()
    return style.display !== 'none' && style.visibility !== 'hidden' && box.width > 0 && box.height > 0
  }).length)
}

async function assertNoHorizontalOverflow(page) {
  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    root: (() => {
      const node = document.querySelector('.orimia-style-community-v610')
      if (!node) return null
      const box = node.getBoundingClientRect()
      return { left: box.left, right: box.right, width: box.width }
    })(),
  }))
  assert.ok(layout.root, 'Enhanced community list was not rendered')
  assert.ok(layout.documentWidth <= layout.viewport + 2, 'Page has horizontal overflow')
  assert.ok(layout.root.left >= -1 && layout.root.right <= layout.viewport + 1, 'Community list is outside viewport')
  return layout
}

async function verifyCustomerList(viewport, name) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await customerLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(base + '/u/community?course=legacy-course&age=30s&verify=v610-' + name, { waitUntil: 'domcontentloaded' })
  await page.locator('.orimia-style-community-v610').waitFor({ state: 'visible' })
  await page.locator('.orimia-style-grid-v610,.orimia-style-empty-v610').waitFor({ state: 'visible' })

  assert.equal(await visibleTextCount(page, '年代'), 0, 'Age filter is still visible')
  assert.equal(await visibleTextCount(page, 'コース'), 0, 'Course filter is still visible')
  assert.equal(await visibleTextCount(page, '並び順'), 1)
  assert.equal(await visibleTextCount(page, 'スタイリスト'), 1)
  assert.equal(await visibleTextCount(page, '性別'), 1)
  assert.equal(await visibleTextCount(page, 'いいねした投稿のみ'), 1)

  const legacyFilters = page.locator('section.orimia-style-list-legacy-hidden-v610').filter({ hasText: '絞り込み・並び順' }).filter({ has: page.locator('select') })
  const legacyFilter = legacyFilters.first()
  assert.ok(await legacyFilter.count(), 'Legacy filter fixture was not found')
  await legacyFilter.evaluate(node => {
    node.classList.remove('orimia-style-list-legacy-hidden-v610')
    node.append(document.createElement('i'))
  })
  await page.waitForFunction(
    node => node.classList.contains('orimia-style-list-legacy-hidden-v610'),
    await legacyFilter.elementHandle(),
  )
  assert.equal(await visibleTextCount(page, '年代'), 0, 'Age filter returned after a legacy React rerender')
  assert.equal(await visibleTextCount(page, 'コース'), 0, 'Course filter returned after a legacy React rerender')

  const stylistOptions = await page.locator('.orimia-style-community-v610 select[name="stylist"] option').allTextContents()
  assert.ok(stylistOptions.length > 1, 'Stylist options were not populated')
  assert.equal(new Set(stylistOptions.map(value => value.replace(/\s/g, ''))).size, stylistOptions.length, 'Stylist options contain duplicates')

  const apiResponse = await context.request.get(base + '/api/lien-style-community-v610')
  assert.ok(apiResponse.ok(), 'Community controls API returned ' + apiResponse.status())
  const api = await apiResponse.json()
  assert.ok(Array.isArray(api.options.stylists) && api.options.stylists.length > 0, 'Stylist option union is empty')
  assert.ok(api.posts.every(post => typeof post.liked === 'boolean'), 'Per-customer liked state is missing')

  const likedResponse = page.waitForResponse(response => (
    response.url().includes('/api/lien-style-community-v610')
    && response.url().includes('liked=1')
    && response.status() === 200
  ))
  await page.locator('.orimia-style-community-v610 input[name="liked"]').check()
  await likedResponse
  assert.equal(new URL(page.url()).searchParams.get('liked'), '1', 'Liked-only state was not reflected in the URL')
  const likedApi = await context.request.get(base + '/api/lien-style-community-v610?liked=1')
  const likedPayload = await likedApi.json()
  assert.ok(likedPayload.posts.every(post => post.liked === true), 'Liked-only API returned an unliked post')

  const layout = await assertNoHorizontalOverflow(page)
  await page.screenshot({ path: path.join(output, 'customer-list-' + name + '.png'), fullPage: true })
  results.push({
    scope: 'customer-list-' + name,
    stylistOptions: stylistOptions.length - 1,
    likedOnlyCount: likedPayload.totalCount,
    layout,
    errors: unexpected(errors),
  })
  assert.deepEqual(unexpected(errors), [], 'Unexpected customer list browser errors')
  await context.close()
  return api.posts[0] && api.posts[0].id
}

async function verifyStaffEditor(postId) {
  if (!postId) return
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  await staffLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(base + '/admin/community/' + encodeURIComponent(postId) + '?verify=v610-editor', { waitUntil: 'domcontentloaded' })
  const edit = page.locator('[data-orimia-style-edit-v610="true"]')
  await edit.waitFor({ state: 'visible' })
  await edit.click()
  const dialog = page.locator('.orimia-style-dialog-v610')
  await dialog.waitFor({ state: 'visible' })
  await dialog.locator('select[name="gender"]').waitFor({ state: 'visible' })
  assert.equal(await dialog.locator('input[name="stylistPhoto"]').getAttribute('accept'), 'image/jpeg,image/png,image/webp')
  assert.equal(await visibleTextCount(page, 'スタイリスト写真'), 1)
  assert.equal(await dialog.locator('select[name="staffKey"] option').count() > 1, true, 'Staff editor options are empty')
  await page.screenshot({ path: path.join(output, 'staff-style-editor.png'), fullPage: false })
  results.push({
    scope: 'staff-editor',
    staffOptions: await dialog.locator('select[name="staffKey"] option').count() - 1,
    genderOptions: await dialog.locator('select[name="gender"] option').allTextContents(),
    errors: unexpected(errors),
  })
  assert.deepEqual(unexpected(errors), [], 'Unexpected staff editor browser errors')
  await context.close()
}

try {
  const discovered = await verifyCustomerList({ width: 390, height: 844 }, 'mobile')
  await verifyCustomerList({ width: 1280, height: 900 }, 'desktop')
  await verifyStaffEditor(explicitPostId || discovered)
  console.log(JSON.stringify({ release: 'v611', results }, null, 2))
} finally {
  await browser.close()
}
