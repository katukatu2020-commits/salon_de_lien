import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-store-frequency-v668/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const client = fs.readFileSync(path.join(runtimeRoot, 'customer-link-ui-v293.js'), 'utf8')
fs.mkdirSync(output, { recursive: true })

const visits = [12, 9, 7, 5, 3, 1, 0]
const cards = visits.map((visitCount, index) => `<article class="registered-store-card${index === 3 ? ' current' : ''}">
  <span class="registered-store-mark">S</span>
  <div class="registered-store-copy"><strong>Salon ${index + 1}</strong><p>${index === 3 ? '現在利用中の店舗' : '登録済み'}</p><span class="registered-store-frequency">来店 ${visitCount}回</span></div>
  <div class="registered-store-card-actions">${index === 3 ? '<span class="registered-store-current">利用中</span>' : `<button type="button" data-switch-store="org-${index + 1}">切り替える</button>`}<button type="button" data-remove-store="org-${index + 1}" data-store-name="Salon ${index + 1}">登録を解除</button></div>
</article>`).join('')

const page = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  *{box-sizing:border-box}body{margin:0;background:#fffdfa;color:#302824;font-family:system-ui,sans-serif}main{width:min(840px,100%);margin:auto;padding:20px}.registered-store-title{display:flex;align-items:center;justify-content:space-between;gap:16px}.registered-store-count{display:grid;min-width:72px;min-height:42px;place-items:center;border:1px solid #eadbd3;border-radius:999px;background:#fff;font-weight:800}.registered-store-list{display:grid;gap:12px;margin-top:18px}.registered-store-card{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:14px;border:1px solid #eadbd3;border-radius:8px;background:#fff;padding:16px}.registered-store-card.current{border-color:#dca8b5;background:#fff8fa}.registered-store-mark{display:grid;width:52px;height:52px;place-items:center;border-radius:8px;background:#f6e7e1}.registered-store-card p{margin:4px 0;color:#796d67;font-size:11px}.registered-store-frequency{color:#a43f5f;font-size:11px;font-weight:800}.registered-store-card-actions{display:flex;gap:8px}.registered-store-card button,.registered-store-current{min-height:40px;border:1px solid #dfc8c2;border-radius:999px;background:#fff;padding:0 14px;color:#944039;font-weight:700}.registered-store-current{display:grid;place-items:center;border:0;background:#edf7ef;color:#356143}.registered-store-form{margin-top:18px;border:1px solid #eadbd3;border-radius:8px;background:#fff;padding:18px}.registered-store-form-heading{display:flex;justify-content:space-between;gap:12px}.registered-store-actions{display:grid;gap:10px}.registered-store-code-row{display:flex;gap:8px}.registered-store-code-row input{min-width:0;min-height:48px;flex:1;border:1px solid #d8cbbf;border-radius:8px;padding:0 14px}.registered-store-form button{min-height:44px;border:0;border-radius:999px;background:#c5486b;padding:0 18px;color:#fff;font-weight:800}.registered-store-form output{display:block;min-height:20px;margin-top:10px;color:#a02f28;font-size:11px}.scan-store-qr{background:#7b5c52!important}.lien-store-preview{margin-top:14px;border:1px solid #cbdcca;border-radius:8px;background:#f3f8f2;padding:15px}.lien-store-preview-head{display:flex;gap:12px}.lien-store-preview img{width:52px;height:52px}.lien-store-preview button{width:100%;margin-top:14px}.lien-v293-toast{position:fixed;right:20px;bottom:20px;background:#edf7ef;padding:12px;z-index:10}@media(max-width:640px){main{padding:14px}.registered-store-card{grid-template-columns:48px minmax(0,1fr);padding:14px}.registered-store-card-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}.registered-store-code-row{display:grid}}
</style></head><body><main><section class="registered-store-title"><div><h1>登録済みの店舗</h1></div><span class="registered-store-count">7店舗</span></section><section data-store-count="7"><div class="registered-store-list">${cards}</div><form id="register-store-form" class="registered-store-form" data-store-count="7"><div class="registered-store-form-heading"><div><label for="store-code">新しい店舗を登録</label></div><span>7店舗登録中</span></div><div class="registered-store-actions"><button id="scan-store-qr" class="scan-store-qr" type="button">カメラでQRを読み取る</button><div class="registered-store-code-row"><input id="store-code"><button type="submit">店舗を確認</button></div></div><output id="store-result"></output><div id="store-preview"></div></form></section></main><script src="/customer-link-ui-v293.js?v=668-store-frequency1"></script></body></html>`

const mutations = []
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/customer-link-ui-v293.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' })
    res.end(client)
    return
  }
  if (url.pathname === '/api/lien-customer-stores' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ store: { organizationId: 'org-8', name: 'Salon 8', publicCode: url.searchParams.get('lookup'), iconUrl: '/icon.png', alreadyLinked: false }, storeCount: 7, storeLimit: null, canLink: true }))
    return
  }
  if (url.pathname === '/api/lien-customer-stores' && req.method === 'POST') {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw || '{}')
    mutations.push(body)
    res.writeHead(201, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ ok: true, alreadyLinked: false, redirect: '/u/home', storeLimit: null }))
    return
  }
  if (url.pathname === '/u/home') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end('<!doctype html><title>home</title><h1>ホーム</h1>')
    return
  }
  if (url.pathname === '/icon.png') {
    res.writeHead(204)
    res.end()
    return
  }
  if (url.pathname === '/u/stores') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(page)
    return
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
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
    const view = await context.newPage()
    const errors = []
    view.on('pageerror', error => errors.push(error.message))
    await view.goto(`${base}/u/stores`, { waitUntil: 'networkidle' })
    assert.equal(await view.locator('.registered-store-card').count(), 7)
    assert.equal(await view.locator('.registered-store-count').textContent(), '7店舗')
    assert.deepEqual(await view.locator('.registered-store-frequency').allTextContents(), visits.map(count => `来店 ${count}回`))
    assert.equal(await view.locator('#store-code').isEnabled(), true)
    assert.equal(await view.locator('#scan-store-qr').isEnabled(), true)
    assert.equal(await view.evaluate(() => document.documentElement.dataset.lienStoresV668), '1')
    assert.equal((await view.locator('body').innerText()).includes('最大5店舗'), false)
    assert.ok(await view.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await view.screenshot({ path: path.join(output, `stores-${width}.png`), fullPage: true })

    await view.locator('#store-code').fill('STORE-8')
    await view.locator('#register-store-form button[type=submit]').click()
    await view.getByText('Salon 8', { exact: true }).waitFor()
    const linkRequest = view.waitForRequest(request => request.method() === 'POST' && request.url().endsWith('/api/lien-customer-stores'))
    await view.getByRole('button', { name: 'この店舗を追加する' }).click()
    await linkRequest
    await view.waitForURL('**/u/home')
    assert.ok(mutations.some(item => item.action === 'link' && item.storeCode === 'STORE-8'))
    assert.deepEqual(errors, [])
    results.push({ width, allStoresVisible: true, frequencyOrderVisible: true, unlimitedAddEnabled: true, noOverflow: true })
    await context.close()
  }
  console.log(JSON.stringify({ release: 'customer-store-frequency-v668', browserVerified: true, results }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
