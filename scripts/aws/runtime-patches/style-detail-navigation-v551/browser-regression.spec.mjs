import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { test, expect } = require('@playwright/test')

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3122').replace(/\/$/, '')

test.use({
  baseURL: baseUrl,
  viewport: { width: 390, height: 844 },
})

async function waitForCustomerShell(page) {
  await page.waitForFunction(() => document.documentElement.dataset.orimiaShellReady === 'v518')
  await page.waitForTimeout(120)
}

async function openStyleList(page) {
  await page.goto('/u/home')
  await waitForCustomerShell(page)
  await page.locator('a[href="/u/community"]:visible').first().click()
  await page.waitForURL(/\/u\/community(?:\?|$)/)
  await waitForCustomerShell(page)
}

async function openFirstStyle(page) {
  const link = page.locator('a[aria-label="スタイル詳細を開く"]').first()
  await expect(link).toBeVisible()
  await link.click()
  await page.waitForURL(/\/u\/community\/[^/?]+(?:\?|$)/)
  await waitForCustomerShell(page)
  return new URL(page.url()).pathname
}

test.beforeEach(async ({ context }) => {
  const response = await context.request.post('/api/customer-auth/login', {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' },
  })
  expect(response.ok()).toBe(true)
})

test('style detail has one back affordance and never loops into the detail again', async ({ page }) => {
  await openStyleList(page)
  const detailPath = await openFirstStyle(page)

  await expect(page.getByRole('link', { name: 'スタイル一覧へ' })).toHaveCount(0)
  await expect(page.locator('[data-customer-shell-back-v518]')).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('style-detail-mobile.png') })

  await page.locator('[data-customer-shell-back-v518]').click()
  await page.waitForURL(/\/u\/community(?:\?|$)/)
  await waitForCustomerShell(page)
  await page.locator('[data-customer-shell-back-v518]').click()
  await page.waitForURL(/\/u\/home(?:\?|$)/)
  expect(new URL(page.url()).pathname).not.toBe(detailPath)

  await openStyleList(page)
  await openFirstStyle(page)
  await page.goBack()
  await page.waitForURL(/\/u\/community(?:\?|$)/)
  await waitForCustomerShell(page)
  await page.locator('[data-customer-shell-back-v518]').click()
  await page.waitForURL(/\/u\/home(?:\?|$)/)
  expect(new URL(page.url()).pathname).not.toBe(detailPath)
})
