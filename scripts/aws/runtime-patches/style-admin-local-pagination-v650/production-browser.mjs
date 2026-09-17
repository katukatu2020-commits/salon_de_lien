import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-admin-local-pagination-v650/production'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

function unexpected(messages, retiredBillingResponses) {
  return messages.filter(message => (
    !/Minified React error #(329|418|423)/.test(message)
    && !message.includes('status of 404')
    && !message.includes('net::ERR_NAME_NOT_RESOLVED')
    && !(retiredBillingResponses.length > 0 && message.includes('status of 410'))
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
  const retiredBillingResponses = []
  page.on('pageerror', error => errors.push('page: ' + error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push('console: ' + message.text()) })
  page.on('response', response => {
    const url = new URL(response.url())
    if (response.status() === 410 && url.pathname === '/api/admin/billing/status') retiredBillingResponses.push(response.url())
  })
  page.on('request', request => { if (request.resourceType() === 'document') documents.push(request.url()) })

  await page.goto(base + '/admin/community?verify=v650', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  const root = page.locator('.orimia-style-admin-v618')
  await root.locator('.orimia-admin-style-card-v618').first().waitFor({ state: 'visible', timeout: 12_000 })
  await page.waitForFunction(() => window.__orimiaStyleAdminLocalPaginationV650 === true)
  await page.waitForTimeout(300)

  const runtime = await page.evaluate(() => ({
    marker: window.__orimiaStyleAdminLocalPaginationV650,
    script: document.querySelector('#orimia-style-admin-controls-v618')?.getAttribute('src') || '',
    css: document.querySelector('#orimia-style-admin-controls-v618-style')?.getAttribute('href') || '',
    overflow: document.documentElement.scrollWidth - innerWidth,
  }))
  assert.equal(runtime.marker, true)
  assert.match(runtime.script, /v=650-local1/)
  assert.match(runtime.css, /v=649-scroll1/)
  assert.ok(runtime.overflow <= 2)

  const baseline = await page.evaluate(() => {
    const maximum = document.documentElement.scrollHeight - innerHeight
    const target = Math.max(0, Math.min(maximum, Math.round(maximum * 0.65)))
    scrollTo(0, target)
    return target
  })
  await page.waitForTimeout(2200)
  const settled = await page.evaluate(() => window.scrollY)
  assert.ok(Math.abs(settled - baseline) <= 3, `Production page moved scroll from ${baseline} to ${settled}`)
  assert.equal(documents.length, 1)
  assert.deepEqual(unexpected(errors, retiredBillingResponses), [])
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))

  await page.screenshot({ path: path.join(output, 'staff-local-pagination-mobile.png'), fullPage: false })
  console.log(JSON.stringify({
    release: 'style-admin-local-pagination-v650',
    productionBrowserVerified: true,
    localPaginationRuntimePresent: true,
    scroll: { target: baseline, settled },
    documentRequests: documents.length,
  }, null, 2))
  await context.close()
} finally {
  await browser.close()
}
