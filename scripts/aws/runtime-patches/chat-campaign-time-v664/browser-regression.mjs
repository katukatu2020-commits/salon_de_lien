import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { BROWSER_LOCAL_VALUE_SOURCE, CAN_ACCESS_THREAD_SOURCE } from './runtime-transform.mjs'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'chat-campaign-time-v664-fixture')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'America/Los_Angeles',
  })
  const page = await context.newPage()
  await page.setContent(`<!doctype html><html lang="ja"><body>
    <main><h1>キャンペーン時刻</h1><label>掲載開始<input id="startsAt" type="datetime-local"></label>
    <output id="shared"></output><output id="ordinary"></output></main>
    <script>${BROWSER_LOCAL_VALUE_SOURCE};${CAN_ACCESS_THREAD_SOURCE};
      document.querySelector('#startsAt').value=localValue('2026-09-25T02:40:00.000Z');
      document.querySelector('#shared').value=String(canAccessThread({role:'STAFF',isSharedStoreAccount:true,displayName:'店舗共通'},{staffName:'谷崎 太二'}));
      document.querySelector('#ordinary').value=String(canAccessThread({role:'STAFF',isSharedStoreAccount:false,displayName:'別担当'},{staffName:'谷崎 太二'}));
    </script>
  </body></html>`)

  assert.equal(await page.locator('#startsAt').inputValue(), '2026-09-25T11:40')
  assert.equal(await page.locator('#shared').textContent(), 'true')
  assert.equal(await page.locator('#ordinary').textContent(), 'false')
  await page.screenshot({ path: path.join(screenshotDir, 'campaign-time-jst-fixture.png'), fullPage: true })
  await context.close()
  console.log(JSON.stringify({ release: 'chat-campaign-time-v664', browserRegressionVerified: true, screenshotDir }))
} finally {
  await browser.close()
}
