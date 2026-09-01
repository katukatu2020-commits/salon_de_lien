import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3127').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'manual-break-cleanup-v522')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' },
  })
  assert.equal(login.ok(), true, `admin login returned ${login.status()}`)

  const page = await context.newPage()
  await page.goto(`${baseUrl}/admin/appointments?regression=v522`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')
  await page.locator('[data-ts-manual-appointment-launcher]').evaluate(element => element.click())

  const dialog = page.locator('[aria-labelledby="manual-appointment-title"]')
  await dialog.waitFor({ state: 'visible' })
  const toggle = dialog.locator('[data-lien-break-checkbox-v521]')
  await toggle.waitFor({ state: 'visible' })
  await toggle.check()
  const panel = dialog.locator('[data-lien-break-panel-v521]')
  await panel.waitFor({ state: 'visible' })
  await panel.locator('[data-lien-break-staff-v521] option').nth(1).waitFor({ state: 'attached' })
  await page.waitForTimeout(350)

  const state = await dialog.evaluate(root => ({
    cleanupMarker: document.documentElement.dataset.orimiaManualBreakCleanup,
    legacyActions: [...root.querySelectorAll('.lien-break-action-v442')].map(action => ({
      hidden: action.hidden,
      ariaHidden: action.getAttribute('aria-hidden'),
      inert: action.inert,
      display: getComputedStyle(action).display,
    })),
    visibleFields: [...root.querySelectorAll('input,select,textarea')]
      .filter(control => control.checkVisibility() && control.type !== 'checkbox')
      .map(control => control.name)
      .sort(),
    customerHidden: !root.querySelector('select[name="customerId"]')?.checkVisibility(),
    menuHidden: !root.querySelector('select[name="menu"]')?.checkVisibility(),
  }))

  assert.equal(state.cleanupMarker, 'v522')
  assert.ok(state.legacyActions.length >= 1, 'legacy break action fixture was not rendered')
  for (const action of state.legacyActions) {
    assert.deepEqual(action, { hidden: true, ariaHidden: 'true', inert: true, display: 'none' })
  }
  assert.deepEqual(state.visibleFields, ['breakEndTime', 'breakStaffKey', 'breakStartTime'])
  assert.equal(state.customerHidden, true)
  assert.equal(state.menuHidden, true)
  await page.screenshot({ path: path.join(screenshotDir, 'break-fields-desktop.png'), fullPage: false })

  await page.setViewportSize({ width: 390, height: 844 })
  const mobile = await dialog.evaluate(element => ({
    pageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    dialogOverflow: element.scrollWidth - element.clientWidth,
  }))
  assert.ok(mobile.pageOverflow <= 1, `mobile page overflows by ${mobile.pageOverflow}px`)
  assert.ok(mobile.dialogOverflow <= 1, `mobile dialog overflows by ${mobile.dialogOverflow}px`)
  await page.screenshot({ path: path.join(screenshotDir, 'break-fields-mobile.png'), fullPage: false })

  await toggle.uncheck()
  assert.equal(await dialog.locator('select[name="customerId"]').isVisible(), true)
  assert.equal(await dialog.locator('select[name="menu"]').isVisible(), true)
  await dialog.locator('button[aria-label="\u9589\u3058\u308b"]').click()
  await context.close()

  console.log(JSON.stringify({ release: 'manual-break-cleanup-v522', browserVerified: true }))
} finally {
  await browser.close()
}
