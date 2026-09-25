import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3187').replace(/\/$/, '')
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'chat-campaign-time-v664-integration')
fs.mkdirSync(screenshotDir, { recursive: true })

function japanLocalValue(value) {
  const date = new Date(value)
  assert.equal(Number.isFinite(date.getTime()), true)
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 16)
}

const browser = await chromium.launch({ executablePath, headless: true })
let cleanup = null
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 960 },
    timezoneId: 'America/Los_Angeles',
  })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: {
      email: process.env.VERIFY_ADMIN_ID || 'demo.owner',
      password: process.env.VERIFY_ADMIN_PASSWORD || 'LienDemo2026!',
      next: '/admin/customers/messages/chat',
    },
  })
  assert.equal(login.ok(), true, `admin login returned ${login.status()}`)

  const switched = await context.request.post(`${baseUrl}/api/admin/shared-account-switch`, {
    headers: { Origin: baseUrl, Accept: 'application/json' },
  })
  assert.equal(switched.status(), 200, `shared-account switch returned ${switched.status()}`)
  const switchedPayload = await switched.json()
  assert.equal(switchedPayload.role, 'STAFF')

  const listing = await context.request.get(`${baseUrl}/api/lien-chat?audience=staff`)
  assert.equal(listing.status(), 200)
  const listingPayload = await listing.json()
  assert.ok(listingPayload.threads.length > 0, 'no chat thread was available for shared-account verification')
  const threadId = listingPayload.threads[0].id
  const marker = `v664-chat-verification-${Date.now()}-${Math.random().toString(16).slice(2)}`

  const sent = await context.request.post(`${baseUrl}/api/lien-chat?audience=staff`, {
    headers: { Origin: baseUrl, 'Content-Type': 'application/json' },
    data: { action: 'send', threadId, body: marker },
  })
  assert.equal(sent.status(), 201, `shared-account chat send returned ${sent.status()}: ${await sent.text()}`)

  const opened = await context.request.get(`${baseUrl}/api/lien-chat?audience=staff&threadId=${encodeURIComponent(threadId)}`)
  assert.equal(opened.status(), 200)
  const openedPayload = await opened.json()
  const created = openedPayload.messages.find(message => message.body === marker)
  assert.ok(created?.id, 'sent verification message was not returned')
  cleanup = { context, messageId: created.id }

  const removed = await context.request.delete(`${baseUrl}/api/lien-chat-message?audience=staff`, {
    headers: { Origin: baseUrl, 'Content-Type': 'application/json' },
    data: { messageId: created.id },
  })
  assert.equal(removed.status(), 200, `verification message cleanup returned ${removed.status()}: ${await removed.text()}`)
  cleanup = null

  const confirmed = await context.request.get(`${baseUrl}/api/lien-chat?audience=staff&threadId=${encodeURIComponent(threadId)}`)
  assert.equal(confirmed.status(), 200)
  assert.equal((await confirmed.json()).messages.some(message => message.body === marker), false)

  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const campaignResponse = await page.goto(`${baseUrl}/admin/customers/messages/campaigns?integration=v664`, {
    waitUntil: 'domcontentloaded',
    timeout: 45_000,
  })
  assert.equal(campaignResponse?.ok(), true, `campaign page returned ${campaignResponse?.status()}`)
  const editButton = page.locator('[data-edit]').first()
  await editButton.waitFor({ state: 'visible', timeout: 15_000 })
  const campaignId = await editButton.getAttribute('data-edit')
  const inlineSource = await page.evaluate(() => Array.from(document.scripts)
    .map(script => script.textContent || '')
    .find(source => source.includes('const campaigns=') && source.includes(';const form=')) || '')
  const match = /const campaigns=(\[[\s\S]*?\]);const form=/.exec(inlineSource)
  assert.ok(match, 'campaign edit payload was not found')
  const campaign = JSON.parse(match[1]).find(item => item.id === campaignId)
  assert.ok(campaign, 'selected campaign was not found in edit payload')

  await editButton.click()
  assert.equal(await page.locator('input[name="startsAt"]').inputValue(), japanLocalValue(campaign.startsAt))
  assert.equal(await page.locator('input[name="endsAt"]').inputValue(), japanLocalValue(campaign.endsAt))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: path.join(screenshotDir, 'campaign-edit-jst-mobile.png'), fullPage: false })

  const unexpectedErrors = pageErrors.filter(message => !/Minified React error #(418|423)\b/.test(message))
  assert.deepEqual(unexpectedErrors, [])
  await context.close()

  console.log(JSON.stringify({
    release: 'chat-campaign-time-v664',
    integrationBrowserVerified: true,
    sharedAccountChatSendVerified: true,
    verificationMessageRemoved: true,
    campaignJapanTimeRoundTripVerified: true,
    screenshotDir,
  }))
} finally {
  if (cleanup) {
    try {
      await cleanup.context.request.delete(`${baseUrl}/api/lien-chat-message?audience=staff`, {
        headers: { Origin: baseUrl, 'Content-Type': 'application/json' },
        data: { messageId: cleanup.messageId },
      })
    } catch {}
  }
  await browser.close()
}
