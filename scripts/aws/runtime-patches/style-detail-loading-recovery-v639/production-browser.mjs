import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-detail-loading-recovery-v639/production'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive:true })

const browser = await chromium.launch({ executablePath, headless:true })
const results = []

function unexpected(messages) {
  return messages.filter(message => (
    !/Minified React error #(329|418|423)/.test(message)
    && !message.includes('status of 404')
    && !message.includes('status of 410')
  ))
}

async function verify(width) {
  const context = await browser.newContext({ viewport:{ width, height:900 } })
  await context.addInitScript(() => {
    window.__v639ProductionEvents = []
    window.addEventListener('orimia:ui-transition-finished', event => {
      window.__v639ProductionEvents.push({ reason:event.detail?.reason, at:performance.now() })
    })
  })
  const login = await context.request.post(base + '/api/auth/login', {
    headers:{ Origin:base },
    form:{ email:'demo.owner', password:'LienDemo2026!', next:'/admin/community' },
  })
  assert.ok(login.ok(), `${width}: staff login returned ${login.status()}`)
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(String(error)))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })

  await page.goto(base + `/admin/community?loaderRecovery=v639-${width}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout:8000 })
  const links = await page.locator('a[href^="/admin/community/"]:not([aria-disabled="true"])').evaluateAll(nodes => (
    [...new Set(nodes.map(node => node.getAttribute('href')).filter(Boolean))].slice(0, 3)
  ))
  assert.ok(links.length, `${width}: no visible style detail links were found`)

  for (const [index, href] of links.entries()) {
    if (index) {
      await page.goto(base + `/admin/community?loaderRecovery=v639-${width}-${index}`, { waitUntil:'domcontentloaded', timeout:30_000 })
      await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout:8000 })
    }
    const startedAt = Date.now()
    await page.locator(`a[href="${href}"]`).first().click()
    await page.waitForURL(url => url.pathname === href, { timeout:30_000 })
    await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout:6000 })
    const state = await page.evaluate(() => {
      const loader = document.getElementById('orimia-ui-loader-v536')
      const article = document.querySelector('.community-detail-page article, .ts-community-detail article, main article')
      return {
        scope:document.documentElement.dataset.orimiaNavigationLoaderScope || null,
        ready:document.documentElement.dataset.orimiaUiReady || null,
        busy:document.documentElement.getAttribute('aria-busy'),
        loaderVisibility:loader ? getComputedStyle(loader).visibility : null,
        articleVisible:Boolean(article && getComputedStyle(article).visibility !== 'hidden'),
        events:window.__v639ProductionEvents || [],
      }
    })
    assert.equal(state.scope, 'v639', `${width}/${href}: old loader runtime is active`)
    assert.equal(state.ready, 'v516', `${width}/${href}: document did not become ready`)
    assert.equal(state.busy, null, `${width}/${href}: document remains busy`)
    assert.equal(state.loaderVisibility, 'hidden', `${width}/${href}: loader remains visible`)
    assert.equal(state.articleVisible, true, `${width}/${href}: detail article is hidden`)
    assert.ok(Date.now() - startedAt < 6000, `${width}/${href}: detail loader exceeded its recovery limit`)
    results.push({ width, href, loaderCleared:true, elapsedMs:Date.now() - startedAt })
    if (!index) await page.screenshot({ path:path.join(output, `style-detail-${width}.png`), fullPage:false })
  }

  assert.deepEqual(unexpected(errors), [], `${width}: unexpected production browser errors`)
  await context.close()
}

try {
  await verify(390)
  await verify(1280)
  console.log(JSON.stringify({ release:'style-detail-loading-recovery-v639', productionBrowserVerified:true, results }))
} finally {
  await browser.close()
}
