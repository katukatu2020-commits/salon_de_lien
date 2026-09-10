import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3618').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-admin-rerender-v619/browser'
const explicitPostId = String(process.env.STYLE_POST_ID || '').trim()
const expectedFixtureId = String(process.env.EXPECT_STYLE_POST_ID || '').trim()
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ALL = '\u3059\u3079\u3066'
const FEMALE = '\u5973\u6027'
const MALE = '\u7537\u6027'
const OTHER = '\u305d\u306e\u4ed6'
const LEGACY_UNISEX = '\u30e6\u30cb\u30bb\u30c3\u30af\u30b9'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

async function staffLogin(context) {
  const response = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(response.ok(), 'Staff login returned ' + response.status())
}

async function customerLogin(context) {
  const response = await context.request.post(base + '/api/customer-auth/login', {
    headers: { Origin: base },
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/community' },
  })
  assert.ok(response.ok(), 'Customer login returned ' + response.status())
}

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => {
    if (!error.message.includes('Minified React error #418') &&
        !error.message.includes('Minified React error #423') &&
        !error.message.includes('Minified React error #329')) errors.push('page: ' + error.message)
  })
  page.on('console', message => {
    if (message.type() === 'error' &&
        !message.text().includes('Failed to load resource: the server responded with a status of 404') &&
        !message.text().includes('net::ERR_NAME_NOT_RESOLVED')) errors.push('console: ' + message.text())
  })
  return errors
}

async function waitForStableAdminList(page, selectedStaff = '') {
  await page.waitForFunction(expected => {
    const root = document.querySelector('.orimia-style-admin-v618')
    const content = root?.firstElementChild
    const filters = root?.querySelector('.orimia-admin-style-filters-v618')
    const result = root?.querySelector('.orimia-admin-style-grid-v618,.orimia-admin-style-empty-v618')
    const staff = root?.querySelector('select[name="staff"]')
    const box = filters?.getBoundingClientRect()
    return Boolean(
      root && root.isConnected && content?.hasAttribute('data-orimia-style-content-v619') &&
      filters && result && root.querySelectorAll('select').length === 4 && box && box.width > 0 && box.height > 0 &&
      (!expected || staff?.value === expected)
    )
  }, selectedStaff, { timeout: 30_000, polling: 100 })

  for (let check = 0; check < 6; check += 1) {
    await page.waitForTimeout(500)
    const state = await page.evaluate(expected => {
      const root = document.querySelector('.orimia-style-admin-v618')
      const filters = root?.querySelector('.orimia-admin-style-filters-v618')
      const box = filters?.getBoundingClientRect()
      return {
        connected: Boolean(root?.isConnected),
        marked: Boolean(root?.firstElementChild?.hasAttribute('data-orimia-style-content-v619')),
        filterCount: root?.querySelectorAll('select').length || 0,
        filterWidth: box?.width || 0,
        selectedStaff: root?.querySelector('select[name="staff"]')?.value || '',
      }
    }, selectedStaff)
    assert.equal(state.connected, true, 'Enhanced list was detached')
    assert.equal(state.marked, true, 'Enhanced list was overwritten')
    assert.equal(state.filterCount, 4, 'Enhanced filters were overwritten')
    assert.ok(state.filterWidth > 0, 'Enhanced filters are hidden')
    if (selectedStaff) assert.equal(state.selectedStaff, selectedStaff, 'Selected staff was lost after rerender')
  }
}

async function verifyCustomerGender() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await customerLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(base + '/u/community?gender=' + encodeURIComponent(LEGACY_UNISEX) + '&verify=v619-customer-gender', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  const root = page.locator('.orimia-style-community-v610')
  await root.waitFor({ state: 'visible', timeout: 30_000 })
  await root.locator('.orimia-style-grid-v610,.orimia-style-empty-v610').waitFor({ state: 'visible', timeout: 30_000 })
  assert.deepEqual(await root.locator('select[name="gender"] option').allTextContents(), [ALL, FEMALE, MALE, OTHER])
  const response = await context.request.get(base + '/api/lien-style-community-v610?gender=' + encodeURIComponent(LEGACY_UNISEX))
  assert.ok(response.ok(), 'Customer gender API returned ' + response.status())
  const payload = await response.json()
  assert.equal(payload.filters.gender, OTHER)
  assert.ok(payload.posts.every(post => !post.gender || post.gender === OTHER), 'Legacy gender leaked to customers')
  if (expectedFixtureId) {
    assert.ok(payload.posts.some(post => post.id === expectedFixtureId && post.gender === OTHER), 'Legacy fixture was not normalized')
  }
  assert.deepEqual(errors, [], 'Unexpected customer browser errors')
  await page.screenshot({ path: path.join(output, 'customer-gender-390.png'), fullPage: true })
  results.push({ scope: 'customer-gender-390', matchingCount: payload.totalCount })
  await context.close()
}

async function verifyAdminList(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await staffLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(base + '/admin/community?age=30s&stylist=legacy&verify=v619-' + width, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  await waitForStableAdminList(page)
  const root = page.locator('.orimia-style-admin-v618')

  assert.equal(await root.locator('select[name="age"]').count(), 0)
  assert.equal(new URL(page.url()).searchParams.has('age'), false)
  assert.equal(new URL(page.url()).searchParams.has('stylist'), false)
  assert.deepEqual(await root.locator('select[name="gender"] option').allTextContents(), [ALL, FEMALE, MALE, OTHER])

  const staffOptions = await root.locator('select[name="staff"] option').evaluateAll(nodes => nodes.map(node => ({
    value: node.value,
    label: node.textContent.trim(),
  })).filter(option => option.value))
  assert.ok(staffOptions.length > 0, width + ': current staff options are empty')

  let selected = null
  for (const option of staffOptions) {
    const response = await context.request.get(base + '/api/lien-style-admin-v618?staff=' + encodeURIComponent(option.value))
    assert.ok(response.ok(), 'Staff filter API returned ' + response.status())
    const payload = await response.json()
    if (payload.totalCount > 0) {
      selected = { option, payload }
      break
    }
  }
  assert.ok(selected, width + ': no current staff has a filterable style')
  assert.ok(selected.payload.posts.every(post => (
    post.stylistName.replace(/[\s\u3000]/g, '') === selected.option.label.replace(/[\s\u3000]/g, '')
  )), width + ': staff filter returned a different stylist')
  if (expectedFixtureId) {
    const response = await context.request.get(base + '/api/lien-style-admin-v618?staff=amemiya&gender=' + encodeURIComponent(OTHER))
    const payload = await response.json()
    assert.ok(payload.posts.some(post => post.id === expectedFixtureId), 'Unlinked imported style was not matched')
  }

  const filtered = page.waitForResponse(response => (
    response.url().includes('/api/lien-style-admin-v618') &&
    response.url().includes('staff=' + encodeURIComponent(selected.option.value)) && response.status() === 200
  ))
  await root.locator('select[name="staff"]').selectOption(selected.option.value)
  await filtered
  await waitForStableAdminList(page, selected.option.value)

  const layout = await page.evaluate(() => {
    const rootNode = document.querySelector('.orimia-style-admin-v618')
    const filterGrid = rootNode?.querySelector('.orimia-admin-style-filters-v618')
    const rootBox = rootNode?.getBoundingClientRect()
    const filterBox = filterGrid?.getBoundingClientRect()
    return {
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      rootLeft: rootBox?.left || 0,
      rootRight: rootBox?.right || 0,
      filterWidth: filterBox?.width || 0,
      filterScrollWidth: filterGrid?.scrollWidth || 0,
    }
  })
  assert.ok(layout.filterWidth > 0, width + ': filter controls are detached')
  assert.ok(layout.documentWidth <= layout.viewport + 2, width + ': page has horizontal overflow')
  assert.ok(layout.rootLeft >= -1 && layout.rootRight <= layout.viewport + 1, width + ': list is outside viewport')
  assert.ok(layout.filterScrollWidth <= layout.filterWidth + 1, width + ': filters overflow')
  assert.deepEqual(errors, [], width + ': unexpected admin browser errors')
  await page.screenshot({ path: path.join(output, 'admin-list-' + width + '.png'), fullPage: true })
  results.push({ scope: 'admin-list-' + width, staffOptions: staffOptions.length, filteredCount: selected.payload.totalCount, layout })
  await context.close()
}

async function verifyEditor() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  await staffLogin(context)
  let postId = explicitPostId
  if (!postId) {
    const response = await context.request.get(base + '/api/lien-style-admin-v618')
    assert.ok(response.ok(), 'Admin style API returned ' + response.status())
    const payload = await response.json()
    postId = payload.posts.find(post => post.postKind === 'STORE')?.id || ''
  }
  assert.ok(postId, 'A store style post is required for editor verification')

  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(base + '/admin/community/' + encodeURIComponent(postId) + '?verify=v619-editor', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  const edit = page.locator('[data-orimia-style-edit-v618="true"]')
  await edit.waitFor({ state: 'visible', timeout: 30_000 })
  await edit.click()
  const dialog = page.locator('.orimia-style-dialog-v618')
  await dialog.waitFor({ state: 'visible', timeout: 20_000 })
  assert.equal(await dialog.locator('select[name="staffKey"] option').count() > 1, true, 'Current staff dropdown is empty')
  assert.equal(await dialog.locator('input[name="stylistName"],input[name="stylistKana"],input[name="stylistRole"]').count(), 0)
  assert.deepEqual(await dialog.locator('select[name="gender"] option').allTextContents(), ['\u672a\u8a2d\u5b9a', FEMALE, MALE, OTHER])
  const layout = await dialog.evaluate(node => {
    const box = node.getBoundingClientRect()
    return { viewport: document.documentElement.clientWidth, left: box.left, right: box.right, width: box.width, scrollWidth: node.scrollWidth, clientWidth: node.clientWidth }
  })
  assert.ok(layout.left >= -1 && layout.right <= layout.viewport + 1, 'Editor is outside viewport')
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1, 'Editor has horizontal overflow')
  assert.deepEqual(errors, [], 'Unexpected editor browser errors')
  await page.screenshot({ path: path.join(output, 'staff-editor.png'), fullPage: false })
  results.push({ scope: 'editor', postId, staffOptions: await dialog.locator('select[name="staffKey"] option').count() - 1, layout })
  await context.close()
}

try {
  await verifyCustomerGender()
  await verifyAdminList(390)
  await verifyAdminList(1280)
  await verifyEditor()
  console.log(JSON.stringify({ release: 'v619', passed: true, results }, null, 2))
} finally {
  await browser.close()
}
