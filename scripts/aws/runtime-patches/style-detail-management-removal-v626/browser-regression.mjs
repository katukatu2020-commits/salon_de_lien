import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const here = path.dirname(fileURLToPath(import.meta.url))
const base = String(process.env.SMOKE_BASE_URL || '').replace(/\/$/, '')
const injectLiveClient = process.env.SMOKE_INJECT_CLIENT === '1'
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-detail-management-removal-v626/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const client = '(() => {})()\n' + fs.readFileSync(path.join(here, 'style-detail-management-removal-v626.js'), 'utf8')
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const results = { synthetic: {}, live: [] }

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => {
    if (!error.message.includes('Minified React error #418') &&
        !error.message.includes('Minified React error #423') &&
        !error.message.includes('Minified React error #329')) errors.push('page: ' + error.message)
  })
  page.on('console', message => {
    if (message.type() === 'error' &&
        !message.text().includes('Failed to load resource: the server responded with a status of 404') &&
        !message.text().includes('net::ERR_NAME_NOT_RESOLVED')) errors.push('console: ' + message.text())
  })
  return errors
}

function shell(styleDetail = true) {
  const articleClass = styleDetail ? ' class="orimia-style-detail-staff-v602"' : ''
  const detailClass = styleDetail ? ' orimia-style-details-v602' : ''
  return '<!doctype html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:sans-serif;margin:24px}.panel{border:1px solid #ddd;padding:16px;margin:12px 0}' +
    '</style></head><body><main><article' + articleClass + '>' +
    '<section class="panel lien-owner-panel" aria-label="投稿管理"><p>投稿文はありません。</p>' +
    '<button>投稿文を編集</button><button>非公開にする</button><button>投稿を削除</button></section>' +
    '<section class="panel' + detailClass + '" aria-label="スタイル情報"><h1>サロンスタイル</h1></section>' +
    '<section class="panel" aria-label="コメント"><p>お客様のコメント</p></section>' +
    '<button data-orimia-style-visibility-v625>非公開にする</button>' +
    '<button data-orimia-style-delete-v625>削除</button></article></main></body></html>'
}

async function syntheticPage(pathname, html = shell()) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.route('http://v626.local/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: html }))
  await page.goto('http://v626.local' + pathname)
  await page.addScriptTag({ content: client })
  await page.waitForTimeout(100)
  return { context, page, errors }
}

async function verifySynthetic() {
  const detail = await syntheticPage('/admin/community/style-1')
  assert.equal(await detail.page.locator('[aria-label="投稿管理"]').count(), 0)
  assert.equal(await detail.page.locator('[aria-label="スタイル情報"]').count(), 1)
  assert.equal(await detail.page.locator('[aria-label="コメント"]').count(), 1)
  assert.equal(await detail.page.locator('[data-orimia-style-visibility-v625]').count(), 1)
  assert.equal(await detail.page.locator('[data-orimia-style-delete-v625]').count(), 1)

  await detail.page.evaluate(() => {
    const panel = document.createElement('section')
    panel.setAttribute('aria-label', '投稿管理')
    panel.textContent = '再描画された管理枠'
    document.querySelector('article').prepend(panel)
  })
  await detail.page.waitForFunction(() => !document.querySelector('[aria-label="投稿管理"]'))
  assert.deepEqual(detail.errors, [])
  await detail.page.screenshot({ path: path.join(output, 'synthetic-detail-mobile.png'), fullPage: true })
  await detail.context.close()

  const list = await syntheticPage('/admin/community')
  assert.equal(await list.page.locator('[aria-label="投稿管理"]').count(), 1, 'list route was modified')
  assert.equal(await list.page.locator('[data-orimia-style-visibility-v625]').count(), 1)
  assert.equal(await list.page.locator('[data-orimia-style-delete-v625]').count(), 1)
  assert.deepEqual(list.errors, [])
  await list.context.close()

  const customer = await syntheticPage('/u/community/style-1')
  assert.equal(await customer.page.locator('[aria-label="投稿管理"]').count(), 1, 'customer detail was modified')
  assert.equal(await customer.page.locator('[aria-label="スタイル情報"]').count(), 1)
  assert.deepEqual(customer.errors, [])
  await customer.context.close()

  const regularPost = await syntheticPage('/admin/community/regular-1', shell(false))
  assert.equal(await regularPost.page.locator('[aria-label="投稿管理"]').count(), 1, 'regular post management was removed')
  assert.deepEqual(regularPost.errors, [])
  await regularPost.context.close()

  results.synthetic = {
    staffDetailRemoved: true,
    rerenderRemoved: true,
    listPreserved: true,
    customerPreserved: true,
    regularPostPreserved: true,
  }
}

async function staffLogin(context) {
  const response = await context.request.post(base + '/api/auth/login', {
    headers: { Origin: base },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(response.ok(), 'Staff login returned ' + response.status())
}

async function verifyLiveViewport(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
  await staffLogin(context)
  if (!injectLiveClient) {
    const assetResponse = await context.request.get(base + '/style-admin-controls-v618.js?v=626-detail-cleanup1')
    assert.ok(assetResponse.ok(), 'Style admin client returned ' + assetResponse.status())
    assert.ok((await assetResponse.text()).includes('style-detail-management-removal-v626'), 'Deployed cleanup client is missing')
  }
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(base + '/admin/community?verify=v626-list-' + width, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  const root = page.locator('.orimia-style-admin-v618')
  await root.waitFor({ state: 'visible', timeout: 30_000 })
  await root.locator('[data-orimia-style-visibility-v625]').first().waitFor({ state: 'visible', timeout: 30_000 })
  const visibilityCount = await root.locator('[data-orimia-style-visibility-v625]').count()
  const deleteCount = await root.locator('[data-orimia-style-delete-v625]').count()
  assert.ok(visibilityCount > 0, width + ': list publication controls disappeared')
  assert.equal(deleteCount, visibilityCount, width + ': list delete controls disappeared')

  const publicCard = root.locator('.orimia-admin-style-card-v618[data-orimia-style-published-v625="true"]').first()
  await publicCard.waitFor({ state: 'visible', timeout: 30_000 })
  const href = await publicCard.getAttribute('href')
  assert.ok(href, width + ': no published style detail is available')
  const detailUrl = new URL(href, base)
  detailUrl.searchParams.set('verify', 'v626-' + width)
  await page.goto(detailUrl.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 })
  if (injectLiveClient) await page.addScriptTag({ content: client })
  await page.locator('main').waitFor({ state: 'visible', timeout: 30_000 })
  await page.waitForTimeout(1200)
  const integratedDetail = await page.locator('.orimia-style-detail-staff-v602, .orimia-style-details-v602').count() > 0
  if (integratedDetail) {
    for (let check = 0; check < 4; check += 1) {
      assert.equal(await page.locator('[aria-label="投稿管理"]').count(), 0, width + ': management panel returned after rerender')
      assert.equal(await page.locator('.orimia-style-detail-controls-v625').count(), 0, width + ': duplicate v625 detail controls returned')
      await page.waitForTimeout(300)
    }
    assert.ok(await page.locator('.orimia-style-details-v602').count() > 0, width + ': style information was removed')
    assert.ok(await page.locator('body').innerText().then(text => !text.includes('投稿文はありません。')), width + ': empty caption remained')
  }

  const layout = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    loaderVisibility: document.getElementById('orimia-ui-loader-v536')
      ? getComputedStyle(document.getElementById('orimia-ui-loader-v536')).visibility
      : null,
  }))
  assert.ok(layout.documentWidth <= layout.viewport + 2, width + ': detail has horizontal overflow')
  assert.ok(layout.loaderVisibility === null || layout.loaderVisibility === 'hidden', width + ': loader remained visible')
  await page.screenshot({ path: path.join(output, 'live-detail-' + width + '.png') })

  assert.deepEqual(errors, [], width + ': unexpected browser errors')

  results.live.push({ width, detailPath: detailUrl.pathname, integratedDetail, visibilityCount, deleteCount, layout })
  await context.close()
}

try {
  await verifySynthetic()
  if (base) {
    await verifyLiveViewport(390)
    await verifyLiveViewport(1280)
  }
  console.log(JSON.stringify({
    release: 'style-detail-management-removal-v626',
    browserVerified: true,
    liveVerified: Boolean(base),
    results,
  }))
} finally {
  await browser.close()
}
