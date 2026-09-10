import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3613').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/hotpepper-menu-import-v612/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

function initialJob() {
  const items = [
    { index: 0, status: 'DUPLICATE', menuId: 'existing-1', sourceKey: 'hp:1', name: '似合わせカット', category: 'カット', description: '', durationMinutes: 60, durationEstimated: true, priceYen: 5500, priceDisplay: '¥5,500', priceIsMinimum: false },
    { index: 1, status: 'READY', menuId: null, sourceKey: 'hp:2', name: 'カット＋透明感カラー', category: 'カット・カラー', description: 'ロング料金があります。', durationMinutes: 150, durationEstimated: true, priceYen: 13200, priceDisplay: '¥13,200～', priceIsMinimum: true },
    { index: 2, status: 'READY', menuId: null, sourceKey: 'hp:3', name: '頭皮リセットスパ', category: 'ヘッドスパ', description: '頭皮を整えるケアです。', durationMinutes: 30, durationEstimated: true, priceYen: 4400, priceDisplay: '¥4,400', priceIsMinimum: false },
  ]
  return summarize({
    id: 'job-browser-v612',
    status: 'PREVIEW',
    sourceUrl: 'https://beauty.hotpepper.jp/slnH000307612/coupon/CT00/',
    salonName: 'Salon de Lien',
    startedAt: Date.now(),
    confirmedAt: null,
    sourceWarnings: [],
    selectedIndices: [],
    items,
  })
}

function summarize(job) {
  const selected = new Set(job.selectedIndices || [])
  const selectedItems = job.items.filter(item => selected.has(item.index))
  return {
    ...job,
    total: job.items.length,
    available: job.items.filter(item => item.status === 'READY').length,
    duplicate: job.items.filter(item => item.status === 'DUPLICATE').length,
    skipped: job.items.filter(item => item.status === 'SKIPPED').length,
    imported: job.items.filter(item => item.status === 'IMPORTED').length,
    failed: job.items.filter(item => item.status === 'ERROR').length,
    selected: selectedItems.length,
    processed: selectedItems.filter(item => ['IMPORTED', 'DUPLICATE', 'ERROR', 'SKIPPED'].includes(item.status)).length,
  }
}

async function staffLogin(context) {
  const response = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/products?section=menus' },
  })
  assert.ok(response.ok(), `Staff login returned ${response.status()}`)
}

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return errors
}

function unexpected(errors) {
  return errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))
}

async function verify(viewport, name, completeImport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
  await staffLogin(context)
  const apiSmoke = await context.request.get(base + '/api/lien-hotpepper-menus-v612')
  assert.ok(apiSmoke.ok(), `Menu import API returned ${apiSmoke.status()}`)
  const page = await context.newPage()
  const errors = collectErrors(page)
  let job = null

  await page.route('**/api/lien-hotpepper-menus-v612', async route => {
    const request = route.request()
    if (request.method() === 'GET') {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ job: null }) })
      return
    }
    const input = request.postDataJSON()
    if (input.action === 'start') {
      job = initialJob()
    } else if (input.action === 'edit') {
      job.items[input.index] = {
        ...job.items[input.index],
        ...input.menu,
        durationEstimated: false,
        priceDisplay: `${Number(input.menu.priceYen).toLocaleString('ja-JP')}円`,
      }
      job = summarize(job)
    } else if (input.action === 'confirm') {
      const selected = new Set(input.indices)
      job.items = job.items.map(item => item.status === 'READY'
        ? { ...item, status: selected.has(item.index) ? 'QUEUED' : 'SKIPPED' }
        : item)
      job.status = 'IMPORTING'
      job.selectedIndices = [...selected]
      job.confirmedAt = new Date().toISOString()
      job = summarize(job)
    } else if (input.action === 'tick') {
      const queued = job.items.find(item => item.status === 'QUEUED')
      if (queued) queued.status = 'IMPORTED'
      if (!job.items.some(item => item.status === 'QUEUED')) job.status = 'DONE'
      job = summarize(job)
    }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ job }) })
  })

  await page.goto(base + '/admin/products?section=menus&verify=v612-' + name, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '新しいメニューを追加' }).click()
  const hostDialog = page.locator('section[role="dialog"]')
  await hostDialog.waitFor({ state: 'visible' })
  const root = hostDialog.locator('.orimia-menu-import-v612')
  await root.waitFor({ state: 'visible' })
  assert.equal(await hostDialog.locator('input[name="menuName"]').isVisible(), true)

  await root.locator('[data-menu-import-mode-v612]').check()
  assert.equal(await hostDialog.locator('input[name="menuName"]').isVisible(), false)
  await root.locator('[data-menu-import-url-v612]').fill('https://beauty.hotpepper.jp/slnH000307612/coupon/CT00/')
  await root.locator('[data-menu-import-rights-v612]').check()
  await root.getByRole('button', { name: '内容を確認' }).click()
  await root.getByText('取得件数').waitFor()
  assert.equal(await root.getByText('3件', { exact: true }).count() > 0, true)
  assert.equal(await root.getByText('登録済み', { exact: true }).count() > 0, true)
  assert.equal(await root.getByText('2件を取り込む', { exact: true }).count(), 1)

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    dialog: (() => {
      const node = document.querySelector('section[role="dialog"]')
      const box = node.getBoundingClientRect()
      return { left: box.left, right: box.right, width: box.width }
    })(),
  }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, 'Page has horizontal overflow')
  assert.ok(layout.dialog.left >= -1 && layout.dialog.right <= layout.viewport + 1, 'Menu dialog is outside viewport')

  if (completeImport) {
    await root.getByRole('button', { name: '編集' }).first().click()
    const editor = page.locator('.orimia-menu-import-editor-v612')
    await editor.waitFor({ state: 'visible' })
    await editor.locator('input[name="durationMinutes"]').fill('140')
    await editor.getByRole('button', { name: '変更を保存' }).click()
    await editor.waitFor({ state: 'detached' })
    assert.equal(await root.getByText('140分').count() > 0, true)

    await root.getByRole('button', { name: '2件を取り込む' }).click()
    const confirmation = page.locator('.orimia-menu-import-dialog-v612:not(.orimia-menu-import-editor-v612)')
    await confirmation.waitFor({ state: 'visible' })
    assert.equal(await confirmation.getByText('今回取り込むメニュー').count(), 1)
    assert.equal(await confirmation.getByText('2件', { exact: true }).count() > 0, true)
    await page.screenshot({ path: path.join(output, 'confirmation-desktop.png'), fullPage: false })
    await confirmation.getByRole('button', { name: '2件を取り込む' }).click()
    await root.getByText('取り込みが完了しました').waitFor({ timeout: 10_000 })
    assert.equal(await root.getByText('保存 2件', { exact: true }).count(), 1)
  }

  await page.screenshot({ path: path.join(output, `menu-import-${name}.png`), fullPage: false })
  results.push({ name, layout, completeImport, errors: unexpected(errors) })
  assert.deepEqual(unexpected(errors), [], `${name} has unexpected browser errors`)
  await context.close()
}

try {
  await verify({ width: 1280, height: 900 }, 'desktop', true)
  await verify({ width: 390, height: 844 }, 'mobile', false)
  console.log(JSON.stringify({ release: 'v612', results }, null, 2))
} finally {
  await browser.close()
}
