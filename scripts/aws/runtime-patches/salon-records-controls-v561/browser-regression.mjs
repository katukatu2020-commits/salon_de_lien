import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3124').replace(/\/$/, '')
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
const artifactDirectory = path.resolve('.artifacts', 'salon-records-controls-v561')
fs.mkdirSync(artifactDirectory, { recursive:true })

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics?salesLedger=1' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const ownerCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(ownerCookie, /^lien_admin_session=/)
const ledgerResponse = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2025-01-01&to=2027-12-31`, { headers:{ Cookie:ownerCookie } })
assert.equal(ledgerResponse.status, 200)
const ledger = await ledgerResponse.json()
const customerId = ledger.rows.find(row => row.customerId)?.customerId
assert.ok(customerId)

const switchResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  method:'POST',
  headers:{ Cookie:ownerCookie, Origin:baseUrl },
})
assert.equal(switchResponse.status, 200)
const sharedCookie = (switchResponse.headers.get('set-cookie') || '').split(';')[0]

const browser = await chromium.launch({ headless:true, ...(executablePath ? { executablePath } : {}) })
try {
  for (const [name, viewport] of [['desktop', { width:1440, height:1000 }], ['mobile', { width:390, height:844 }]]) {
    const context = await browser.newContext({ viewport })
    await context.addCookies([{ name:ownerCookie.split('=')[0], value:ownerCookie.slice(ownerCookie.indexOf('=') + 1), url:baseUrl }])
    const page = await context.newPage()
    await page.goto(`${baseUrl}/admin/customers/${encodeURIComponent(customerId)}?verify=v561-${name}`, { waitUntil:'domcontentloaded' })
    await page.waitForFunction(() => window.__lienCustomerChartPhotosV561 === true)
    const card = page.locator('[data-chart-latest-card-v561]')
    await card.waitFor({ state:'visible' })
    assert.equal(await card.getByText('店舗アカウントだけが閲覧できます', { exact:true }).count(), 1)
    await card.scrollIntoViewIfNeeded()
    await page.screenshot({ path:path.join(artifactDirectory, `customer-chart-${name}.png`), fullPage:false })
    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth)
    assert.ok(overflow <= 1, `${name}: chart page overflowed by ${overflow}px`)
    await card.locator('[data-chart-history]').click()
    try {
      await page.locator('[data-chart-history-page-v561]').waitFor({ state:'visible', timeout:10000 })
    } catch (error) {
      console.error(JSON.stringify({
        name,
        url:page.url(),
        latestCards:await page.locator('[data-chart-latest-card-v561]').count(),
        historyPages:await page.locator('[data-chart-history-page-v561]').count(),
        mainChildren:await page.locator('main > *').count(),
      }))
      throw error
    }
    assert.match(page.url(), /chart=history/)
    await page.screenshot({ path:path.join(artifactDirectory, `customer-chart-history-${name}.png`), fullPage:false })
    await page.locator('[data-chart-back]').click()
    await card.waitFor({ state:'visible' })
    await context.close()
  }

  const ownerContext = await browser.newContext({ viewport:{ width:1440, height:1000 } })
  await ownerContext.addCookies([{ name:ownerCookie.split('=')[0], value:ownerCookie.slice(ownerCookie.indexOf('=') + 1), url:baseUrl }])
  const ledgerPage = await ownerContext.newPage()
  await ledgerPage.goto(`${baseUrl}/admin/owner-analytics?salesLedger=1&verify=v561`, { waitUntil:'domcontentloaded' })
  await ledgerPage.locator('.sl-page').waitFor({ state:'visible' })
  await ledgerPage.locator('[data-sl-month]').evaluate(input => {
    input.value = '2026-08'
    input.dispatchEvent(new Event('change', { bubbles:true }))
  })
  await ledgerPage.locator('[data-summary-day]').first().waitFor({ state:'visible' })
  await ledgerPage.locator('[data-summary-day]').first().click()
  const detail = ledgerPage.locator('[data-sl-detail-dialog]')
  await detail.waitFor({ state:'visible' })
  const cancelButton = detail.locator('[data-void]').first()
  await cancelButton.waitFor({ state:'visible' })
  await cancelButton.click()
  const cancellation = ledgerPage.locator('[data-sl-dialog]')
  await cancellation.waitFor({ state:'visible' })
  assert.equal(await cancellation.locator('textarea').count(), 0)
  const cancelSubmit = cancellation.locator('[data-sl-void-submit]')
  assert.equal(await cancelSubmit.isDisabled(), true)
  await cancellation.locator('[data-sl-void-confirm]').check()
  assert.equal(await cancelSubmit.isEnabled(), true)
  await ledgerPage.screenshot({ path:path.join(artifactDirectory, 'sales-cancellation-confirmation.png'), fullPage:false })
  await cancellation.locator('[data-close]').first().click()
  await ownerContext.close()

  const sharedContext = await browser.newContext({ viewport:{ width:1280, height:900 } })
  await sharedContext.addCookies([{ name:sharedCookie.split('=')[0], value:sharedCookie.slice(sharedCookie.indexOf('=') + 1), url:baseUrl }])
  const attendancePage = await sharedContext.newPage()
  await attendancePage.goto(`${baseUrl}/admin/account?panel=attendance&verify=v561`, { waitUntil:'domcontentloaded' })
  await attendancePage.locator('[data-ca-attendance-page]').waitFor({ state:'visible' })
  await attendancePage.locator('[data-attendance-view="history"]').click()
  const readonlyNotice = attendancePage.locator('.ca-attendance-readonly')
  await readonlyNotice.waitFor({ state:'visible' })
  assert.equal(await attendancePage.locator('[data-attendance-add-shift]').count(), 0)
  assert.equal(await attendancePage.locator('[data-attendance-save-record]').count(), 0)
  assert.equal(await attendancePage.locator('[data-attendance-record-editor] input:not(:disabled)').count(), 0)
  await attendancePage.screenshot({ path:path.join(artifactDirectory, 'shared-attendance-readonly.png'), fullPage:false })
  await sharedContext.close()

  console.log(JSON.stringify({
    release:'salon-records-controls-v561',
    desktopChart:true,
    mobileChart:true,
    historyNavigation:true,
    cancellationConfirmation:true,
    sharedAttendanceReadOnly:true,
    artifacts:artifactDirectory,
  }))
} finally {
  await browser.close()
}
