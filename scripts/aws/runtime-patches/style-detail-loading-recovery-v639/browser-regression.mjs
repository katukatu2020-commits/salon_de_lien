import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const runtimeRoot = process.env.LIEN_RUNTIME_ROOT || '/app'
const output = process.env.SCREENSHOT_DIR || 'artifacts/style-detail-loading-recovery-v639/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const loader = fs.readFileSync(path.join(runtimeRoot, 'public', 'ui-transition-v639.js'), 'utf8')
const style = fs.readFileSync(path.join(runtimeRoot, 'public', 'style-system-integration-v602.js'), 'utf8')
fs.mkdirSync(output, { recursive:true })

const article = '<div class="community-detail-page"><article><header><h1>Style detail</h1></header><div><div class="community-feed-gallery"><img alt="Style"></div><div class="community-feed-content"><p>Style content</p></div></div><footer class="community-feed-meta">Meta</footer></article></div>'
const loaderCss = `
  body{margin:0;font-family:sans-serif}.app{min-height:100vh;padding:24px;box-sizing:border-box}
  #orimia-ui-loader-v536{position:fixed;z-index:9999;inset:0;display:grid;place-content:center;justify-items:center;background:#fff;visibility:hidden;opacity:0}
  html:not([data-orimia-ui-ready="v516"]) #orimia-ui-loader-v536{visibility:visible;opacity:1}
  html[data-orimia-ui-ready="v516"] #orimia-ui-loader-v536{visibility:hidden;opacity:0}
  .orimia-ui-loader-v536__mark img{width:72px}.orimia-ui-loader-v536__rail{width:108px;height:3px;background:#eee}
`

function html(pathname) {
  const customer = pathname.startsWith('/u/')
  const detail = /^\/(?:admin|u)\/community\/[^/]+$/.test(pathname)
  const spa = pathname === '/admin/community'
  const noRuntime = pathname === '/admin/no-runtime'
  return `<!doctype html><html lang="ja"${customer ? ' data-orimia-customer-standalone="v516"' : ''}${spa ? ' data-orimia-ui-ready="v516"' : ''}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${loaderCss}</style>${noRuntime ? '<script>window.requestAnimationFrame=function(){return 1}</script>' : ''}</head><body><div class="app"><main id="main">${detail ? article : spa ? '<a id="open-style" href="/admin/community/post-spa">Open style</a>' : '<p>Fallback content</p>'}</main></div><script>window.__v639Events=[];window.addEventListener('orimia:ui-transition-started',function(e){window.__v639Events.push({kind:'start',reason:e.detail&&e.detail.reason})});window.addEventListener('orimia:ui-transition-finished',function(e){window.__v639Events.push({kind:'finish',reason:e.detail&&e.detail.reason})})</script><script src="/ui-transition-v639.js"></script>${customer && detail ? '<script src="/style-system-integration-v602.js"></script>' : ''}${spa ? `<script>document.getElementById('open-style').addEventListener('click',function(event){event.preventDefault();history.pushState({},'',this.href);setTimeout(function(){document.getElementById('main').innerHTML=${JSON.stringify(article)}},100)})</script>` : ''}</body></html>`
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  if (url.pathname === '/ui-transition-v639.js') {
    response.writeHead(200, { 'content-type':'application/javascript; charset=utf-8', 'cache-control':'no-store' })
    response.end(loader)
    return
  }
  if (url.pathname === '/style-system-integration-v602.js') {
    response.writeHead(200, { 'content-type':'application/javascript; charset=utf-8', 'cache-control':'no-store' })
    response.end(style)
    return
  }
  if (url.pathname === '/api/lien-style-system') {
    response.writeHead(503, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store' })
    response.end(JSON.stringify({ error:'fixture failure' }))
    return
  }
  response.writeHead(200, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store' })
  response.end(html(url.pathname))
})

await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const address = server.address()
const base = `http://127.0.0.1:${address.port}`
const browser = await chromium.launch({ executablePath, headless:true })
const results = []

async function state(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const loader = document.getElementById('orimia-ui-loader-v536')
    return {
      ready:root.dataset.orimiaUiReady || null,
      scope:root.dataset.orimiaNavigationLoaderScope || null,
      busy:root.getAttribute('aria-busy'),
      transition:root.dataset.orimiaUiTransition || null,
      styleState:root.dataset.orimiaStyleStateV606 || null,
      loaderVisibility:loader ? getComputedStyle(loader).visibility : null,
      articleVisible:Boolean(document.querySelector('.community-detail-page article')),
      events:window.__v639Events || [],
      viewport:document.documentElement.clientWidth,
      documentWidth:document.documentElement.scrollWidth,
    }
  })
}

async function verifyInitialDetail(width, audience) {
  const context = await browser.newContext({ viewport:{ width, height:820 } })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(String(error)))
  const startedAt = Date.now()
  await page.goto(`${base}/${audience}/community/post-initial`, { waitUntil:'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout:1800 })
  if (audience === 'u') await page.waitForFunction(() => document.documentElement.dataset.orimiaStyleStateV606 === 'fallback', null, { timeout:2500 })
  const current = await state(page)
  assert.equal(current.scope, 'v639')
  assert.equal(current.ready, 'v516')
  assert.equal(current.busy, null)
  assert.equal(current.transition, null)
  assert.equal(current.loaderVisibility, 'hidden')
  assert.equal(current.articleVisible, true)
  assert.ok(Date.now() - startedAt < 1800, `${width}/${audience}: detail shell reveal was slow`)
  assert.ok(current.documentWidth <= current.viewport + 1, `${width}/${audience}: horizontal overflow`)
  assert.deepEqual(errors, [], `${width}/${audience}: browser errors`)
  await page.screenshot({ path:path.join(output, `initial-${audience}-${width}.png`), fullPage:false })
  results.push({ width, audience, shellRecovery:true, styleFallback:audience === 'u' })
  await context.close()
}

async function verifySpaDetail() {
  const context = await browser.newContext({ viewport:{ width:1280, height:820 } })
  const page = await context.newPage()
  await page.goto(base + '/admin/community', { waitUntil:'load' })
  await page.locator('#open-style').click()
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiTransition === 'navigation')
  const loading = await state(page)
  assert.equal(loading.ready, null)
  assert.equal(loading.loaderVisibility, 'visible')
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout:1800 })
  const ready = await state(page)
  assert.equal(ready.loaderVisibility, 'hidden')
  assert.ok(ready.events.some(event => event.kind === 'finish' && String(event.reason).startsWith('style-detail-')))
  results.push({ audience:'admin-spa', routeRecovery:true })
  await context.close()
}

async function verifyHardFallback() {
  const context = await browser.newContext({ viewport:{ width:390, height:820 } })
  const page = await context.newPage()
  await page.goto(base + '/admin/no-runtime', { waitUntil:'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout:6000, polling:100 })
  const current = await state(page)
  assert.equal(current.loaderVisibility, 'hidden')
  assert.ok(current.events.some(event => event.kind === 'finish' && event.reason === 'safety-timeout'))
  results.push({ audience:'admin', animationFrameStallRecovered:true })
  await context.close()
}

try {
  for (const width of [390, 1280]) {
    await verifyInitialDetail(width, 'admin')
    await verifyInitialDetail(width, 'u')
  }
  await verifySpaDetail()
  await verifyHardFallback()
  console.log(JSON.stringify({ release:'style-detail-loading-recovery-v639', browserVerified:true, results }))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
