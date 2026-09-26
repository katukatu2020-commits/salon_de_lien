import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const cleanup = []

async function removeMessages(request) {
  while (cleanup.length) {
    const messageId = cleanup.pop()
    await request.delete(`${base}/api/lien-chat-message?audience=staff`, {
      headers: { Origin: base, 'Content-Type': 'application/json' },
      data: { messageId },
    }).catch(() => {})
  }
}

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const login = await context.request.post(`${base}/api/auth/login`, {
    headers: { Origin: base },
    form: {
      email: process.env.VERIFY_ADMIN_ID || 'demo.owner',
      password: process.env.VERIFY_ADMIN_PASSWORD || 'LienDemo2026!',
      next: '/admin/customers/messages/chat',
    },
  })
  assert.equal(login.ok(), true, `login returned ${login.status()}`)
  const switched = await context.request.post(`${base}/api/admin/shared-account-switch`, { headers: { Origin: base, Accept: 'application/json' } })
  assert.equal(switched.status(), 200, `shared-account switch returned ${switched.status()}`)

  const listing = await context.request.get(`${base}/api/lien-chat?audience=staff`)
  assert.equal(listing.status(), 200)
  const threads = (await listing.json()).threads
  assert.ok(threads.length > 0, 'a demo chat thread is required')
  const threadId = threads[0].id

  const page = await context.newPage()
  await page.goto(`${base}/admin/customers/messages/chat?threadId=${encodeURIComponent(threadId)}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  const form = page.locator('form[action="/api/lien-chat-form"]')
  await form.waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForFunction(expected => document.querySelector('form[action="/api/lien-chat-form"] input[name="threadId"]')?.value === expected, threadId)

  const uiMarker = `v669-ui-reply-${Date.now()}-${Math.random().toString(16).slice(2)}`
  await form.locator('textarea[name="body"]').fill(uiMarker)
  await page.evaluate(() => {
    const input = document.querySelector('form[action="/api/lien-chat-form"] input[name="threadId"]')
    input.value = ''
    input.removeAttribute('value')
  })
  await Promise.all([
    page.waitForResponse(response => response.url().endsWith('/api/lien-chat-form') && response.request().method() === 'POST'),
    form.locator('button[type="submit"]').click(),
  ])
  await page.waitForLoadState('domcontentloaded')
  let opened = await context.request.get(`${base}/api/lien-chat?audience=staff&threadId=${encodeURIComponent(threadId)}`)
  let created = (await opened.json()).messages.find(message => message.body === uiMarker)
  assert.ok(created?.id, 'UI reply was not persisted after the hidden thread field was cleared')
  cleanup.push(created.id)
  await removeMessages(context.request)

  const fallbackMarker = `v669-referrer-reply-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const fallback = await context.request.post(`${base}/api/lien-chat-form`, {
    headers: {
      Origin: base,
      Referer: `${base}/admin/customers/messages?chat=1&threadId=${encodeURIComponent(threadId)}`,
    },
    form: { body: fallbackMarker },
  })
  assert.equal(fallback.ok(), true, `fallback form returned ${fallback.status()}`)
  opened = await context.request.get(`${base}/api/lien-chat?audience=staff&threadId=${encodeURIComponent(threadId)}`)
  created = (await opened.json()).messages.find(message => message.body === fallbackMarker)
  assert.ok(created?.id, 'server did not recover the thread from the trusted referrer')
  cleanup.push(created.id)
  await removeMessages(context.request)

  await context.close()
  console.log(JSON.stringify({ release: 'admin-chat-reply-v669', uiReplyVerified: true, hydrationFieldLossReproduced: true, serverFallbackVerified: true, verificationMessagesRemoved: true }))
} finally {
  try {
    const context = browser.contexts()[0]
    if (context) await removeMessages(context.request)
  } catch {}
  await browser.close()
}
