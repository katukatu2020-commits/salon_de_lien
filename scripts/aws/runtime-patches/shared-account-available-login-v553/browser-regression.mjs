import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3124').replace(/\/$/, '')
const screenshotPath = path.join(os.tmpdir(), 'orimia-shared-account-reset-v553.png')
const sharedPassword = `Browser-V553-${Date.now().toString(36)}!`

const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    maxRedirects: 0,
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/account' },
    headers: { Origin: baseUrl },
  })
  assert.ok([302, 303].includes(login.status()), `owner login failed: ${login.status()}`)

  const page = await context.newPage()
  await page.goto(`${baseUrl}/admin/account`, { waitUntil: 'domcontentloaded' })
  const form = page.locator('[data-shared-form]')
  await form.waitFor({ state: 'visible' })

  const loginInput = form.locator('input[name="loginId"]')
  const currentLoginId = await loginInput.inputValue()
  assert.match(currentLoginId, /^[a-z0-9._-]{3,80}$/)
  await form.locator('input[name="password"]').fill(sharedPassword)
  await form.locator('button[type="submit"]').click()

  const feedback = form.locator('[data-shared-feedback]')
  await feedback.waitFor({ state: 'visible' })
  await page.waitForFunction(() => {
    const node = document.querySelector('[data-shared-feedback]')
    return node && !node.textContent.includes('保存しています')
  })
  assert.doesNotMatch(await feedback.textContent(), /すでに使用されています/)
  assert.equal(await feedback.evaluate(node => node.classList.contains('error')), false)
  assert.equal(await form.locator('input[name="password"]').inputValue(), '')

  const sharedLogin = await context.request.post(`${baseUrl}/api/auth/login`, {
    maxRedirects: 0,
    form: { email: currentLoginId, password: sharedPassword, next: '/admin/appointments' },
    headers: { Origin: baseUrl },
  })
  assert.ok([302, 303].includes(sharedLogin.status()), `shared login failed: ${sharedLogin.status()}`)
  assert.equal(sharedLogin.headers().location, `${baseUrl}/admin/appointments`)

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  })
  await context.close()
} finally {
  await browser.close()
}

console.log(JSON.stringify({
  release: 'shared-account-available-login-v553',
  browserSave: true,
  passwordCleared: true,
  sharedLogin: true,
  screenshotPath,
}))
