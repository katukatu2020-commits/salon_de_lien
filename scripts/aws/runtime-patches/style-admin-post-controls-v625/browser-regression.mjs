import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const here = path.dirname(fileURLToPath(import.meta.url))
const base = String(process.env.SMOKE_BASE_URL || '').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-admin-post-controls-v625/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const clientPath = path.join(here, 'style-admin-post-controls-v625.js')
const cssPath = path.join(here, 'style-admin-post-controls-v625.css')
const baseCssPath = path.resolve(here, '..', 'style-admin-controls-v618', 'style-admin-controls-v618.css')
const concatenatedClient = '(() => {})()\n' + fs.readFileSync(clientPath, 'utf8')
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = { synthetic: {}, live: [] }

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

function listHtml() {
  const card = (id, published, title) => '<a class="orimia-admin-style-card-v618" ' +
    'data-orimia-style-post-id-v625="' + id + '" data-orimia-style-published-v625="' + published + '" ' +
    'href="/admin/community/' + id + '" aria-label="' + title + 'の詳細を開く">' +
    '<span class="orimia-admin-style-image-v618"><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt=""></span>' +
    '<span class="orimia-admin-style-card-copy-v618"><strong>' + title + '</strong><small>雨宮 透</small></span></a>'
  return '<!doctype html><html data-orimia-ui-ready="v516"><head><meta charset="utf-8"></head><body>' +
    '<main><section class="orimia-style-admin-v618"><div data-orimia-style-content-v619>' +
    '<div class="orimia-admin-style-grid-v618">' + card('public-style', 'true', '公開中のスタイル') +
    card('private-style', 'false', '非公開のスタイル') + '</div></div></section></main>' +
    '<div id="orimia-ui-loader-v536" style="visibility:hidden;opacity:0"></div></body></html>'
}

function detailHtml() {
  return '<!doctype html><html data-orimia-ui-ready="v516"><head><meta charset="utf-8"></head><body>' +
    '<main><article class="orimia-style-detail-v602 orimia-style-detail-staff-v602">' +
    '<div class="community-feed-content"><div class="community-feed-meta"></div>' +
    '<section class="orimia-style-details-v602"><header><h2>ショートスタイル</h2></header></section></div></article></main>' +
    '<div id="orimia-ui-loader-v536" style="visibility:hidden;opacity:0"></div></body></html>'
}

async function installFetchMock(page) {
  await page.evaluate(() => {
    window.__v625Requests = []
    window.fetch = async (url, options = {}) => {
      const method = String(options.method || 'GET').toUpperCase()
      const body = options.body ? JSON.parse(String(options.body)) : null
      window.__v625Requests.push({ url: String(url), method, body })
      const payload = method === 'GET'
        ? { post: { id: 'detail-style', caption: '', published: true, canEdit: true, canDelete: true, canChangeVisibility: true }, comments: [] }
        : { success: true, ...(body?.action === 'visibility' ? { published: body.published } : { archived: true }) }
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
  })
}

async function verifySynthetic() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.route('http://v625.local/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: listHtml() }))
  await page.goto('http://v625.local/admin/community')
  await installFetchMock(page)
  await page.addStyleTag({ path: baseCssPath })
  await page.addStyleTag({ path: cssPath })
  await page.addScriptTag({ content: concatenatedClient })

  const wrappers = page.locator('.orimia-admin-style-managed-card-v625')
  await assert.doesNotReject(() => wrappers.nth(1).waitFor({ state: 'visible' }))
  assert.equal(await wrappers.count(), 2)
  assert.equal(await page.getByRole('button', { name: 'この投稿を非公開にする' }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'この投稿を公開する' }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'スタイル投稿を削除' }).count(), 2)
  await page.screenshot({ path: path.join(output, 'synthetic-list-mobile.png'), fullPage: true })

  const privateCard = page.locator('article.orimia-admin-style-managed-card-v625[data-orimia-style-post-id-v625="private-style"]')
  await privateCard.locator(':scope > a').click({ force: true })
  assert.equal(new URL(page.url()).pathname, '/admin/community', 'Private card opened its unavailable detail page')
  assert.equal(await page.locator('#orimia-ui-loader-v536').evaluate(node => getComputedStyle(node).visibility), 'hidden')

  const publicWrapper = page.locator('article.orimia-admin-style-managed-card-v625[data-orimia-style-post-id-v625="public-style"]')
  await publicWrapper.locator('[data-orimia-style-visibility-v625]').click()
  await publicWrapper.getByRole('button', { name: 'この投稿を公開する' }).waitFor()
  assert.equal(await publicWrapper.getAttribute('data-orimia-style-published-v625'), 'false')

  await privateCard.locator('[data-orimia-style-delete-v625]').click()
  const dialog = page.locator('.orimia-style-delete-dialog-v625')
  await dialog.waitFor({ state: 'visible' })
  const confirm = dialog.getByRole('button', { name: '削除する' })
  assert.equal(await confirm.isDisabled(), true)
  await dialog.getByRole('checkbox').check()
  assert.equal(await confirm.isEnabled(), true)
  await confirm.click()
  await dialog.waitFor({ state: 'detached' })
  await page.waitForFunction(() => window.__v625Requests.some(request => request.method === 'DELETE'))
  assert.equal(await privateCard.count(), 0)
  assert.equal(await page.locator('#orimia-ui-loader-v536').evaluate(node => getComputedStyle(node).visibility), 'hidden')
  assert.deepEqual(errors, [])

  const detail = await context.newPage()
  const detailErrors = collectErrors(detail)
  await detail.route('http://v625.local/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: detailHtml() }))
  await detail.goto('http://v625.local/admin/community/detail-style')
  await installFetchMock(detail)
  await detail.addStyleTag({ path: cssPath })
  await detail.addScriptTag({ content: concatenatedClient })
  const controls = detail.locator('.orimia-style-detail-controls-v625')
  await controls.waitFor({ state: 'visible' })
  assert.equal(await controls.getByRole('button', { name: '非公開にする' }).count(), 1)
  assert.equal(await controls.getByRole('button', { name: '投稿を削除' }).count(), 1)
  assert.deepEqual(detailErrors, [])
  await detail.screenshot({ path: path.join(output, 'synthetic-detail-mobile.png'), fullPage: true })

  results.synthetic = {
    listControls: 4,
    visibilityMutation: true,
    deletionConfirmation: true,
    detailControls: 2,
  }
  await context.close()
}

async function staffLogin(context) {
  const response = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(response.ok(), 'Staff login returned ' + response.status())
}

async function loaderState(page) {
  return page.evaluate(() => {
    const loader = document.getElementById('orimia-ui-loader-v536')
    return {
      ready: document.documentElement.dataset.orimiaUiReady || null,
      transition: document.documentElement.dataset.orimiaUiTransition || null,
      busy: document.documentElement.getAttribute('aria-busy'),
      visibility: loader ? getComputedStyle(loader).visibility : null,
    }
  })
}

async function assertNoFullLoader(page, label) {
  await page.waitForTimeout(240)
  const state = await loaderState(page)
  assert.equal(state.ready, 'v516', label + ': readiness was cleared')
  assert.equal(state.transition, null, label + ': navigation transition started')
  assert.equal(state.busy, null, label + ': document was marked busy')
  assert.equal(state.visibility, 'hidden', label + ': full-screen loader became visible')
}

async function verifyLiveViewport(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await staffLogin(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  const mutations = []
  await page.route('**/api/lien-content-management?audience=staff', async route => {
    if (route.request().method() === 'GET') return route.continue()
    const body = route.request().postDataJSON()
    mutations.push({ method: route.request().method(), body })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, ...(body?.action === 'visibility' ? { published: body.published } : { archived: true }) }),
    })
  })

  await page.goto(base + '/admin/community?verify=v625-' + width, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const root = page.locator('.orimia-style-admin-v618')
  await root.waitFor({ state: 'visible', timeout: 30_000 })
  const wrappers = root.locator('.orimia-admin-style-managed-card-v625')
  await wrappers.first().waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(700)

  const adminResponse = await context.request.get(base + '/api/lien-style-admin-v618')
  const admin = await adminResponse.json()
  const managementResponse = await context.request.get(base + '/api/lien-content-management?audience=staff&scope=posts')
  const management = await managementResponse.json()
  assert.ok(adminResponse.ok(), 'Admin style API returned ' + adminResponse.status())
  assert.ok(managementResponse.ok(), 'Content management API returned ' + managementResponse.status())
  assert.ok(admin.posts.length > 0, width + ': admin list is empty')
  assert.ok(admin.posts.every(post => typeof post.published === 'boolean'), width + ': publication state is missing')
  const privateManaged = management.posts.filter(post => !post.published && post.coverPhotoUrl)
  assert.ok(privateManaged.length > 0, width + ': private fixture is missing')
  assert.ok(privateManaged.some(post => admin.posts.some(item => item.id === post.id && !item.published)), width + ': private posts are excluded from admin list')
  assert.equal(await wrappers.count(), admin.posts.length, width + ': not every visible card received controls')
  assert.equal(await root.locator('[data-orimia-style-visibility-v625]').count(), admin.posts.length)
  assert.equal(await root.locator('[data-orimia-style-delete-v625]').count(), admin.posts.length)
  for (let check = 0; check < 4; check += 1) {
    await page.waitForTimeout(400)
    assert.equal(await wrappers.count(), admin.posts.length, width + ': controls disappeared after rerender')
    assert.equal(await root.locator('[data-orimia-style-visibility-v625]').count(), admin.posts.length)
    assert.equal(await root.locator('[data-orimia-style-delete-v625]').count(), admin.posts.length)
  }

  const layout = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth
    const wrappers = [...document.querySelectorAll('.orimia-style-admin-v618 .orimia-admin-style-managed-card-v625')]
    return {
      viewport,
      documentWidth: document.documentElement.scrollWidth,
      cards: wrappers.map(wrapper => {
        const box = wrapper.getBoundingClientRect()
        const actions = wrapper.querySelector('.orimia-admin-style-actions-v625')?.getBoundingClientRect()
        return { left: box.left, right: box.right, width: box.width, actionsLeft: actions?.left || 0, actionsRight: actions?.right || 0 }
      }),
    }
  })
  assert.ok(layout.documentWidth <= layout.viewport + 2, width + ': page has horizontal overflow')
  assert.ok(layout.cards.every(card => card.left >= -1 && card.right <= layout.viewport + 1 && card.actionsLeft >= card.left - 1 && card.actionsRight <= card.right + 1), width + ': controls overflow their cards')

  const first = wrappers.first()
  const originalPublished = await first.getAttribute('data-orimia-style-published-v625') === 'true'
  await first.locator('[data-orimia-style-visibility-v625]').click()
  await page.waitForFunction(({ published }) => {
    const card = document.querySelector('.orimia-style-admin-v618 .orimia-admin-style-managed-card-v625')
    return card?.dataset.orimiaStylePublishedV625 === (published ? 'true' : 'false')
  }, { published: !originalPublished })
  assert.equal(mutations[0]?.method, 'PATCH')
  assert.equal(mutations[0]?.body?.published, !originalPublished)
  await assertNoFullLoader(page, width + ' visibility toggle')

  await first.locator('[data-orimia-style-delete-v625]').click()
  const dialog = page.locator('.orimia-style-delete-dialog-v625')
  await dialog.waitFor({ state: 'visible' })
  assert.equal(await dialog.getByRole('button', { name: '削除する' }).isDisabled(), true)
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: '削除する' }).click()
  await page.waitForFunction(() => !document.querySelector('.orimia-style-delete-dialog-v625'))
  assert.equal(mutations.some(mutation => mutation.method === 'DELETE'), true)
  await assertNoFullLoader(page, width + ' delete')

  await wrappers.first().waitFor({ state: 'visible', timeout: 20_000 })
  await page.screenshot({ path: path.join(output, 'live-list-' + width + '.png'), fullPage: true })

  const publicPost = admin.posts.find(post => post.published)
  assert.ok(publicPost, width + ': public detail fixture is missing')
  await page.goto(base + '/admin/community/' + encodeURIComponent(publicPost.id) + '?verify=v625-detail-' + width, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const detailControls = page.locator('.orimia-style-detail-controls-v625')
  await detailControls.waitFor({ state: 'visible', timeout: 30_000 })
  assert.equal(await detailControls.getByRole('button', { name: '非公開にする' }).count(), 1)
  assert.equal(await detailControls.getByRole('button', { name: '投稿を削除' }).count(), 1)
  for (let check = 0; check < 4; check += 1) {
    await page.waitForTimeout(400)
    assert.equal(await detailControls.count(), 1, width + ': detail controls disappeared after rerender')
    assert.equal(await detailControls.isVisible(), true)
  }
  await page.screenshot({ path: path.join(output, 'live-detail-' + width + '.png'), fullPage: true })
  assert.deepEqual(errors, [], width + ': unexpected browser errors')

  results.live.push({ width, posts: admin.posts.length, privatePosts: privateManaged.length, layout, detailPostId: publicPost.id })
  await context.close()
}

try {
  await verifySynthetic()
  if (base) {
    await verifyLiveViewport(390)
    await verifyLiveViewport(1280)
  }
  console.log(JSON.stringify({ release: 'style-admin-post-controls-v625', browserVerified: true, liveVerified: Boolean(base), results }))
} finally {
  await browser.close()
}
