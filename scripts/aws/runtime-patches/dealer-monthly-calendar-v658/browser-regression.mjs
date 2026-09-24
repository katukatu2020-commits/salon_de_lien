import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'dealer-monthly-calendar-v658')
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/chromium')
const client = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-client-v543.js'), 'utf8')
const baseCss = fs.readFileSync(path.join(runtimeRoot, 'wholesale-ordering-v543.css'), 'utf8')
const mobileCss = fs.readFileSync(path.join(runtimeRoot, 'public', 'mobile-workspaces-v657.css'), 'utf8')
const calendarCss = fs.readFileSync(path.join(runtimeRoot, 'public', 'dealer-monthly-calendar-v658.css'), 'utf8')
fs.mkdirSync(output, { recursive: true })

const plans = new Map([
  ['2026-09', { salesTargetYen: 1200000, newAcquisitionCount: 8 }],
])

const days = {
  '2026-09': [
    { date: '2026-09-01', invoiceCount: 2, forecastYen: 148500 },
    { date: '2026-09-08', invoiceCount: 1, forecastYen: 66000 },
    { date: '2026-09-17', invoiceCount: 4, forecastYen: 287430 },
    { date: '2026-09-25', invoiceCount: 3, forecastYen: 198000 },
  ],
  '2026-10': [
    { date: '2026-10-02', invoiceCount: 1, forecastYen: 57200 },
  ],
}

function calendarPayload(monthKey) {
  const normalized = /^2026-(09|10)$/.test(monthKey || '') ? monthKey : '2026-09'
  const monthDays = days[normalized] || []
  const plan = plans.get(normalized) || { salesTargetYen: 0, newAcquisitionCount: 0 }
  return {
    ok: true,
    calendar: {
      monthKey: normalized,
      year: 2026,
      month: Number(normalized.slice(5)),
      invoiceCount: monthDays.reduce((sum, day) => sum + day.invoiceCount, 0),
      monthlyForecastYen: monthDays.reduce((sum, day) => sum + day.forecastYen, 0),
      salesTargetYen: plan.salesTargetYen,
      newAcquisitionCount: plan.newAcquisitionCount,
      updatedAt: '2026-09-25T00:00:00.000Z',
      days: monthDays,
    },
  }
}

function icon() {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>'
}

const nav = [
  ['calendar', '月次売上'], ['orders', '受注管理'], ['salons', '契約美容室'], ['products', '商品管理'],
  ['pricing', '契約価格'], ['company', '会社情報'], ['password-change', 'パスワード'],
]

function shell() {
  const navMarkup = nav.map(([route, label]) => `<a class="${route === 'calendar' ? 'active' : ''}" href="/dealer/${route}">${icon()}<span>${label}</span></a>`).join('')
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/wholesale-ordering-v543.css"><link rel="stylesheet" href="/mobile-workspaces-v657.css"><link rel="stylesheet" href="/dealer-monthly-calendar-v658.css"></head><body class="wo-body wo-dealer-body" data-wholesale-page="dealer" data-dealer-view="calendar"><div class="wo-dealer-layout"><aside class="wo-dealer-sidebar"><a class="wo-brand" href="/dealer/calendar"><span><strong>ORIMIA Partner</strong><small>Dealer operations</small></span></a><nav>${navMarkup}</nav></aside><div class="wo-dealer-stage"><header class="wo-dealer-topbar"><div><small>DEALER PORTAL</small><strong>売上カレンダー</strong></div><span>スーパーヤマモト</span></header><main class="wo-main"><section class="wo-page-head"><div><p class="wo-eyebrow">MONTHLY SALES</p><h1>売上カレンダー</h1><p>日ごとの伝票数と売上見込みを月次で確認し、営業目標を管理します。</p></div></section><div id="wholesale-app" class="wo-app-root"><div class="wo-loading"><span></span><p>管理情報を読み込んでいます</p></div></div></main></div></div><nav class="wo-dealer-mobile-nav">${navMarkup}</nav><script src="/wholesale-ordering-client-v543.js"></script></body></html>`
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/dealer/calendar') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' })
    res.end(shell())
    return
  }
  const assets = {
    '/wholesale-ordering-client-v543.js': ['application/javascript; charset=utf-8', client],
    '/wholesale-ordering-v543.css': ['text/css; charset=utf-8', baseCss],
    '/mobile-workspaces-v657.css': ['text/css; charset=utf-8', mobileCss],
    '/dealer-monthly-calendar-v658.css': ['text/css; charset=utf-8', calendarCss],
  }
  if (assets[url.pathname]) {
    res.writeHead(200, { 'content-type': assets[url.pathname][0] })
    res.end(assets[url.pathname][1])
    return
  }
  if (url.pathname === '/api/dealer/calendar' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(calendarPayload(url.searchParams.get('month'))))
    return
  }
  if (url.pathname === '/api/dealer/calendar/targets' && req.method === 'POST') {
    const payload = await readJson(req)
    plans.set(payload.monthKey, {
      salesTargetYen: Number(payload.salesTargetYen),
      newAcquisitionCount: Number(payload.newAcquisitionCount),
    })
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
    res.end(JSON.stringify(calendarPayload(payload.monthKey)))
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
const results = []

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 960 },
    { name: 'phone-390', width: 390, height: 844 },
    { name: 'phone-360', width: 360, height: 800 },
  ]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    const errors = []
    let documentRequests = 0
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error' && !message.text().includes('Failed to load resource')) errors.push(message.text())
    })
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`)
    })
    page.on('request', request => { if (request.resourceType() === 'document') documentRequests += 1 })

    await page.goto(`${baseUrl}/dealer/calendar?month=2026-09`, { waitUntil: 'networkidle' })
    await page.locator('.wo-dealer-calendar-v658').waitFor({ state: 'visible' })
    assert.equal(await page.locator('.wo-calendar-day-v658:not(.is-outside)').count(), 30)
    assert.equal(await page.locator('.wo-dealer-mobile-nav a').count(), 7)
    assert.match(await page.locator('.wo-calendar-kpis-v658').textContent(), /699,930円/)
    assert.match(await page.locator('.wo-calendar-kpis-v658').textContent(), /10伝票/)

    const layout = await page.evaluate(() => {
      const pageWidth = document.documentElement.clientWidth
      const visibleOverflow = [...document.querySelectorAll('body *')].filter(element => {
        const style = getComputedStyle(element)
        if (style.position === 'fixed' || style.display === 'none') return false
        const rect = element.getBoundingClientRect()
        return rect.right > pageWidth + 1 || rect.left < -1
      }).map(element => ({ className: element.className, left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right }))
      const columns = getComputedStyle(document.querySelector('.wo-calendar-grid-v658')).gridTemplateColumns.split(' ').length
      const inputs = [...document.querySelectorAll('.wo-calendar-plan-v658 input')].map(input => ({
        height: input.getBoundingClientRect().height,
        fontSize: Number.parseFloat(getComputedStyle(input).fontSize),
      }))
      return { pageWidth, scrollWidth: document.documentElement.scrollWidth, visibleOverflow, columns, inputs }
    })
    assert.equal(layout.columns, 7)
    assert.ok(layout.scrollWidth <= layout.pageWidth + 1, `${viewport.name} page overflows horizontally`)
    assert.deepEqual(layout.visibleOverflow, [], `${viewport.name} has visible overflow`)
    if (viewport.width < 768) {
      for (const input of layout.inputs) {
        assert.ok(input.fontSize >= 16, `${viewport.name} target input may trigger iOS zoom`)
      }
      await page.locator('.wo-calendar-compact-yen-v658:visible').first().waitFor({ state: 'visible' })
    }

    await page.screenshot({ path: path.join(output, `${viewport.name}.png`), fullPage: viewport.width >= 768 })

    await page.locator('[data-action="dealer-calendar-month"].is-next').click()
    await page.locator('.wo-calendar-month-nav-v658 strong').filter({ hasText: '10月' }).waitFor()
    assert.match(page.url(), /month=2026-10/)
    assert.equal(documentRequests, 1, `${viewport.name} month change caused a document navigation`)

    await page.locator('input[name="salesTargetYen"]').fill('900000')
    await page.locator('input[name="newAcquisitionCount"]').fill('12')
    await page.locator('#dealer-calendar-plan-form button[type="submit"]').click()
    await page.locator('input[name="salesTargetYen"][value="900000"]').waitFor()
    assert.match(await page.locator('.wo-calendar-progress-v658').textContent(), /6%/)
    assert.deepEqual(errors, [], `${viewport.name} browser errors: ${errors.join(' | ')}`)
    results.push({ viewport: viewport.name, columns: layout.columns, documentRequests, targetSaved: true })
    await context.close()
  }
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}

console.log(JSON.stringify({ release: 'dealer-monthly-calendar-v658', passed: true, results, screenshots: output }, null, 2))
