import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3180'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local fixture, never production')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-mobile-stability-v676/browser'
fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true })
const results = []
try {
  for (const width of [390, 360, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 })
    if (process.env.FULL_APP === '1') {
      const login = await context.request.post(base + '/api/auth/login', { form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' }, headers: { Origin: base } })
      assert.equal(login.status(), 200)
    }
    const page = await context.newPage()
    const posts = Array.from({ length: 30 }, (_, i) => ({ id: 'v676-fixture-' + i, displayOrder: i + 1, published: true, title: 'スタイル ' + (i + 1), stylistName: '確認スタッフ', coverPhotoUrl: '/demo/showcase/styles/style-01.png', likeCount: 1, commentCount: 2 }))
    let listRequests = 0
    let legacyRequests = 0
    const writes = []
    await page.route('**/api/lien-content-management*', async route => {
      if (route.request().method() === 'GET') {
        legacyRequests++
        await route.fulfill({ json: { posts: posts.slice(0, 10) } })
      } else {
        writes.push(route.request().postDataJSON())
        await route.fulfill({ json: { ok: true } })
      }
    })
    await page.route('**/api/lien-style-order-v634*', async route => {
      const data = route.request().postDataJSON()
      writes.push(data)
      const old = posts.findIndex(p => p.id === data.postId)
      const [moved] = posts.splice(old, 1)
      posts.splice(data.displayOrder - 1, 0, moved)
      posts.forEach((p, i) => { p.displayOrder = i + 1 })
      await route.fulfill({ json: { displayOrder: moved.displayOrder } })
    })
    await page.route('**/api/lien-style-admin-v618*', route => {
      listRequests++
      const url = new URL(route.request().url())
      const number = Number(url.searchParams.get('page') || 1)
      return route.fulfill({ json: { filters: { sort: 'manual', staffKey: '', course: '', gender: '' }, posts: posts.slice((number - 1) * 15, number * 15), page: number, pageSize: 15, totalCount: 30, totalPages: 2, options: { staff: [], courses: [] } } })
    })
    await page.goto(base + '/admin/community', { waitUntil: 'domcontentloaded' })
    const input = page.locator('input[name="displayOrder"]').first()
    await input.waitFor({ timeout: 30000 })
    await page.waitForTimeout(3000)
    await page.evaluate(() => {
      const list = document.querySelector('.orimia-style-admin-v618')
      window.v676Input = list.querySelector('input[name="displayOrder"]')
      window.v676Mutations = 0
      new MutationObserver(records => { window.v676Mutations += records.length }).observe(list, { childList: true, subtree: true })
    })
    await input.fill('12')
    const requestsBefore = listRequests
    await page.waitForTimeout(2500)
    const steady = await page.evaluate(() => {
      const input = document.querySelector('input[name="displayOrder"]')
      const field = getComputedStyle(input), label = getComputedStyle(input.parentElement)
      return { sameInput: input === window.v676Input, focused: input === document.activeElement, value: input.value, mutations: window.v676Mutations, outline: field.outlineStyle, shadow: field.boxShadow, border: field.borderTopWidth, labelShadow: label.boxShadow }
    })
    assert.equal(steady.sameInput, true, 'List was rebuilt during editing')
    assert.equal(steady.mutations, 0, 'Idle list must not rewrite its DOM')
    assert.equal(steady.focused, true)
    assert.equal(steady.value, '12')
    assert.equal(steady.outline, 'none')
    assert.equal(steady.shadow, 'none')
    assert.equal(steady.border, '0px')
    assert.notEqual(steady.labelShadow, 'none', 'Keyboard focus must remain visible')
    assert.equal(listRequests, requestsBefore)
    assert.equal(legacyRequests, 0, 'Legacy list should not fetch')
    await input.scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(output, `focus-${width}.png`) })
    await page.locator('.orimia-admin-style-order-form-v634').first().screenshot({ path: path.join(output, `focus-control-${width}.png`) })
    await input.press('Enter')
    await page.waitForFunction(() => document.querySelector('[data-orimia-style-post-id-v625="v676-fixture-0"] input')?.value === '12')
    assert.ok(writes.some(w => w.postId === 'v676-fixture-0' && w.displayOrder === 12))
    const card = page.locator('.orimia-admin-style-managed-card-v625').first()
    await card.locator('[data-orimia-style-visibility-v625]').click()
    await page.waitForFunction(() => document.querySelector('.orimia-admin-style-managed-card-v625').classList.contains('is-private-v625'))
    await card.locator('[data-orimia-style-delete-v625]').click()
    await page.locator('.orimia-style-delete-dialog-v625 [data-cancel-v625]').click()
    const next = page.locator('[data-page-v618="2"]')
    await next.click()
    await page.waitForFunction(() => document.querySelector('.orimia-style-admin-v618')?.dataset.orimiaStylePageV661 === '2')
    await page.locator('.orimia-admin-style-managed-card-v625').nth(5).scrollIntoViewIfNeeded()
    const y = await page.evaluate(() => { document.activeElement?.blur(); return scrollY })
    await page.waitForTimeout(1500)
    assert.ok(Math.abs(await page.evaluate(() => scrollY) - y) < 2, 'Page 2 scroll position changed')
    assert.equal(await page.locator('.orimia-admin-style-managed-card-v625').count(), 15)
    await page.screenshot({ path: path.join(output, `page-2-${width}.png`) })
    results.push({ width, steady, reorder: true, visibility: true, deleteDialog: true, page2Scroll: true, legacyRequests })
    await context.close()
  }
  // An old request finishing after the modern renderer mounts must not replace it.
  const context = await browser.newContext()
  const page = await context.newPage()
  const asset = await context.request.get(base + '/content-edit-delete-client-v615.js')
  assert.equal(asset.status(), 200)
  let release
  const waiting = new Promise(resolve => { release = resolve })
  let requested
  const started = new Promise(resolve => { requested = resolve })
  await page.route('**/api/lien-content-management*', async route => { requested(); await waiting; await route.fulfill({ json: { posts: [] } }) })
  await page.route('**/admin/community', route => route.fulfill({ contentType: 'text/html', body: '<html data-orimia-ui-ready="v516"><body><main><section><p>0件を表示</p></section></main></body></html>' }))
  await page.goto(base + '/admin/community')
  await page.addScriptTag({ content: await asset.text() })
  await started
  await page.evaluate(() => { window.__orimiaStyleAdminControlsV618 = true; document.querySelector('section').className = 'orimia-style-admin-v618'; document.querySelector('section').innerHTML = '<input value="draft"><p>0件を表示</p>' })
  release()
  await page.waitForTimeout(500)
  assert.equal(await page.locator('input').inputValue(), 'draft')
  await context.close()
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ results, lateLegacyResponseIgnored: true }, null, 2))
  console.log(JSON.stringify({ results, lateLegacyResponseIgnored: true }))
} finally { await browser.close() }
