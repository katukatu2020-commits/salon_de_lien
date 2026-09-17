import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'mobile-commercial-v657', 'dealer-browser')
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/chromium')
const client = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-client-v543.js'), 'utf8')
const baseCss = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-v543.css'), 'utf8')
const mobileCss = fs.readFileSync(path.join(runtimeRoot, 'public', 'mobile-workspaces-v657.css'), 'utf8')
const mobileScript = fs.readFileSync(path.join(runtimeRoot, 'public', 'mobile-workspaces-v657.js'), 'utf8')
fs.mkdirSync(output, { recursive: true })

const products = [
  { id: 'product-1', manufacturerName: 'ミルボン', name: 'オージュア スムース トリートメント', category: 'ヘアケア', productCode: 'MIL-001', janCode: '4900000000001', listPrice: 5000, orderUnit: 1, active: true },
  { id: 'product-2', manufacturerName: 'サンコール', name: 'ボタニエンス アロマオイル 100ml', category: 'スタイリング', productCode: 'SUN-002', janCode: '4900000000002', listPrice: 2600, orderUnit: 1, active: true },
  { id: 'product-3', manufacturerName: 'オリミア', name: 'モイスチャーシャンプー 300ml', category: 'シャンプー', productCode: 'ORI-003', janCode: '4900000000003', listPrice: 3200, orderUnit: 2, active: true },
]

const contracts = [
  { id: 'contract-1', dealerId: 'dealer-v657', organizationName: 'Salon de Lien 岡山駅東口店', status: 'ACTIVE', publicCode: 'LIEN-OKAYAMA', customerCode: 'LIEN-OKAYAMA', phone: '086-000-0000', prefecture: '岡山県', city: '岡山市' },
  { id: 'contract-2', dealerId: 'dealer-v657', organizationName: 'ヘアサロン ハレルヤ', status: 'PENDING', publicCode: 'HALLELUJAH', customerCode: 'HALLELUJAH', phone: '086-111-2222', prefecture: '岡山県', city: '倉敷市' },
]

const orders = [
  { id: 'order-1', orderNo: 'PO-20260917-V657', organizationName: 'Salon de Lien 岡山駅東口店', deliveryNo: 'DN-20260917-V657', status: 'SHIPPED', orderedAt: '2026-09-17T01:00:00.000Z', shippedAt: '2026-09-17T03:00:00.000Z', requestedDeliveryDate: '2026-09-20', totalYen: 11275, subtotalYen: 10250, taxYen: 1025, lineCount: 2, totalQuantity: 3 },
  { id: 'order-2', orderNo: 'PO-20260916-V657', organizationName: 'ヘアサロン ハレルヤ', status: 'ORDERED', orderedAt: '2026-09-16T02:30:00.000Z', totalYen: 5720, subtotalYen: 5200, taxYen: 520, lineCount: 1, totalQuantity: 2 },
]

const profile = {
  companyName: '株式会社スーパーヤマモト',
  storeName: '岡山営業所',
  representativeName: '山本 太郎',
  invoiceRegistrationNumber: 'T1234567890123',
  email: 'orders@example.jp',
  phone: '086-000-0000',
  postalCode: '700-0000',
  prefecture: '岡山県',
  city: '岡山市北区',
  addressLine1: '駅前町1-1-1',
  addressLine2: 'ORIMIAビル3F',
  websiteUrl: 'https://example.jp',
  businessHours: '平日 9:00〜18:00',
  loginId: 'yamamoto',
  dealerCode: 'DLR-YAMAMOTO',
}

const nav = [
  ['orders', '受注管理'], ['salons', '契約美容室'], ['products', '商品管理'],
  ['pricing', '契約価格'], ['company', '会社情報'], ['password', 'パスワード'],
]

function icon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12h8M12 8v8"/></svg>'
}

function navMarkup(active) {
  return nav.map(([view, label]) => `<a class="${view === active ? 'active' : ''}" href="/dealer/${view === 'password' ? 'password-change' : view}">${icon()}<span>${label}</span></a>`).join('')
}

function appShell(view, mobileEnabled) {
  const title = nav.find(item => item[0] === view)?.[1] || '受注管理'
  const mobileAssets = mobileEnabled ? '<link rel="stylesheet" href="/mobile-workspaces-v657.css"><script src="/mobile-workspaces-v657.js" defer></script>' : ''
  const isPassword = view === 'password'
  const content = isPassword
    ? `<section class="wo-workspace wo-password-workspace-v653"><header class="wo-workspace-head"><div><p class="wo-section-label">ACCOUNT SECURITY</p><h2>パスワード変更</h2><p>現在のパスワードを確認し、新しいパスワードへ変更します。</p></div><span class="wo-private-chip">事業者専用</span></header><div class="wo-password-content-v653"><aside class="wo-password-summary-v653">${icon()}<h2>安全なログイン</h2><p>10文字以上で、推測されにくいパスワードを設定してください。</p><dl><div><dt>ログインID</dt><dd>yamamoto</dd></div></dl></aside><form class="wo-password-form-v653"><div class="wo-password-fields-v653"><label class="wo-password-field-v653"><span>現在のパスワード</span><span class="wo-password-control-v653"><input type="password"><button class="wo-password-toggle-v653" type="button" aria-label="表示">${icon()}</button></span></label><label class="wo-password-field-v653"><span>新しいパスワード</span><span class="wo-password-control-v653"><input type="password"><button class="wo-password-toggle-v653" type="button" aria-label="表示">${icon()}</button></span></label><label class="wo-password-field-v653"><span>新しいパスワード（確認）</span><span class="wo-password-control-v653"><input type="password"><button class="wo-password-toggle-v653" type="button" aria-label="表示">${icon()}</button></span></label></div><p class="wo-password-policy-v653">10文字以上のパスワードを入力してください。</p><footer class="wo-password-actions-v653"><p>変更後は新しいパスワードでログインしてください。</p><button class="wo-button wo-button-primary" type="button">パスワードを変更</button></footer></form></div></section>`
    : '<div id="wholesale-app" class="wo-app-root"><div class="wo-loading"><span></span><p>管理情報を読み込んでいます</p></div></div>'
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/wholesale-ordering-v543.css">${mobileAssets}</head><body class="wo-body wo-dealer-body" data-wholesale-page="${isPassword ? '' : 'dealer'}" data-dealer-view="${view}"><div class="wo-dealer-layout"><aside class="wo-dealer-sidebar"></aside><div class="wo-dealer-stage"><header class="wo-dealer-topbar"><div><small>DEALER PORTAL</small><strong>${title}</strong></div><span>スーパーヤマモト</span></header><main class="wo-main"><section class="wo-page-head"><div><p class="wo-eyebrow">DEALER PORTAL</p><h1>${title}</h1><p>取引業務を効率よく管理します。</p></div></section>${content}</main></div></div><nav class="wo-dealer-mobile-nav" aria-label="ディーラー管理">${navMarkup(view)}</nav>${isPassword ? '' : '<script src="/wholesale-ordering-client-v543.js"></script>'}</body></html>`
}

function bootstrap(url) {
  const view = url.searchParams.get('view') || ''
  return {
    ok: true,
    dealer: { id: 'dealer-v657', name: 'スーパーヤマモト', loginId: 'yamamoto', dealerCode: 'DLR-YAMAMOTO' },
    contracts,
    products,
    contractProductPrices: [
      { contractId: 'contract-1', dealerProductId: 'product-1', discountRate: 20 },
      { contractId: 'contract-1', dealerProductId: 'product-2', discountRate: 25 },
    ],
    orders,
    productPagination: view === 'products' ? { page: 1, pageSize: 30, totalCount: products.length, totalPages: 1, query: url.searchParams.get('productSearch') || '' } : null,
    pricingPagination: view === 'pricing' ? { page: 1, pageSize: 30, totalCount: products.length, totalPages: 1, totalProductCount: products.length, configuredCount: 2, contractId: 'contract-1', query: url.searchParams.get('pricingSearch') || '' } : null,
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const route = url.pathname.match(/^\/dealer\/(orders|salons|products|pricing|company|password-change)$/)
  if (route) {
    const view = route[1] === 'password-change' ? 'password' : route[1]
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(appShell(view, url.searchParams.get('mobileCss') !== '0'))
    return
  }
  if (url.pathname === '/wholesale-ordering-client-v543.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(client)
    return
  }
  if (url.pathname === '/wholesale-ordering-v543.css') {
    res.writeHead(200, { 'content-type': 'text/css; charset=utf-8' })
    res.end(baseCss)
    return
  }
  if (url.pathname === '/mobile-workspaces-v657.css') {
    res.writeHead(200, { 'content-type': 'text/css; charset=utf-8' })
    res.end(mobileCss)
    return
  }
  if (url.pathname === '/mobile-workspaces-v657.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' })
    res.end(mobileScript)
    return
  }
  if (url.pathname === '/api/dealer/bootstrap') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(bootstrap(url)))
    return
  }
  if (url.pathname === '/api/dealer/profile') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify({ ok: true, profile }))
    return
  }
  res.writeHead(404)
  res.end('not found')
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})

const baseUrl = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ executablePath, headless: true })
const views = ['orders', 'salons', 'products', 'pricing', 'company', 'password-change']
const results = []

async function desktopSignature(page, route, mobileEnabled) {
  const diagnostics = []
  page.on('pageerror', error => diagnostics.push(`pageerror: ${error.message}`))
  page.on('console', message => { if (message.type() === 'error') diagnostics.push(`console: ${message.text()}`) })
  page.on('request', request => diagnostics.push(`request: ${new URL(request.url()).pathname}${new URL(request.url()).search}`))
  page.on('response', response => { if (response.status() >= 400) diagnostics.push(`response: ${response.status()} ${response.url()}`) })
  await page.goto(`${baseUrl}/dealer/${route}?mobileCss=${mobileEnabled ? '1' : '0'}`, { waitUntil: 'networkidle' })
  try {
    await page.locator('.wo-workspace').waitFor({ state: 'visible', timeout: 10_000 })
  } catch (error) {
    const rootText = await page.locator('#wholesale-app').textContent().catch(() => '')
    throw new Error(`${error.message}\nRoot: ${rootText}\nDiagnostics: ${diagnostics.join(' | ')}`)
  }
  return page.evaluate(() => {
    const values = selector => {
      const element = document.querySelector(selector)
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return { display: style.display, width: rect.width, height: rect.height, padding: style.padding, borderRadius: style.borderRadius, fontSize: style.fontSize }
    }
    return {
      main: values('.wo-main'),
      workspace: values('.wo-workspace'),
      head: values('.wo-workspace-head'),
      nav: values('.wo-dealer-mobile-nav'),
    }
  })
}

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
  const desktopPage = await desktopContext.newPage()
  const withoutMobileCss = await desktopSignature(desktopPage, 'products', false)
  const withMobileCss = await desktopSignature(desktopPage, 'products', true)
  assert.deepEqual(withMobileCss, withoutMobileCss, 'mobile stylesheet changed desktop computed layout')
  await desktopPage.screenshot({ path: path.join(output, 'products-desktop.png'), fullPage: true })
  await desktopContext.close()

  for (const viewport of [{ name: 'phone-390', width: 390, height: 844 }, { name: 'phone-360', width: 360, height: 800 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    for (const route of views) {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text()) })
      await page.goto(`${baseUrl}/dealer/${route}?mobileCss=1`, { waitUntil: 'networkidle' })
      await page.locator('.wo-workspace').waitFor({ state: 'visible' })

      if (route === 'products') {
        const disclosure = page.locator('.wo-mobile-form-disclosure-v657')
        const form = page.locator('.wo-dealer-product-form')
        await disclosure.waitFor({ state: 'visible' })
        assert.equal(await disclosure.getAttribute('aria-expanded'), 'false')
        assert.equal(await form.isHidden(), true, `${viewport.name} product form should start collapsed`)
        assert.equal(await page.locator('.wo-workspace-head h2').textContent(), '商品管理')
        await disclosure.click()
        assert.equal(await disclosure.getAttribute('aria-expanded'), 'true')
        await form.waitFor({ state: 'visible' })
        const formFields = await form.locator('input, select, textarea').evaluateAll(elements => elements.map(element => ({
          height: element.getBoundingClientRect().height,
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        })))
        for (const field of formFields) {
          assert.ok(field.height >= 49, `${viewport.name} expanded product field is too short`)
          assert.ok(field.fontSize >= 16, `${viewport.name} expanded product field may trigger iOS zoom`)
        }
        await disclosure.click()
        assert.equal(await form.isHidden(), true, `${viewport.name} product form did not collapse again`)
      }

      const metrics = await page.evaluate(() => {
        const visible = element => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
        }
        const nav = document.querySelector('.wo-dealer-mobile-nav')
        const inputs = [...document.querySelectorAll('.wo-main :is(input:not([type="checkbox"]):not([type="radio"]),select,textarea)')].filter(visible)
        const actions = [...document.querySelectorAll('.wo-main :is(.wo-button,.wo-icon-link,.wo-icon-button)')].filter(visible)
        const tooSmallActions = actions.map(element => {
          const rect = element.getBoundingClientRect()
          return { text: element.textContent.trim().slice(0, 24), width: rect.width, height: rect.height }
        }).filter(item => item.width < 43 || item.height < 43)
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          navHeight: nav.getBoundingClientRect().height,
          navLinks: [...nav.querySelectorAll('a')].map(element => ({ width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, fontSize: Number.parseFloat(getComputedStyle(element).fontSize) })),
          inputs: inputs.map(element => ({ height: element.getBoundingClientRect().height, fontSize: Number.parseFloat(getComputedStyle(element).fontSize) })),
          tooSmallActions,
          workspaceRadius: getComputedStyle(document.querySelector('.wo-workspace')).borderRadius,
          pageHeadDisplay: getComputedStyle(document.querySelector('.wo-page-head')).display,
        }
      })

      assert.ok(metrics.overflow <= 2, `${viewport.name} ${route} overflowed by ${metrics.overflow}px`)
      assert.ok(metrics.navHeight >= 75, `${viewport.name} ${route} navigation is too short`)
      assert.equal(metrics.navLinks.length, 6)
      for (const link of metrics.navLinks) {
        assert.ok(link.height >= 75, `${viewport.name} ${route} navigation target is too short`)
        assert.ok(link.width >= 51, `${viewport.name} ${route} navigation target is too narrow`)
        assert.ok(link.fontSize >= 9.4, `${viewport.name} ${route} navigation label is too small`)
      }
      for (const input of metrics.inputs) {
        assert.ok(input.height >= 49, `${viewport.name} ${route} input is too short`)
        assert.ok(input.fontSize >= 16, `${viewport.name} ${route} input may trigger iOS zoom`)
      }
      assert.deepEqual(metrics.tooSmallActions, [], `${viewport.name} ${route} has undersized actions`)
      assert.equal(metrics.workspaceRadius, '8px')
      assert.equal(metrics.pageHeadDisplay, 'none')
      assert.deepEqual(errors, [])

      await page.screenshot({ path: path.join(output, `${route}-${viewport.name}-top.png`), fullPage: false })
      if (viewport.name === 'phone-390') await page.screenshot({ path: path.join(output, `${route}-${viewport.name}-full.png`), fullPage: true })
      results.push({ viewport: viewport.name, route, ...metrics })
      await page.close()
    }
    await context.close()
  }

  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ desktopUnchanged: true, results }, null, 2))
  console.log(JSON.stringify({ release: 'mobile-workspaces-v657', browserVerified: true, desktopUnchanged: true, views: views.length, viewports: 2, output }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
