import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 20; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v578-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200
      && response.headers.get('x-lien-admin-sidebar-labels') === 'v578'
      && response.headers.get('x-lien-owner-billing-tab') === 'v577'
      && response.headers.get('x-lien-dealer-operations') === 'v576'
  ) break
  if (attempt === 20) assert.fail(`production readiness did not reach v578; last status ${response.status}`)
  await sleep(1500)
}

const layoutName = 'layout-runtime-v518-release1.navigation-loading-v536-release1.admin-sidebar-labels-v578.js'
const layoutResponse = await fetch(`${baseUrl}/_next/static/chunks/app/${layoutName}?smoke=${Date.now()}`, { cache:'no-store' })
assert.equal(layoutResponse.status, 200)
const layout = await layoutResponse.text()
assert.match(layout, /admin-sidebar-labels-v578/)
assert.match(layout, /予約・シフト・会計/)
assert.match(layout, /顧客・カルテ・配信/)
assert.match(layout, /メニュー・商品・在庫/)
assert.match(layout, /スタイル投稿/)
assert.match(layout, /経営・会計管理/)

process.env.TEST_BASE_URL = baseUrl
await import('./browser-regression.mjs')
