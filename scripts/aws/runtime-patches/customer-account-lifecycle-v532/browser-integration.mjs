import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-account-lifecycle-v532')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const login = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
      form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/profile' },
    })
    assert.equal(login.ok(), true, `${viewport.name} customer login failed with ${login.status()}`)

    const storesResponse = await context.request.get(`${baseUrl}/api/lien-customer-stores`)
    assert.equal(storesResponse.ok(), true)
    const storesPayload = await storesResponse.json()
    const targetStore = storesPayload.stores.find((store) => store.linked && !store.current)
    assert.ok(targetStore, `${viewport.name} linked-store fixture is unavailable`)
    const switchResponse = await context.request.post(`${baseUrl}/api/lien-customer-stores`, {
      headers: { Origin: baseUrl },
      data: { action: 'switch', organizationId: targetStore.organizationId },
    })
    assert.equal(switchResponse.ok(), true, `${viewport.name} store switch failed with ${switchResponse.status()}`)

    const page = await context.newPage()
    const profileResponse = await page.goto(`${baseUrl}/u/profile`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
    assert.equal(profileResponse?.ok(), true, `${viewport.name} profile returned ${profileResponse?.status()}`)
    const nickname = page.locator('input[name="nickname"]')
    await nickname.waitFor({ state: 'visible', timeout: 15_000 })
    assert.equal(await nickname.isEnabled(), true, `${viewport.name} nickname input stayed disabled`)
    const value = await nickname.inputValue()
    assert.ok(value.trim(), `${viewport.name} nickname disappeared after store switch`)

    const roundTrip = await page.evaluate(async (currentNickname) => {
      const save = await fetch('/api/lien-customer-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: currentNickname }),
      })
      const saved = await save.json()
      const read = await fetch('/api/lien-customer-nickname', { cache: 'no-store' })
      const loaded = await read.json()
      return { saveStatus: save.status, readStatus: read.status, saved, loaded }
    }, value)
    assert.equal(roundTrip.saveStatus, 200)
    assert.equal(roundTrip.readStatus, 200)
    assert.equal(roundTrip.saved.nickname, value)
    assert.equal(roundTrip.loaded.nickname, value)
    assert.equal(await page.locator('form[action="/api/customer-auth/withdrawal/request"]').count(), 1)
    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-profile.png`), fullPage: true })
    await context.close()

    const registrationContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const registrationPage = await registrationContext.newPage()
    const registrationResponse = await registrationPage.goto(`${baseUrl}/u/register`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
    assert.equal(registrationResponse?.ok(), true, `${viewport.name} registration returned ${registrationResponse?.status()}`)
    await registrationPage.locator('form[action="/api/customer-auth/registration-link/request"] input[name="email"]').waitFor({ state: 'visible', timeout: 12_000 })
    assert.equal(await registrationPage.locator('form[action="/api/customer-auth/registration-link/request"] button[type="submit"]').count(), 1)
    await registrationPage.screenshot({ path: path.join(screenshotDir, `${viewport.name}-registration.png`), fullPage: true })
    console.log(JSON.stringify({ viewport: viewport.name, nicknamePersisted: true, withdrawalAvailable: true, registrationAvailable: true }))
    await registrationContext.close()
  }

  console.log(JSON.stringify({ release: 'customer-account-lifecycle-v532', browserVerified: true, screenshotDir }))
} finally {
  await browser.close()
}
