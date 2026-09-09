import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium, webkit } = require('playwright-core')
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3600'
const output = process.env.SCREENSHOT_DIR || 'artifacts/hotpepper-import-confirm-v600/browser'
fs.mkdirSync(output, { recursive: true })
const browser = await (process.env.SMOKE_BROWSER === 'webkit' ? webkit.launch({ headless: true }) : chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }))
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lYQAAAAASUVORK5CYII=', 'base64')
const results = []
try {
  for (const width of [1440, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    // Windows WebKit can leave third-party web fonts pending indefinitely.
    if (process.env.SMOKE_BROWSER === 'webkit') {
      await context.route('https://fonts.googleapis.com/**', route => route.abort())
      await context.route('https://fonts.gstatic.com/**', route => route.abort())
    }
    const login = await context.request.post(base + '/api/auth/login', { form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' }, headers: { Origin: base } })
    assert.ok(login.ok())
    const probe = await context.request.post(base + '/api/lien-hotpepper-styles', { data: { action: 'origin-probe', jobId: 'not-a-job' }, headers: { Origin: base } })
    assert.equal(probe.status(), 409, 'Valid production Origin must pass before job validation; probe cannot mutate a job')
    const denied = await context.request.post(base + '/api/lien-hotpepper-styles', { data: {}, headers: { Origin: 'https://evil.test' } })
    assert.equal(denied.status(), 403)
    let job = null, confirms = 0, steps = 0, manual = null, failedConfirmation = false
    const items = [0, 1, 2].map(index => ({ index, url: `https://beauty.hotpepper.jp/slnH000307612/style/L${index + 1}.html`, status: index === 2 ? 'DUPLICATE' : 'PENDING', postId: index === 2 ? 'fixture-duplicate' : undefined }))
    const data = index => ({ title: ['透明感カラーとレイヤーカット', '自然な丸みのショートボブ'][index], stylistName: '山田 花子', photos: [{ direction: 'FRONT', url: base + '/brand/customer-hair-care.webp' }] })
    await context.route('**/api/lien-hotpepper-styles*', async route => {
      const req = route.request()
      if (req.method() === 'POST') {
        const input = req.postDataJSON()
        if (input.action === 'start') {
          assert.equal(input.rightsConfirmed, true)
          assert.equal(input.permissionConfirmed, undefined)
          job = { id: 'fixture-job', automatic: true, sourceUrl: input.url, status: 'DISCOVERING', salonName: 'テストサロン', total: 0, loaded: 0, duplicate: 0, failed: 0, published: 0, processed: 0, ready: 0, discoveredPages: 0, items: [], remainingPages: 1 }
        }
        if (input.action === 'step') {
          steps++
          if (job.status === 'DISCOVERING') job = { ...job, status: 'CONFIRMATION', total: 3, duplicate: 1, processed: 1, discoveredPages: 2, remainingPages: 0, items: structuredClone(items) }
          else if (job.status === 'IMPORTING') {
            const index = job.published
            job.items[index] = { ...job.items[index], data: data(index), status: 'PUBLISHED', postId: 'fixture-' + index }
            job.published++; job.processed++; job.loaded++
            if (job.published === 2) job.status = 'DONE'
          }
        }
        if (input.action === 'confirm') {
          assert.equal(input.total, 3); assert.equal(input.rightsConfirmed, true)
          if (!failedConfirmation) { failedConfirmation = true; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'テスト用の一時エラー' }) }) }
          confirms++; job.status = 'IMPORTING'; job.confirmedAt = new Date().toISOString()
        }
        if (input.action === 'cancel') job.status = 'CANCELLED'
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ job }) })
    })
    await context.route('**/api/lien-community-publish', async route => { manual = route.request().postDataJSON(); await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'テスト送信・未公開' }) }) })
    const page = await context.newPage(), errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + '/admin/community', { waitUntil: 'domcontentloaded' })
    const open = page.getByRole('button', { name: '新しいスタイルを投稿' })
    await open.waitFor()
    await page.waitForTimeout(1200)
    const inheritedErrors = errors.splice(0)
    await open.click()
    const modal = page.locator('.ca-cp-dialog')
    await modal.locator('#hp-manual-title').fill('手動投稿のテスト')
    await modal.locator('[data-ca-cp-rights]').check()
    for (const direction of ['FRONT', 'SIDE', 'BACK']) await modal.locator(`[data-ca-cp-slot="${direction}"] input[type=file]`).setInputFiles({ name: direction + '.png', mimeType: 'image/png', buffer: pixel })
    await modal.getByRole('button', { name: '3方向を公開' }).click()
    await page.waitForFunction(() => document.querySelector('[data-ca-cp-feedback]')?.textContent.includes('テスト送信'))
    assert.equal(manual.photos.length, 3); assert.equal(manual.metadata.title, '手動投稿のテスト')
    await modal.locator('[data-hp-mode]').check()
    await modal.locator('#hp-url').fill('https://beauty.hotpepper.jp/slnH000307612/style/')
    await modal.locator('[data-hp-rights]').check()
    await modal.locator('[data-hp-start]').click()
    assert.equal(await modal.locator('.hp-progress').getAttribute('value'), null)
    const confirmation = page.locator('.hp-confirm[open]')
    await confirmation.waitFor({ timeout: 15000 })
    assert.equal(await confirmation.locator('dd').allTextContents().then(a => a.join(',')), '3件,1件,2件')
    assert.equal(confirms, 0); assert.equal(job.published, 0)
    await page.screenshot({ path: path.join(output, `confirm-${width}.png`) })
    await page.keyboard.press('Escape')
    assert.equal(await confirmation.count(), 0); assert.equal(await modal.count(), 1)
    await modal.locator('[data-hp-show-confirm]').click()
    await confirmation.locator('[data-hp-confirm]').click()
    await confirmation.locator('[data-hp-confirm-feedback]').filter({ hasText: 'テスト用の一時エラー' }).waitFor()
    assert.equal(job.published, 0)
    await confirmation.locator('[data-hp-confirm]').click()
    await page.waitForFunction(() => document.querySelector('.hp-tools')?.textContent.includes('1件保存'), { }, { timeout: 15000 })
    assert.equal(await modal.locator('.hp-progress').getAttribute('value'), '2')
    await page.screenshot({ path: path.join(output, `progress-${width}.png`) })
    await page.waitForFunction(() => document.querySelector('.hp-tools')?.textContent.includes('2件保存'), { }, { timeout: 15000 })
    assert.equal(confirms, 1); assert.equal(job.status, 'DONE')
    const overflow = await modal.evaluate(el => ({ width: el.getBoundingClientRect().width, viewport: innerWidth, document: document.documentElement.scrollWidth }))
    assert.ok(overflow.width <= overflow.viewport && overflow.document <= overflow.viewport)
    await page.keyboard.press('Escape')
    await open.click(); await modal.locator('[data-hp-mode]').check()
    await page.waitForFunction(() => document.querySelector('.hp-tools')?.textContent.includes('2件保存'))
    await page.keyboard.press('Escape')
    assert.equal(errors.length, 0, errors.join('\n'))
    results.push({ width, realOriginProbe: true, confirmation: true, failedConfirmationRetry: true, progress: true, resume: true, manualThreePhotos: true, noOverflow: true, inheritedErrors, steps })
    await context.close()
  }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify({ passed: true, results }))
} finally { await browser.close() }
