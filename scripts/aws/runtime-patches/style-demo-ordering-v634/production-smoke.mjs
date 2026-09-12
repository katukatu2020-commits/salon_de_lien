import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-demo-ordering-v634/production'
const executablePath = process.env.CHROME_PATH || '/usr/bin/google-chrome'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const readiness = await context.request.get(base + '/api/health/ready')
  assert.equal(readiness.status(), 200)
  assert.equal(readiness.headers()['x-lien-style-demo-ordering'], 'v634')
  assert.equal(readiness.headers()['x-lien-customer-registration-name-fields'], 'v633')

  const adminAsset = await context.request.get(base + '/style-admin-controls-v618.js?v=634-order1')
  assert.equal(adminAsset.status(), 200)
  const adminSource = await adminAsset.text()
  assert.match(adminSource, /api\/lien-style-order-v634/)
  assert.match(adminSource, /orimia-admin-style-order-form-v634/)

  const customerAsset = await context.request.get(base + '/style-community-controls-v610.js?v=634-order1')
  assert.equal(customerAsset.status(), 200)
  assert.match(await customerAsset.text(), /\['manual', 'おすすめ順'\]/)

  const login = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(login.ok(), `Staff login returned ${login.status()}`)

  const listResponse = await context.request.get(base + '/api/lien-style-admin-v618')
  assert.equal(listResponse.status(), 200)
  const list = await listResponse.json()
  assert.equal(list.filters.sort, 'manual')
  assert.ok(list.totalCount > 0, 'Demo salon has no style posts')
  const displayOrders = list.posts.map(post => Number(post.displayOrder))
  assert.ok(displayOrders.every((order, index) => Number.isInteger(order) && order > 0 && (!index || order > displayOrders[index - 1])), 'The first style page is not ordered by No')

  const summaryResponse = await context.request.get(base + '/api/lien-style-order-v634')
  assert.equal(summaryResponse.status(), 200)
  const summary = await summaryResponse.json()
  assert.equal(summary.release, 'style-demo-ordering-v634')
  assert.equal(summary.targetOrganization, true, 'The verification account is not linked to Salon de Lien')
  assert.equal(summary.orderedCount, summary.postCount)
  assert.equal(summary.duplicateCount, 0)
  assert.equal(summary.minimumOrder, summary.postCount ? 1 : 0)
  assert.equal(summary.maximumOrder, summary.postCount)
  assert.equal(summary.zeroLikeCount, 0)
  assert.equal(summary.zeroCommentCount, 0)
  assert.ok(summary.demoCommentCount > 0, 'Salon de Lien demo comments were not stored')

  const page = await context.newPage()
  await page.goto(base + '/admin/community?verify=v634', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const root = page.locator('.orimia-style-admin-v618')
  await root.locator('.orimia-admin-style-managed-card-v625').first().waitFor({ state: 'visible', timeout: 20_000 })
  assert.equal(await root.locator('select[name="sort"]').inputValue(), 'manual')
  assert.ok(await root.locator('.orimia-admin-style-order-form-v634').count() > 0)
  assert.ok(await root.locator('.orimia-admin-style-order-badge-v634').count() > 0)
  await page.screenshot({ path: path.join(output, 'admin-style-order-390.png'), fullPage: true })

  console.log(JSON.stringify({
    release: 'style-demo-ordering-v634',
    productionVerified: true,
    posts: summary.postCount,
    demoComments: summary.demoCommentCount,
  }))
} finally {
  await browser.close()
}
