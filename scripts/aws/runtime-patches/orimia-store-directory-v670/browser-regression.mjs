import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const browserRequire = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const runtimeRequire = createRequire(import.meta.url)
const { chromium } = browserRequire('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const releaseRoot = path.dirname(fileURLToPath(import.meta.url))
const output = process.env.SCREENSHOT_DIR || 'artifacts/orimia-store-directory-v670/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const directory = runtimeRequire(path.join(runtimeRoot, 'orimia-store-directory-v670.js'))
const customerClient = fs.readFileSync(path.join(runtimeRoot, 'customer-link-ui-v424.js'), 'utf8')
const publicationClient = fs.readFileSync(path.join(releaseRoot, 'orimia-publication-client-v670.js'), 'utf8')
fs.mkdirSync(output, { recursive: true })

const stores = [
  { organizationId: 'org-tokyo', name: '青山ヘアスタジオ', prefecture: '東京都', city: '渋谷区', addressLine1: '神宮前1-2-3', phone: '03-1111-2222', current: false, linked: false },
  { organizationId: 'org-okayama-current', name: 'Salon de Lien', prefecture: '岡山県', city: '岡山市', addressLine1: '北区駅元町1-1', phone: '086-111-2222', current: true, linked: true },
  { organizationId: 'org-okayama-b', name: 'ヘアサロン ハレルヤ', prefecture: '岡山県', city: '倉敷市', addressLine1: '阿知1-2-3', phone: '', current: false, linked: false },
  { organizationId: 'org-no-prefecture', name: 'サロン ノース', prefecture: '都道府県未設定', city: '', addressLine1: '', phone: '', current: false, linked: false },
]

const shellStyle = `*{box-sizing:border-box}:root{--rose:#c5486b;--muted:#80736c;--line:#eadbd3}body{margin:0;background:#fffdfa;color:#302824;font-family:-apple-system,BlinkMacSystemFont,"Yu Gothic",sans-serif}.content{width:min(1040px,100%);margin:auto;padding:24px}.page-title{padding:12px 18px 20px}.page-title h1{margin:0;font-family:"Yu Mincho",serif;font-size:30px;letter-spacing:0}@media(max-width:680px){.content{padding:12px 4px}.page-title{padding:10px 14px 16px}}`
const customerPage = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${shellStyle}</style></head><body><main class="content">${directory.renderDirectory(stores)}</main><script src="/customer-link-ui-v424.js?v=670-orimia-directory1"></script></body></html>`
const settingsPage = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${shellStyle}main{width:min(1152px,100%);margin:auto;padding:24px}.ca-setup-card{border:1px solid #eadbd3;border-radius:20px;background:#fff}.ca-setup-hero{padding:22px 24px}.ca-setup-hero h2{margin:0;font-size:26px}.ca-profile-grid{min-height:180px;border-top:1px solid #eee4de;padding:24px}</style></head><body><main><section id="store-profile" class="ca-setup-card" data-ca-store-settings="1"><header class="ca-setup-hero"><h2>店舗基本設定</h2></header><div class="ca-profile-grid">店舗情報フォーム</div></section></main><script src="/orimia-publication-client-v670.js"></script></body></html>`

const requests = []
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/customer-link-ui-v424.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' })
    return res.end(customerClient)
  }
  if (url.pathname === '/orimia-publication-client-v670.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' })
    return res.end(publicationClient)
  }
  if (url.pathname === '/api/lien-store-icon') {
    res.writeHead(302, { Location: '/mark.svg' })
    return res.end()
  }
  if (url.pathname === '/mark.svg') {
    res.writeHead(200, { 'content-type': 'image/svg+xml' })
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#f2e3dd"/><circle cx="32" cy="32" r="15" fill="#c5486b"/></svg>')
  }
  if (url.pathname === '/api/lien-customer-stores' && req.method === 'POST') {
    let raw = ''
    for await (const chunk of req) raw += chunk
    requests.push({ path: url.pathname, body: JSON.parse(raw || '{}') })
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({ ok: true, redirect: '/u/home' }))
  }
  if (url.pathname === '/api/admin/store-profile' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({ ok: true, profile: { canEdit: true, orimiaPublished: true } }))
  }
  if (url.pathname === '/api/admin/store-profile' && req.method === 'POST') {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw || '{}')
    requests.push({ path: url.pathname, body })
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify({ ok: true, profile: { canEdit: true, orimiaPublished: body.published === true } }))
  }
  if (url.pathname === '/u/stores') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    return res.end(customerPage)
  }
  if (url.pathname === '/admin/settings') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    return res.end(settingsPage)
  }
  if (url.pathname === '/u/home') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    return res.end('<!doctype html><h1>ホーム</h1>')
  }
  res.writeHead(404)
  res.end('not found')
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath, headless: true })
const results = []

try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 940 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${base}/u/stores`, { waitUntil: 'networkidle' })
    assert.equal(await page.locator('.orimia-store-card').count(), 4)
    assert.deepEqual(await page.locator('.orimia-prefecture-group h2').allTextContents(), ['東京都', '岡山県', '都道府県未設定'])
    assert.equal(await page.locator('.orimia-store-current').count(), 1)
    assert.equal(await page.locator('[data-select-orimia-store]').count(), 3)
    const text = await page.locator('body').innerText()
    assert.equal(text.includes('新しい店舗を登録'), false)
    assert.equal(text.includes('登録を解除'), false)
    assert.equal(text.includes('QRを読み取る'), false)
    assert.equal(await page.evaluate(() => document.documentElement.dataset.lienStoresV670), '1')
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    assert.deepEqual(errors, [])
    await page.screenshot({ path: path.join(output, `directory-${width}.png`), fullPage: true })
    if (width === 390) {
      const switchRequest = page.waitForRequest(request => request.url().endsWith('/api/lien-customer-stores') && request.method() === 'POST')
      await page.getByRole('button', { name: '青山ヘアスタジオを利用する' }).click()
      await switchRequest
      await page.waitForURL('**/u/home')
    }
    results.push({ width, publicStoreCount: 4, prefectureGroups: 3, noRegistrationControls: true, noOverflow: true })
    await context.close()
  }

  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
  const admin = await adminContext.newPage()
  const adminErrors = []
  admin.on('pageerror', error => adminErrors.push(error.message))
  await admin.goto(`${base}/admin/settings`, { waitUntil: 'networkidle' })
  const publication = admin.locator('#orimia-publication-v670')
  await publication.waitFor({ state: 'visible' })
  const toggle = publication.getByRole('switch')
  assert.equal(await toggle.getAttribute('aria-checked'), 'true')
  const publicationRequest = admin.waitForRequest(request => request.url().endsWith('/api/admin/store-profile') && request.method() === 'POST')
  await toggle.click()
  await publicationRequest
  await admin.getByText('ORIMIA上で非公開にしました。').waitFor()
  assert.equal(await toggle.getAttribute('aria-checked'), 'false')
  assert.equal(await admin.locator('.lien-store-qr-card,[data-sm-store-code]').count(), 0)
  assert.ok(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
  assert.deepEqual(adminErrors, [])
  await admin.waitForTimeout(250)
  await admin.screenshot({ path: path.join(output, 'settings-publication-390.png'), fullPage: true })
  await adminContext.close()

  assert.ok(requests.some(item => item.path === '/api/lien-customer-stores' && item.body.action === 'switch' && item.body.organizationId === 'org-tokyo'))
  assert.ok(requests.some(item => item.path === '/api/admin/store-profile' && item.body.action === 'update-orimia-publication' && item.body.published === false))
  console.log(JSON.stringify({ release: 'orimia-store-directory-v670', browserVerified: true, results, publicationToggleVerified: true }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
