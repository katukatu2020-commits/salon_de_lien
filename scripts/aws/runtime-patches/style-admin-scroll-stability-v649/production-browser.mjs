import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-admin-scroll-stability-v649/production'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

function unexpected(messages) {
  return messages.filter(message => (
    !/Minified React error #(329|418|423)/.test(message)
    && !message.includes('status of 404')
    && !message.includes('net::ERR_NAME_NOT_RESOLVED')
  ))
}

const browser = await chromium.launch({ executablePath, headless: true })

try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const login = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(login.ok(), `Staff login returned ${login.status()}`)

  const page = await context.newPage()
  const errors = []
  const documents = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()) })
  page.on('request', request => { if (request.resourceType() === 'document') documents.push(request.url()) })

  await page.goto(base + '/admin/community?verify=v649', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const root = page.locator('.orimia-style-admin-v618')
  await root.locator('.orimia-admin-style-card-v618').first().waitFor({ state: 'visible', timeout: 12_000 })
  await page.waitForFunction(() => window.__orimiaStyleAdminScrollStabilityV649 === true)
  await page.waitForTimeout(300)

  const runtime = await page.evaluate(() => ({
    marker: window.__orimiaStyleAdminScrollStabilityV649,
    ownPush: Object.prototype.hasOwnProperty.call(history, 'pushState'),
    ownReplace: Object.prototype.hasOwnProperty.call(history, 'replaceState'),
    pushDiffersFromNative: history.pushState !== History.prototype.pushState,
    replaceDiffersFromNative: history.replaceState !== History.prototype.replaceState,
    pushSource: String(history.pushState),
    script: document.querySelector('#orimia-style-admin-controls-v618')?.getAttribute('src') || '',
    css: document.querySelector('#orimia-style-admin-controls-v618-style')?.getAttribute('href') || '',
    overflow: document.documentElement.scrollWidth - innerWidth,
  }))
  assert.equal(runtime.marker, true)
  assert.equal(runtime.ownPush, true)
  assert.equal(runtime.ownReplace, true)
  assert.equal(runtime.pushDiffersFromNative, true)
  assert.equal(runtime.replaceDiffersFromNative, true)
  assert.match(runtime.pushSource, /scheduleAfterRouteChange/)
  assert.match(runtime.script, /v=649-scroll1/)
  assert.match(runtime.css, /v=649-scroll1/)
  assert.ok(runtime.overflow <= 2)

  const nativeHistoryCheck = await page.evaluate(() => {
    const maximum = document.documentElement.scrollHeight - innerHeight
    const target = Math.max(0, Math.min(maximum, Math.round(maximum * 0.65)))
    scrollTo(0, target)
    const stateBefore = JSON.stringify(history.state)
    const url = new URL(location.href)
    url.searchParams.set('nativeHistoryV649', '1')
    History.prototype.pushState.call(history, history.state, '', url)
    return { target, stateBefore }
  })
  await page.waitForTimeout(1800)
  const nativeHistorySettled = await page.evaluate(() => ({
    y: window.scrollY,
    stateAfter: JSON.stringify(history.state),
  }))
  assert.ok(Math.abs(nativeHistorySettled.y - nativeHistoryCheck.target) <= 3, `Native history update moved scroll from ${nativeHistoryCheck.target} to ${nativeHistorySettled.y}`)
  assert.equal(nativeHistorySettled.stateAfter, nativeHistoryCheck.stateBefore)
  assert.equal(documents.length, 1)
  assert.deepEqual(unexpected(errors), [])
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))

  await page.screenshot({ path: path.join(output, 'staff-scroll-stability-mobile.png'), fullPage: false })
  console.log(JSON.stringify({
    release: 'style-admin-scroll-stability-v649',
    productionBrowserVerified: true,
    applicationHistoryWrapperPresent: true,
    nativeHistoryScrollStable: true,
    scroll: { target: nativeHistoryCheck.target, settled: nativeHistorySettled.y },
    documentRequests: documents.length,
  }, null, 2))
  await context.close()
} finally {
  await browser.close()
}
