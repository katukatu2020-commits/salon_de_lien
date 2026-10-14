import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(process.env.BROWSER_PACKAGE_JSON || path.resolve('package.json'))
const { chromium } = require('playwright-core')
const { entries } = createRequire(import.meta.url)('./fixtures.cjs')
const base = 'http://127.0.0.1:3188', container = 'orimia-qa-v680-app'
execFileSync('docker', ['cp', 'scripts/aws/runtime-patches/hotpepper-menu-rows-v711', container + ':/tmp/qa-v711'])
const fixture = action => JSON.parse(execFileSync('docker', ['exec', container, 'node', '/tmp/qa-v711/qa-fixture.cjs', action], { encoding: 'utf8' }) || 'null')
const output = 'artifacts/hotpepper-menu-rows-v711'; fs.mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
let seeded = false
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  assert.equal((await context.request.post(base + '/api/auth/login', { form: { email: 'demo.owner', password: 'QaLocalOnly-v680!', next: '/admin/appointments' } })).status(), 200)
  // External requests are blocked in isolated QA. Use the service's fetch seam
  // for preview creation, then real browser/API/DB for confirmation and import.
  const preview = fixture('seed'); seeded = true
  assert.equal(preview.total, 49); assert.equal(preview.duplicate, 1); assert.equal(preview.available, 48)
  const page = await context.newPage(); page.setDefaultTimeout(10000)
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/admin/appointments')
  await page.getByRole('link', { name: 'メニュー・商品・在庫', exact: true }).click()
  await page.locator('[data-hotpepper-menu-entry-v703]').click()
  await page.locator('[data-menu-import-row-v612]').first().waitFor()
  assert.equal(await page.locator('[data-menu-import-row-v612]').count(), 49)
  await page.locator('[data-menu-import-row-v612="22"]').scrollIntoViewIfNeeded()
  assert.match(await page.locator('[data-menu-import-row-v612="22"]').innerText(), /QA711 メニュー23/)
  await page.screenshot({ path: output + '/desktop-preview.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('[data-menu-import-row-v612="48"]').scrollIntoViewIfNeeded()
  assert.equal(await page.locator('[data-menu-import-row-v612="48"]').isVisible(), true)
  assert.equal(await page.getByRole('dialog').evaluate(e => e.scrollWidth > e.clientWidth + 1), false)
  await page.screenshot({ path: output + '/mobile-last-row.png' })
  await page.locator('[data-menu-import-confirm-v612]').click()
  await page.locator('[data-menu-import-confirm-run-v612]').click()
  await page.locator('[data-menu-import-reload-v612]').waitFor({ timeout: 120000 })
  const saved = fixture('read')
  assert.equal(saved.length, 49)
  for (let i = 0; i < entries.length; i++) {
    assert.equal(saved[i].name, entries[i].name)
    assert.equal(saved[i].priceYen, i === 20 ? 9999 : Number(entries[i].price))
    if (i === 20) assert.equal(saved[i].category, '既存の分類', 'Existing menu must not be overwritten')
    else assert.equal(saved[i].description.startsWith(entries[i].description), true)
  }
  const repeated = fixture('seed')
  assert.equal(repeated.total, 49); assert.equal(repeated.duplicate, 49); assert.equal(repeated.available, 0)
  assert.deepEqual(errors, [])
  console.log('v711 browser/DB PASS: 49-row preview, all 48 new menus imported, previous partial-import menu preserved, repeat import all duplicates, desktop/mobile and last row accessible')
} finally {
  if (seeded) fixture('cleanup')
  await browser.close()
}
