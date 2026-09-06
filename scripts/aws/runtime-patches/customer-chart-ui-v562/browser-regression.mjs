import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3125').replace(/\/$/, '')
const useRealData = process.env.VERIFY_REAL_DATA === '1'
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
const artifactDirectory = path.resolve('.artifacts', 'customer-chart-ui-v562')
fs.mkdirSync(artifactDirectory, { recursive:true })

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const ownerCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(ownerCookie, /^lien_admin_session=/)

const ledgerResponse = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2025-01-01&to=2027-12-31`, { headers:{ Cookie:ownerCookie } })
assert.equal(ledgerResponse.status, 200)
const ledger = await ledgerResponse.json()
const customerIds = [...new Set(ledger.rows.map(row => row.customerId).filter(Boolean))]
assert.ok(customerIds.length > 0)

let customerId = customerIds[0]
if (useRealData) {
  for (const candidate of customerIds.slice(0, 100)) {
    const response = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(candidate)}/chart-photos?limit=1`, { headers:{ Cookie:ownerCookie } })
    if (!response.ok) continue
    const data = await response.json()
    if (Number(data.count || 0) > 0) { customerId = candidate; break }
  }
}

const sampleDocument = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#f5f2ea"/><rect x="45" y="45" width="1110" height="670" rx="10" fill="#fffef9" stroke="#8f8178" stroke-width="4"/><text x="80" y="105" font-family="sans-serif" font-size="32" fill="#473b35">CUSTOMER RECORD</text><path d="M80 140H1120M80 210H1120M80 280H1120M80 350H1120M80 420H1120M80 490H1120M80 560H1120M80 630H1120M340 140V680M700 140V680" fill="none" stroke="#c8bbb2" stroke-width="3"/><path d="M110 185c80-25 130 20 190-4M390 255c95-40 160 32 250-10M745 325c110-38 220 35 330-8M120 455c120-45 185 34 300-12" fill="none" stroke="#5d514b" stroke-width="7" stroke-linecap="round"/></svg>`)}`
const mockItems = Array.from({ length:4 }, (_, index) => ({
  id:`chart-${index + 1}`,
  url:sampleDocument,
  uploadedByName:index === 0 ? '谷崎 太二' : '店舗スタッフ',
  createdAt:new Date(Date.UTC(2026, 8, 6 - index, 9, 23)).toISOString(),
}))

const browser = await chromium.launch({ headless:true, ...(executablePath ? { executablePath } : {}) })
try {
  for (const [name, viewport] of [['desktop', { width:1440, height:1000 }], ['mobile', { width:390, height:844 }]]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
    await context.addCookies([{ name:ownerCookie.split('=')[0], value:ownerCookie.slice(ownerCookie.indexOf('=') + 1), url:baseUrl }])
    const page = await context.newPage()
    if (!useRealData) {
      await page.route('**/api/admin/customers/*/chart-photos?*', async route => {
        const url = new URL(route.request().url())
        const limit = Math.max(1, Number(url.searchParams.get('limit') || 1))
        const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
        await route.fulfill({
          status:200,
          contentType:'application/json',
          body:JSON.stringify({ ok:true, count:mockItems.length, limit, offset, items:mockItems.slice(offset, offset + limit) }),
        })
      })
    }
    await page.goto(`${baseUrl}/admin/customers/${encodeURIComponent(customerId)}?verify=v562-${name}`, { waitUntil:'domcontentloaded' })
    await page.waitForFunction(() => window.__lienCustomerChartUiV562 === true)
    const card = page.locator('[data-chart-latest-card-v561]')
    await card.waitFor({ state:'visible' })
    await card.locator('.lien-chart-media, .lien-chart-empty').waitFor({ state:'visible' })
    assert.equal(await card.locator('.lien-chart-card-header').count(), 1)
    assert.equal(await card.getByText('店舗内限定', { exact:true }).count(), 1)
    assert.equal(await card.getByText('最新のカルテ', { exact:true }).count(), 1)
    assert.match(await card.locator('[data-chart-history] span').textContent(), /履歴を見る（\d+件）/)
    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth)
    assert.ok(overflow <= 1, `${name}: page overflowed by ${overflow}px`)
    if (name === 'desktop') {
      const columns = await card.locator('.lien-chart-image-shell').evaluate(node => getComputedStyle(node).gridTemplateColumns)
      assert.notEqual(columns, 'none')
      assert.ok(columns.split(' ').length >= 2, `desktop columns were ${columns}`)
    } else {
      const imageWidth = await card.locator('.lien-chart-image-shell').evaluate(node => node.getBoundingClientRect().width)
      assert.ok(imageWidth <= viewport.width, `mobile chart width was ${imageWidth}`)
    }
    await card.scrollIntoViewIfNeeded()
    await page.screenshot({ path:path.join(artifactDirectory, `latest-${name}.png`), fullPage:false })

    await card.locator('[data-chart-history]').click()
    const history = page.locator('[data-chart-history-page-v561]')
    await history.waitFor({ state:'visible' })
    assert.equal(await history.getByRole('heading', { name:'カルテ写真履歴' }).count(), 1)
    await page.screenshot({ path:path.join(artifactDirectory, `history-${name}.png`), fullPage:false })
    await context.close()
  }

  console.log(JSON.stringify({
    release:'customer-chart-ui-v562',
    desktopLatest:true,
    mobileLatest:true,
    responsiveHistory:true,
    realData:useRealData,
    artifacts:artifactDirectory,
  }))
} finally {
  await browser.close()
}
