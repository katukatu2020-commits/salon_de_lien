import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = 'http://localhost:3600'
assert.equal(process.env.ALLOW_LOCAL_LIVE_IMPORT, 'true')
const out = process.env.SCREENSHOT_DIR || 'artifacts/hotpepper-import-confirm-v600/live-local'
fs.mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const login = await context.request.post(base + '/api/auth/login', { form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' }, headers: { Origin: base } })
  assert.ok(login.ok())
  const page = await context.newPage()
  await page.goto(base + '/admin/community', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '新しいスタイルを投稿' }).click()
  await page.locator('[data-hp-mode]').check()
  await page.locator('#hp-url').fill('https://beauty.hotpepper.jp/slnH000307612/style/')
  await page.locator('[data-hp-rights]').check()
  let { job } = await (await context.request.get(base + '/api/lien-hotpepper-styles')).json()
  if (!job || ['CANCELLED', 'DONE'].includes(job.status)) await page.locator('[data-hp-start]').click()
  if (job?.status === 'PAUSED' && job.confirmedAt) {
    await page.locator('[data-hp-retry]').click()
  } else if (job?.status !== 'IMPORTING') {
    await page.locator('.hp-confirm[open]').waitFor({ timeout: 120000 })
    job = (await (await context.request.get(base + '/api/lien-hotpepper-styles')).json()).job
    assert.equal(job.status, 'CONFIRMATION'); assert.ok(job.total > 0); assert.equal(job.loaded, 0)
    console.log(JSON.stringify({ phase: 'confirmation', total: job.total, duplicate: job.duplicate, discoveredPages: job.discoveredPages, noPhotosImported: job.loaded === 0 }))
    await page.screenshot({ path: path.join(out, 'confirmation.png') })
    await page.locator('[data-hp-confirm]').click()
  }
  const deadline = Date.now() + 45 * 60 * 1000
  let last = -1
  while (Date.now() < deadline) {
    job = (await (await context.request.get(base + '/api/lien-hotpepper-styles')).json()).job
    if (job.processed !== last) { console.log(JSON.stringify({ phase: job.status, processed: job.processed, total: job.total, saved: job.published, failed: job.failed, error: job.error })); last = job.processed }
    if (['DONE', 'PAUSED'].includes(job.status)) break
    await page.waitForTimeout(4000)
  }
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(job, null, 2))
  await page.screenshot({ path: path.join(out, 'result.png') })
  assert.equal(job.status, 'DONE', job.error)
  assert.equal(job.failed, 0, JSON.stringify(job.items.filter(i => i.status === 'ERROR')))
  assert.equal(job.published + job.duplicate, job.total)
  const saved = job.items.find(i => i.postId)
  assert.ok(saved)
  await page.goto(base + '/admin/community/' + saved.postId, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(title => document.body.textContent.includes(title), saved.data?.title)
  await page.waitForFunction(() => [...document.images].some(i => /127\.0\.0\.1:9160/.test(i.src) && i.naturalWidth > 0))
  await page.screenshot({ path: path.join(out, 'saved-detail.png') })
  console.log(JSON.stringify({ liveSource: true, realDatabaseAndObjectStorage: true, savedDetailRendered: true, total: job.total, saved: job.published, duplicate: job.duplicate }))
} finally { await browser.close() }
