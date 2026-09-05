import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3122').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v545')
fs.mkdirSync(screenshotRoot, { recursive: true })

const fixture = await sharp({
  create: { width: 720, height: 420, channels: 3, background: { r: 203, g: 103, b: 126 } },
}).jpeg({ quality: 88 }).toBuffer()

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
  const login = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/profile' },
  })
  assert.equal(login.ok(), true, `customer login failed with ${login.status()}`)

  const page = await context.newPage()
  const runtimeErrors = []
  page.on('pageerror', error => runtimeErrors.push(error.message))
  let uploadCount = 0
  let uploadedBytes = 0
  await page.route('**/api/customer/profile-image', async route => {
    if (route.request().method() !== 'POST') return route.continue()
    uploadCount += 1
    uploadedBytes = route.request().postDataBuffer()?.length || 0
    await route.fulfill({
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({
        success: true,
        message: 'プロフィール画像を更新しました。',
        imageUrl: '/brand/orimia-icon-192.png?v=545-test',
      }),
    })
  })

  const response = await page.goto(`${baseUrl}/u/profile?verify=v545`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
  assert.equal(response?.ok(), true, `profile returned ${response?.status()}`)
  await page.waitForFunction(() => window.__orimiaCustomerProfileAutoUploadV545 === true, null, { timeout: 10_000 })
  await page.waitForFunction(() => window.__lienCustomerProfileImageV401 === true, null, { timeout: 10_000 }).catch(async error => {
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name).filter(name => name.includes('profile') || name.includes('customer-experience')))
    console.log(JSON.stringify({ missingProfileCropper: true, resources }))
    throw error
  })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout: 10_000 })

  const input = page.locator('input[type="file"][name="profileImage"]')
  await input.waitFor({ state: 'attached' })
  const imageForm = input.locator('xpath=ancestor::form[1]')
  await page.waitForFunction(() => {
    const form = document.querySelector('input[name="profileImage"]')?.closest('form')
    const button = form?.querySelector('[data-profile-upload-button-v424],button[type="submit"]')
    return !button || getComputedStyle(button).display === 'none'
  }, null, { timeout: 5_000 })
  assert.equal(await imageForm.locator('button:visible').count(), 0)
  assert.equal(await imageForm.locator('label[data-customer-profile-image-picker-v545="1"]').count(), 1)
  assert.match((await imageForm.textContent()) || '', /画像を選ぶ|画像を選択|プロフィール画像を変更/)

  await input.setInputFiles({ name: 'profile-wide.jpg', mimeType: 'image/jpeg', buffer: fixture })
  const cropModal = page.locator('.lien-profile-crop-backdrop')
  await cropModal.waitFor({ state: 'visible', timeout: 10_000 }).catch(async error => {
    const failureScreenshotPath = path.join(screenshotRoot, 'customer-profile-auto-upload-v545-missing-crop.png')
    await page.screenshot({ path: failureScreenshotPath, fullPage: true })
    const inputState = await page.evaluate(() => {
      const field = document.querySelector('input[name="profileImage"]')
      return {
        url: location.href,
        title: document.title,
        bodyText: document.body.innerText.slice(0, 1200),
        input: field?.outerHTML || null,
        files: field?.files?.length || 0,
        flags: {
          profileCropper: window.__lienCustomerProfileImageV401 || false,
          sharedCropper: document.documentElement.dataset.lienCropperV293 || null,
          autoUpload: window.__orimiaCustomerProfileAutoUploadV545 || false,
        },
        modals: [...document.querySelectorAll('[role="dialog"]')].map(node => node.className),
        scripts: [...document.scripts].map(script => script.src).filter(src => src.includes('profile') || src.includes('customer-link')),
      }
    })
    console.log(JSON.stringify({ missingCropModal: true, failureScreenshotPath, inputState, runtimeErrors }))
    throw error
  })
  assert.equal(await input.evaluate(element => element.validationMessage), '')
  assert.equal(await input.evaluate(element => element.files?.length || 0), 1)
  const cropScreenshotPath = path.join(screenshotRoot, 'customer-profile-auto-upload-v545-crop.png')
  await cropModal.screenshot({ path: cropScreenshotPath })
  await cropModal.locator('[data-action="confirm"]').click()

  const status = imageForm.locator('[data-profile-upload-status-v545]')
  await status.waitFor({ state: 'visible', timeout: 10_000 })
  await page.waitForFunction(() => document.querySelector('[data-profile-upload-status-v545]')?.dataset.state === 'success', null, { timeout: 10_000 })
  assert.equal((await status.innerText()).trim(), 'プロフィール画像を更新しました。')
  assert.equal(uploadCount, 1, 'crop confirmation must issue exactly one upload')
  assert.ok(uploadedBytes > 1000, `multipart upload was unexpectedly small: ${uploadedBytes}`)
  assert.equal(await page.getByText('正方形にトリミングしました。保存ボタンで確定してください。', { exact: true }).count(), 0)
  assert.equal(await input.evaluate(element => element.files?.length || 0), 0)
  assert.equal(await imageForm.getAttribute('aria-busy'), null)

  const screenshotPath = path.join(screenshotRoot, 'customer-profile-auto-upload-v545-mobile.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  const unexpectedRuntimeErrors = runtimeErrors.filter(message => !/Minified React error #(418|423)/.test(message))
  assert.deepEqual(unexpectedRuntimeErrors, [])

  console.log(JSON.stringify({
    release: 'customer-profile-auto-upload-v545',
    browserVerified: true,
    actionButtons: 1,
    uploadCount,
    uploadedBytes,
    cropScreenshotPath,
    screenshotPath,
  }, null, 2))
  await context.close()
} finally {
  await browser.close()
}
