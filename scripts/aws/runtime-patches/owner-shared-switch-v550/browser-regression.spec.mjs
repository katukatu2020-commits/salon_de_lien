import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { test, expect } = require('@playwright/test')

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3122').replace(/\/$/, '')

test.use({
  baseURL: baseUrl,
  viewport: { width: 1440, height: 900 },
})

test('owner can switch to the shared account from the desktop header only once', async ({ page }) => {
  await page.goto('/admin/login?next=/admin/appointments')
  await page.getByLabel('メールアドレスまたはID').fill('demo.owner')
  await page.getByLabel('パスワード').fill('LienDemo2026!')
  await Promise.all([
    page.waitForURL('**/admin/appointments'),
    page.getByRole('button', { name: 'ログイン', exact: true }).click(),
  ])

  const currentUser = page.locator('.admin-desktop-header [data-ca-current-user]')
  const switchButton = page.getByRole('button', { name: '店舗共通アカウントへ切り替え' })
  await expect(currentUser).toBeVisible()
  await expect(switchButton).toBeVisible()
  await expect(switchButton.locator('xpath=preceding-sibling::*[1]')).toHaveAttribute('data-ca-current-user', '1')

  const ownerName = (await currentUser.innerText()).trim()
  assertMeaningfulName(ownerName)
  await page.screenshot({ path: test.info().outputPath('owner-header.png') })

  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    switchButton.click(),
  ])

  await expect(page.locator('.admin-desktop-header [data-ca-current-user]')).toBeVisible()
  await expect(page.getByRole('button', { name: '店舗共通アカウントへ切り替え' })).toHaveCount(0)
  const sharedName = (await page.locator('.admin-desktop-header [data-ca-current-user]').innerText()).trim()
  assertMeaningfulName(sharedName)
  expect(sharedName).not.toBe(ownerName)

  const reverse = await page.request.post('/api/admin/shared-account-switch', {
    headers: { Origin: baseUrl, Accept: 'application/json' },
  })
  expect(reverse.status()).toBe(403)
  await page.screenshot({ path: test.info().outputPath('shared-header.png') })
})

function assertMeaningfulName(value) {
  expect(value.length).toBeGreaterThan(1)
  expect(value).not.toBe('ログイン中')
}
