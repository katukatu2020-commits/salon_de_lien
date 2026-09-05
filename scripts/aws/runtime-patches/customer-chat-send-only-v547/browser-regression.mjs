import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3125').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v547')
fs.mkdirSync(screenshotRoot, { recursive: true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/chat' },
  })
  assert.equal(response.ok(), true, `customer login failed with ${response.status()}`)
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
  await login(context)
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))

  await page.goto(`${baseUrl}/u/chat?verify=v547`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
  await page.locator('[data-lien-customer-chat-portal]').waitFor({ state: 'visible', timeout: 20_000 })
  await page.waitForFunction(() => window.__orimiaCustomerChatSendOnlyV547 === true)

  const staffButton = page.locator('[data-chat-staff-list] [data-staff-key]').first()
  if (await staffButton.count()) {
    await staffButton.click()
    await page.locator('.lien-chat-v294.is-conversation').waitFor({ state: 'visible', timeout: 15_000 })
  }
  await page.waitForTimeout(900)

  const state = await page.evaluate(() => ({
    legacyScripts: [...document.scripts].filter(script => script.src.includes('/content-edit-delete-client-v466.js')).length,
    actionContainers: document.querySelectorAll('[data-lien-customer-chat-portal] .lien-chat-message-actions').length,
    editOrCancelButtons: [...document.querySelectorAll('[data-lien-customer-chat-portal] button')]
      .filter(button => /編集|削除|取消|取り消し/.test(`${button.textContent || ''} ${button.getAttribute('aria-label') || ''}`)).length,
    editableRows: document.querySelectorAll('[data-lien-customer-chat-portal] [data-lien-chat-can-edit="true"]').length,
    deleteGestures: document.querySelectorAll('[data-lien-customer-chat-portal] [data-lien-chat-delete-on-dblclick]').length,
    composer: Boolean(document.querySelector('[data-lien-customer-chat-portal] [data-chat-body]')),
    sendButton: Boolean(document.querySelector('[data-lien-customer-chat-portal] [data-chat-send]')),
  }))

  assert.deepEqual(state, {
    legacyScripts: 0,
    actionContainers: 0,
    editOrCancelButtons: 0,
    editableRows: 0,
    deleteGestures: 0,
    composer: true,
    sendButton: true,
  })

  await page.evaluate(() => {
    const host = document.querySelector('[data-chat-conversation]')
    if (!host) throw new Error('chat conversation host was not found')
    const row = document.createElement('div')
    row.dataset.lienChatMessage = 'v547-regression-probe'
    row.dataset.lienChatCanEdit = 'true'
    row.innerHTML = '<div data-lien-chat-body>probe<div class="lien-chat-message-actions"><button type="button">編集</button><button type="button">取り消し</button></div></div>'
    host.appendChild(row)
  })
  await page.waitForFunction(() => {
    const row = document.querySelector('[data-lien-chat-message="v547-regression-probe"]')
    return row?.getAttribute('data-lien-chat-can-edit') === 'false'
      && !row.querySelector('.lien-chat-message-actions')
  })
  await page.locator('[data-lien-chat-message="v547-regression-probe"]').evaluate(row => row.remove())

  const screenshot = path.join(screenshotRoot, 'customer-chat-send-only-v547-mobile.png')
  await page.screenshot({ path: screenshot, fullPage: true })
  assert.deepEqual(pageErrors.filter(message => !/Minified React error #(418|423)/.test(message)), [])
  await context.close()

  console.log(JSON.stringify({
    release: 'customer-chat-send-only-v547',
    browserVerified: true,
    customerEditControls: 0,
    customerCancelControls: 0,
    sendComposerPreserved: true,
    staleControlCleanupVerified: true,
    screenshot,
  }, null, 2))
} finally {
  await browser.close()
}
