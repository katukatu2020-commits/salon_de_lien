import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3182').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const login = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(login.ok(), `Staff login returned ${login.status()}`)

  const orderedIds = Array.from({ length: 24 }, (_, index) => `order-regression-${index + 1}`)
  const page = await context.newPage()
  const errors = []
  const listRequests = []
  const styleAssetRequests = []
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/style-admin-controls-v618.js') styleAssetRequests.push(request.url())
  })
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })

  await page.route('**/api/lien-style-admin-v618**', async route => {
    const url = new URL(route.request().url())
    const requestedPage = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageNumber = Math.min(2, requestedPage)
    listRequests.push(pageNumber)
    const start = (pageNumber - 1) * 12
    const posts = orderedIds.slice(start, start + 12).map((id, index) => ({
      id,
      displayOrder: start + index + 1,
      postKind: 'STORE',
      published: true,
      title: `並べ替え確認 ${start + index + 1}`,
      staffKey: 'staff-1',
      stylistName: '確認スタッフ',
      gender: '女性',
      course: 'カット',
      publishedAt: '2026-09-25T00:00:00.000Z',
      coverPhotoUrl: '/brand/orimia-icon-192.png',
      likeCount: 0,
      commentCount: 0,
    }))
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        release: 'style-order-loading-recovery-v661-fixture',
        filters: {
          sort: url.searchParams.get('sort') || 'manual',
          staffKey: url.searchParams.get('staff') || '',
          course: url.searchParams.get('course') || '',
          gender: url.searchParams.get('gender') || '',
        },
        posts,
        options: {
          staff: [{ key: 'staff-1', name: '確認スタッフ' }],
          courses: [{ value: 'カット', label: 'カット' }],
        },
        page: pageNumber,
        pageSize: 12,
        totalCount: orderedIds.length,
        totalPages: 2,
      }),
    })
  })

  await page.route('**/api/lien-style-order-v634', async route => {
    const input = route.request().postDataJSON()
    const currentIndex = orderedIds.indexOf(String(input.postId))
    assert.ok(currentIndex >= 0)
    orderedIds.splice(currentIndex, 1)
    const targetIndex = Math.min(Math.max(0, Number(input.displayOrder) - 1), orderedIds.length)
    orderedIds.splice(targetIndex, 0, String(input.postId))
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        success: true,
        release: 'style-demo-ordering-v634',
        postId: String(input.postId),
        displayOrder: targetIndex + 1,
        totalCount: orderedIds.length,
      }),
    })
  })

  await page.goto(base + '/admin/community?verify=v661-order', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  const cards = page.locator('.orimia-admin-style-managed-card-v625')
  await cards.first().waitFor({ state: 'visible', timeout: 15_000 })
  assert.equal(await cards.count(), 12)
  assert.ok(styleAssetRequests.some(url => url.includes('v=661-order-recovery1')), 'The v661 style controls asset was not activated')

  const movedId = await cards.nth(1).getAttribute('data-orimia-style-post-id-v625')
  assert.equal(movedId, 'order-regression-2')
  await cards.nth(1).locator('input[name="displayOrder"]').fill('18')
  await cards.nth(1).locator('.orimia-admin-style-order-form-v634 button[type="submit"]').click()

  await page.waitForFunction(id => (
    new URLSearchParams(location.search).get('page') === '2'
    && document.querySelector(`[data-orimia-style-post-id-v625="${CSS.escape(id)}"] input[name="displayOrder"]`)?.value === '18'
  ), movedId, { timeout: 12_000 })
  assert.equal(listRequests.at(-1), 2)
  assert.equal(await page.locator('.orimia-admin-style-pager-v618 span').textContent(), '2 / 2')

  const movedCard = page.locator(`[data-orimia-style-post-id-v625="${movedId}"]`).first()
  await movedCard.locator('input[name="displayOrder"]').fill('2')
  await movedCard.locator('.orimia-admin-style-order-form-v634 button[type="submit"]').click()
  await page.waitForFunction(id => (
    !new URLSearchParams(location.search).has('page')
    && document.querySelectorAll('.orimia-admin-style-managed-card-v625')[1]?.dataset.orimiaStylePostIdV625 === id
  ), movedId, { timeout: 12_000 })
  assert.equal(listRequests.at(-1), 1)

  const unexpectedErrors = errors.filter(message => (
    !/Minified React error #(329|418|423)/.test(message)
    && !message.includes('status of 404')
  ))
  assert.deepEqual(unexpectedErrors, [])

  console.log(JSON.stringify({
    release: 'style-order-loading-recovery-v661',
    orderBrowserVerified: true,
    destinationPages: [2, 1],
    listRequests,
    styleAssetRequests,
  }, null, 2))
} finally {
  await browser.close()
}
