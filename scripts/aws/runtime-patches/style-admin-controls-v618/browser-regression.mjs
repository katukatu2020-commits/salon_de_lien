import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3618').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-admin-controls-v618/browser'
const explicitPostId = String(process.env.STYLE_POST_ID || '').trim()
const expectedFixtureId = String(process.env.EXPECT_STYLE_POST_ID || '').trim()
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
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

async function verifyCustomerGenderCompatibility() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await customerLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(base + '/u/community?gender=' + encodeURIComponent(LEGACY_UNISEX) + '&verify=v618-customer-gender', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  const root = page.locator('.orimia-style-community-v610')
  await root.waitFor({ state: 'visible', timeout: 20_000 })
  await root.locator('.orimia-style-grid-v610,.orimia-style-empty-v610').waitFor({ state: 'visible' })
  assert.deepEqual(
    await root.locator('select[name="gender"] option').allTextContents(),
    ['\u3059\u3079\u3066', FEMALE, MALE, OTHER],
  )
  assert.equal(await visibleTextCount(page, LEGACY_UNISEX), 0, 'Legacy unisex label is visible')

  const response = await context.request.get(base + '/api/lien-style-community-v610?gender=' + encodeURIComponent(LEGACY_UNISEX))
  assert.ok(response.ok(), 'Customer gender compatibility API returned ' + response.status())
  const payload = await response.json()
  assert.equal(payload.filters.gender, OTHER)
  assert.ok(payload.posts.every(post => !post.gender || post.gender === OTHER), 'Customer API leaked a legacy gender')
  if (expectedFixtureId) {
    assert.ok(payload.posts.some(post => post.id === expectedFixtureId && post.gender === OTHER), 'Legacy fixture was not normalized for customers')
  }

  assert.deepEqual(unexpected(errors), [], 'Unexpected customer gender browser errors')
  await page.screenshot({ path: path.join(output, 'customer-gender-390.png'), fullPage: true })
  results.push({ scope: 'customer-gender-390', genderOptions: [FEMALE, MALE, OTHER], matchingCount: payload.totalCount })
  await context.close()
}

async function verifyList(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await staffLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(base + '/admin/community?age=30s&stylist=legacy&verify=v618-' + width, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  const root = page.locator('.orimia-style-admin-v618')
  await root.waitFor({ state: 'visible', timeout: 20_000 })
  await root.locator('.orimia-admin-style-grid-v618,.orimia-admin-style-empty-v618').waitFor({ state: 'visible' })

  assert.equal(await visibleTextCount(page, '年代'), 0, width + ': age filter is visible')
  assert.equal(await visibleTextCount(page, '並び順'), 1)
  assert.equal(await visibleTextCount(page, 'スタイリスト'), 1)
  assert.equal(await visibleTextCount(page, 'コース'), 1)
  assert.equal(await visibleTextCount(page, '性別'), 1)
  assert.equal(new URL(page.url()).searchParams.has('age'), false)
  assert.equal(new URL(page.url()).searchParams.has('stylist'), false)

  const staffSelect = root.locator('select[name="staff"]')
  const staffOptions = await staffSelect.locator('option').evaluateAll(options => options.map(option => ({
    value: option.value,
    label: option.textContent.trim(),
  })))
  assert.ok(staffOptions.length > 1, width + ': current staff options are empty')
  assert.ok(staffOptions.slice(1).every(option => option.value), width + ': staff option is not keyed')
  assert.deepEqual(
    await root.locator('select[name="gender"] option').allTextContents(),
    ['すべて', '女性', '男性', 'その他'],
  )

  let selected = null
  for (const option of staffOptions.slice(1)) {
    const response = await context.request.get(base + '/api/lien-style-admin-v618?staff=' + encodeURIComponent(option.value))
    assert.ok(response.ok(), 'Staff filter API returned ' + response.status())
    const payload = await response.json()
    if (payload.totalCount > 0) {
      selected = { option, payload }
      break
    }
  }
  assert.ok(selected, width + ': no current staff could be filtered')
  assert.ok(selected.payload.posts.every(post => post.stylistName.replace(/[\s　]/g, '') === selected.option.label.replace(/[\s　]/g, '')))
  if (expectedFixtureId) {
    const response = await context.request.get(base + '/api/lien-style-admin-v618?staff=amemiya&gender=' + encodeURIComponent('その他'))
    const payload = await response.json()
    assert.ok(payload.posts.some(post => post.id === expectedFixtureId), 'Unlinked imported style was not matched by current staff')
  }

  const filteredResponse = page.waitForResponse(response => (
    response.url().includes('/api/lien-style-admin-v618')
    && response.url().includes('staff=' + encodeURIComponent(selected.option.value))
    && response.status() === 200
  ))
  await staffSelect.selectOption(selected.option.value)
  await filteredResponse
  assert.equal(new URL(page.url()).searchParams.get('staff'), selected.option.value)

  const layout = await page.evaluate(() => {
    const rootNode = document.querySelector('.orimia-style-admin-v618')
    const filterGrid = document.querySelector('.orimia-admin-style-filters-v618')
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
  assert.ok(layout.documentWidth <= layout.viewport + 2, width + ': page has horizontal overflow')
  assert.ok(layout.rootLeft >= -1 && layout.rootRight <= layout.viewport + 1, width + ': list is outside viewport')
  assert.ok(layout.filterScrollWidth <= layout.filterWidth + 1, width + ': filters overflow')
  assert.deepEqual(unexpected(errors), [], width + ': unexpected browser errors')
  await page.screenshot({ path: path.join(output, 'admin-list-' + width + '.png'), fullPage: true })
  results.push({ scope: 'list-' + width, staffOptions: staffOptions.length - 1, filteredCount: selected.payload.totalCount, layout })
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
  assert.ok(postId, 'A store style post is required for the editor verification')

  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(base + '/admin/community/' + encodeURIComponent(postId) + '?verify=v618-editor', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  const edit = page.locator('[data-orimia-style-edit-v618="true"]')
  await edit.waitFor({ state: 'visible', timeout: 20_000 })
  assert.equal(await page.locator('[data-orimia-style-edit-v602],[data-orimia-style-edit-v610]').count(), 0)
  await edit.click()
  const dialog = page.locator('.orimia-style-dialog-v618')
  await dialog.waitFor({ state: 'visible' })

  const staff = dialog.locator('select[name="staffKey"]')
  assert.equal(await staff.getAttribute('required'), '')
  assert.ok(await staff.locator('option').count() > 1, 'Current staff dropdown is empty')
  assert.equal(await dialog.locator('input[name="stylistName"],input[name="stylistKana"],input[name="stylistRole"]').count(), 0)
  assert.equal(await visibleTextCount(page, 'ふりがな'), 0)
  assert.equal(await visibleTextCount(page, '役職'), 0)
  assert.equal(await page.getByText('取込元の担当者情報を使用', { exact: true }).count(), 0)
  assert.deepEqual(
    await dialog.locator('select[name="gender"] option').allTextContents(),
    ['未設定', '女性', '男性', 'その他'],
  )
  assert.equal(await dialog.locator('input[name="stylistPhoto"]').getAttribute('accept'), 'image/jpeg,image/png,image/webp')

  const layout = await dialog.evaluate(node => {
    const box = node.getBoundingClientRect()
    return {
      viewportWidth: document.documentElement.clientWidth,
      width: box.width,
      left: box.left,
      right: box.right,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    }
  })
  assert.ok(layout.left >= -1 && layout.right <= layout.viewportWidth + 1, 'Editor is outside viewport')
  assert.ok(layout.scrollWidth <= layout.clientWidth + 1, 'Editor has horizontal overflow')
  assert.deepEqual(unexpected(errors), [], 'Unexpected editor browser errors')
  await page.screenshot({ path: path.join(output, 'staff-editor.png'), fullPage: false })
  results.push({ scope: 'editor', postId, staffOptions: await staff.locator('option').count() - 1, layout })
  await context.close()
}

try {
  await verifyCustomerGenderCompatibility()
  await verifyList(390)
  await verifyList(1280)
  await verifyEditor()
  console.log(JSON.stringify({ release: 'v618', passed: true, results }, null, 2))
} finally {
  await browser.close()
}
