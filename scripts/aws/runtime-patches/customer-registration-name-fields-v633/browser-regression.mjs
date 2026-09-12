import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const playwrightRoot = process.env.PLAYWRIGHT_PACKAGE_ROOT || process.cwd()
const require = createRequire(path.join(playwrightRoot, 'package.json'))
const { chromium } = require('playwright')

const base = String(process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3133').replace(/\/$/, '')
const token = process.env.REGISTRATION_TOKEN
assert.match(token || '', /^[A-Za-z0-9_-]{43}$/, 'REGISTRATION_TOKEN must be a valid invite token')

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined
const artifactDir = process.env.ARTIFACT_DIR
if (artifactDir) fs.mkdirSync(artifactDir, { recursive: true })

const browser = await chromium.launch({ headless: true, executablePath })
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    await page.goto(`${base}/u/register/${token}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1400)

    for (const name of ['lastName', 'firstName', 'lastNameKana', 'firstNameKana']) {
      const input = page.locator(`input[name="${name}"]`)
      assert.equal(await input.count(), 1, `${name} input is missing at ${viewport.width}px`)
      assert.equal(await input.getAttribute('required'), '', `${name} must be required`)
      assert.equal(await input.isVisible(), true, `${name} input is not visible at ${viewport.width}px`)
    }
    assert.equal(await page.locator('input[name="name"]').count(), 0, 'legacy single-name input remains')
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      true,
      `registration page overflows horizontally at ${viewport.width}px`,
    )
    assert.deepEqual(pageErrors, [])

    if (artifactDir) {
      await page.screenshot({
        path: path.join(artifactDir, `registration-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      })
    }
    await context.close()
  }

  if (process.env.SUBMIT_REGISTRATION === 'true') {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto(`${base}/u/register/${token}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1400)
    await page.locator('input[name="loginId"]').fill(process.env.REGISTRATION_LOGIN_ID || 'v633e2ecustomer')
    await page.locator('input[name="password"]').fill(process.env.REGISTRATION_PASSWORD || 'V633-local-password')
    await page.locator('input[name="lastName"]').fill(' 山田 ')
    await page.locator('input[name="firstName"]').fill(' 花子 ')
    await page.locator('input[name="lastNameKana"]').fill('ﾔﾏﾀﾞ')
    await page.locator('input[name="firstNameKana"]').fill('はなこ')
    await page.locator('input[name="phone"]').fill(process.env.REGISTRATION_PHONE || '09063300001')
    await page.locator('input[name="birthDate"]').fill('1990-01-02')
    for (const name of ['gender', 'hairVolume', 'hairTexture', 'hairThickness', 'hairCurl', 'servicePreference']) {
      await page.locator(`select[name="${name}"]`).selectOption({ index: 1 })
    }

    await Promise.all([
      page.waitForURL(url => url.pathname === '/u/login' && url.searchParams.get('registered') === '1', { timeout: 30000 }),
      page.getByRole('button', { name: '登録する', exact: true }).click(),
    ])
    assert.equal(page.url().includes('registered=1'), true)
    await context.close()
  }

  console.log(JSON.stringify({
    release: 'customer-registration-name-fields-v633',
    browserVerified: true,
    viewports: ['390x844', '1440x1000'],
    submitted: process.env.SUBMIT_REGISTRATION === 'true',
  }))
} finally {
  await browser.close()
}
