import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-store-unlink-v654/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const client = fs.readFileSync(path.join(runtimeRoot, 'customer-link-ui-v293.js'), 'utf8')
fs.mkdirSync(output, { recursive: true })

const mutations = []

function page(mode, removed) {
  const empty = mode === 'empty'
  const count = empty ? 0 : 1
  const card = empty ? '<p class="registered-store-empty">登録済みの店舗はありません。</p>' : `<article class="registered-store-card current">
    <span class="registered-store-mark">S</span><div><strong>Salon de Lien</strong><p>現在利用中の店舗</p></div>
    <div class="registered-store-card-actions"><span class="registered-store-current">利用中</span><button class="registered-store-remove" type="button" data-remove-store="org-current" data-store-name="Salon de Lien" data-last-store="true">登録を解除</button></div>
  </article>`
  const notice = removed ? '<p class="registered-store-notice" role="status">店舗の登録を解除しました。続けて利用する場合は、新しい店舗を登録してください。</p>' : ''
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    :root{--line:#eadbd3;--rose:#c5486b;--muted:#796d67}*{box-sizing:border-box}body{margin:0;background:#fffdfa;color:#302824;font-family:system-ui,sans-serif}main{width:min(840px,100%);margin:auto;padding:20px}.registered-store-title{display:flex;align-items:center;justify-content:space-between;gap:16px}.registered-store-count{display:grid;min-width:72px;min-height:42px;place-items:center;border:1px solid var(--line);border-radius:999px;background:#fff;font-weight:800}.registered-store-notice{border:1px solid #c7dccd;border-radius:8px;background:#f3f9f4;padding:12px 14px;color:#315f40}.registered-store-list{display:grid;gap:12px;margin-top:18px}.registered-store-card{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:14px;border:1px solid var(--line);border-radius:8px;background:#fff8fa;padding:16px}.registered-store-mark{display:grid;width:52px;height:52px;place-items:center;border-radius:8px;background:#f6e7e1}.registered-store-card p{margin:4px 0 0;color:var(--muted);font-size:11px}.registered-store-card-actions{display:flex;gap:8px}.registered-store-card button,.registered-store-current{min-height:40px;border:1px solid #dfc8c2;border-radius:999px;background:#fff;padding:0 14px;color:#944039;font-weight:700}.registered-store-current{display:grid;place-items:center;border:0;background:#edf7ef;color:#356143}.registered-store-empty{border:1px dashed var(--line);border-radius:8px;padding:26px;color:var(--muted);text-align:center}.registered-store-form{margin-top:18px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:18px}.registered-store-form-heading{display:flex;justify-content:space-between;gap:12px}.registered-store-form-heading p{color:var(--muted);font-size:11px}.registered-store-actions{display:grid;gap:10px;margin-top:14px}.registered-store-code-row{display:flex;gap:8px}.registered-store-code-row input{min-width:0;min-height:48px;flex:1;border:1px solid #d8cbbf;border-radius:8px;padding:0 14px}.registered-store-form button{min-height:44px;border:0;border-radius:999px;background:var(--rose);padding:0 18px;color:#fff;font-weight:800}.registered-store-form output{display:block;min-height:20px;margin-top:10px;color:#a02f28;font-size:11px}.scan-store-qr{background:#7b5c52!important}.lien-store-preview{margin-top:14px;border:1px solid #cbdcca;border-radius:8px;background:#f3f8f2;padding:15px}.lien-store-preview-head{display:flex;gap:12px}.lien-store-preview img{width:52px;height:52px}.lien-store-preview button{width:100%;margin-top:14px}@media(max-width:640px){main{padding:14px}.registered-store-card{grid-template-columns:48px minmax(0,1fr)}.registered-store-card-actions{grid-column:1/-1;display:grid;grid-template-columns:1fr 1fr}.registered-store-code-row{display:grid}}
  </style></head><body><main><section class="registered-store-title"><div><h1>登録済みの店舗</h1><p>利用する美容室の切り替えや、新しい店舗の追加ができます。</p></div><span class="registered-store-count">${count} / 5</span></section>${notice}<section><div class="registered-store-list">${card}</div><form id="register-store-form" class="registered-store-form" data-store-count="${count}" data-store-limit="5"><div class="registered-store-form-heading"><div><label for="store-code">新しい店舗を登録</label><p>店舗識別コードを入力してください。</p></div><span>${count} / 5店舗</span></div><div class="registered-store-actions"><button id="scan-store-qr" type="button">カメラでQRを読み取る</button><div class="registered-store-code-row"><input id="store-code"><button type="submit">店舗を確認</button></div></div><output id="store-result"></output><div id="store-preview"></div></form></section></main><script src="/customer-link-ui-v293.js?v=654-store-unlink1"></script></body></html>`
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/customer-link-ui-v293.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'no-store' })
    res.end(client)
    return
  }
  if (url.pathname === '/api/lien-customer-stores' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ store: { organizationId: 'org-new', name: '新しい美容室', publicCode: url.searchParams.get('lookup'), iconUrl: '/icon.png', alreadyLinked: false }, storeCount: 0, maxStores: 5, canLink: true }))
    return
  }
  if (url.pathname === '/api/lien-customer-stores' && req.method === 'POST') {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw || '{}')
    mutations.push(body)
    res.writeHead(body.action === 'link' ? 201 : 200, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(body.action === 'unlink'
      ? { ok: true, removed: true, switched: false, storeSelectionRequired: true, redirect: '/u/stores?mode=empty&removed=1', storeCount: 0, maxStores: 5 }
      : { ok: true, alreadyLinked: false, redirect: '/u/home', maxStores: 5 }))
    return
  }
  if (url.pathname === '/icon.png') { res.writeHead(204); res.end(); return }
  if (url.pathname === '/u/home') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end('<!doctype html><html lang="ja"><h1>ホーム</h1></html>')
    return
  }
  if (url.pathname === '/u/stores') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(page(url.searchParams.get('mode') || 'single', url.searchParams.get('removed') === '1'))
    return
  }
  res.writeHead(404); res.end('not found')
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
    const pageUnderTest = await context.newPage()
    const errors = []
    let confirmation = ''
    pageUnderTest.on('pageerror', error => errors.push(error.message))
    pageUnderTest.on('dialog', async dialog => { confirmation = dialog.message(); await dialog.accept() })
    await pageUnderTest.goto(`${base}/u/stores?mode=single`, { waitUntil: 'networkidle' })
    const remove = pageUnderTest.locator('[data-remove-store="org-current"]')
    assert.equal(await remove.isEnabled(), true)
    assert.equal(await remove.getAttribute('data-last-store'), 'true')
    await remove.click()
    await pageUnderTest.waitForURL('**/u/stores?mode=empty&removed=1')
    assert.match(confirmation, /新しい店舗を登録するまで店舗機能を利用できません/)
    assert.equal(await pageUnderTest.locator('.registered-store-card').count(), 0)
    assert.match(await pageUnderTest.locator('.registered-store-notice').textContent(), /登録を解除しました/)
    assert.ok(mutations.some(item => item.action === 'unlink' && item.organizationId === 'org-current'))

    await pageUnderTest.locator('#store-code').fill('STORE-NEW')
    await pageUnderTest.locator('#register-store-form button[type=submit]').click()
    await pageUnderTest.getByText('新しい美容室', { exact: true }).waitFor()
    await pageUnderTest.getByRole('button', { name: 'この店舗を追加する' }).click()
    await pageUnderTest.waitForURL('**/u/home')
    assert.ok(mutations.some(item => item.action === 'link' && item.storeCode === 'STORE-NEW'))
    assert.deepEqual(errors, [])

    const screenshotPage = await context.newPage()
    await screenshotPage.goto(`${base}/u/stores?mode=empty&removed=1`, { waitUntil: 'networkidle' })
    assert.ok(await screenshotPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
    await screenshotPage.screenshot({ path: path.join(output, `empty-after-unlink-${width}.png`), fullPage: true })
    results.push({ width, lastStoreRemovalEnabled: true, removalWarning: true, emptyState: true, relinkRedirect: true, noOverflow: true })
    await context.close()
  }
  console.log(JSON.stringify({ release: 'customer-store-unlink-v654', browserVerified: true, results }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
