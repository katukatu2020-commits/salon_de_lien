import assert from 'node:assert/strict'
import http from 'node:http'
import { createRequire } from 'node:module'
import { globalLoadingRecoveryScriptV661 } from './loading-recovery-source.mjs'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const productionBase = String(process.env.VERIFY_BASE_URL || '').replace(/\/$/, '')

const browser = await chromium.launch({ executablePath, headless: true })

async function state(page) {
  return page.evaluate(() => ({
    ready: document.documentElement.dataset.orimiaUiReady || null,
    release: document.documentElement.dataset.orimiaGlobalLoadingRecovery || null,
    reason: document.documentElement.dataset.orimiaGlobalLoadingRecoveryState || null,
    busy: document.documentElement.getAttribute('aria-busy'),
    loaderVisibility: document.getElementById('orimia-ui-loader-v536')
      ? getComputedStyle(document.getElementById('orimia-ui-loader-v536')).visibility
      : null,
  }))
}

async function verifyFixture() {
  const html = ({ runtimeStarted = false, navigationCycle = false }) => `<!doctype html><html lang="ja"${navigationCycle ? ' data-orimia-ui-ready="v516"' : ''}><head><meta charset="utf-8"><style>
    html:not([data-orimia-ui-ready="v516"]) main { visibility:hidden!important;opacity:0!important }
    #orimia-ui-loader-v536 { visibility:hidden }
    html:not([data-orimia-ui-ready="v516"]) #orimia-ui-loader-v536 { visibility:visible!important }
  </style><script>${globalLoadingRecoveryScriptV661.replaceAll('</script', '<\\/script')}</script></head><body>
    <div id="orimia-ui-loader-v536">loading</div><main><h1>操作画面</h1></main>
    ${runtimeStarted ? '<script>window.__orimiaUiTransitionV640=true</script>' : ''}
    ${navigationCycle ? '<script>setTimeout(()=>{document.documentElement.removeAttribute("data-orimia-ui-ready");document.documentElement.dataset.orimiaUiTransition="navigation";document.documentElement.setAttribute("aria-busy","true")},100)</script>' : ''}
  </body></html>`

  const server = http.createServer((request, response) => {
    const url = new URL(request.url || '/', 'http://fixture.local')
    const mode = url.searchParams.get('mode')
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(html({ runtimeStarted: mode === 'stuck', navigationCycle: mode === 'stuck' }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const base = `http://127.0.0.1:${address.port}`

  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const missingRuntime = await context.newPage()
    await missingRuntime.goto(base, { waitUntil: 'domcontentloaded' })
    await missingRuntime.getByRole('heading', { name: '操作画面' }).waitFor({ state: 'visible', timeout: 3500 })
    const missingState = await state(missingRuntime)
    assert.equal(missingState.ready, 'v516')
    assert.equal(missingState.release, 'v661')
    assert.equal(missingState.reason, 'runtime-unavailable')
    assert.equal(missingState.busy, null)
    assert.notEqual(missingState.loaderVisibility, 'visible')

    const stuckRuntime = await context.newPage()
    await stuckRuntime.goto(base + '/?mode=stuck', { waitUntil: 'domcontentloaded' })
    await stuckRuntime.waitForFunction(() => (
      document.documentElement.dataset.orimiaGlobalLoadingRecoveryState === 'watchdog-timeout'
    ), null, { timeout: 8500 })
    await stuckRuntime.getByRole('heading', { name: '操作画面' }).waitFor({ state: 'visible', timeout: 8500 })
    const stuckState = await state(stuckRuntime)
    assert.equal(stuckState.ready, 'v516')
    assert.equal(stuckState.reason, 'watchdog-timeout')
    assert.equal(stuckState.busy, null)
    assert.notEqual(stuckState.loaderVisibility, 'visible')
    await context.close()
    return { missingState, stuckState }
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

async function verifyProduction() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const login = await context.request.post(productionBase + '/api/auth/login', {
    headers: { Origin: productionBase },
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
  })
  assert.ok(login.ok(), `Staff login returned ${login.status()}`)
  const page = await context.newPage()
  await page.route(/\/_next\/static\/chunks\/app\/layout-[^?]+\.js(?:\?|$)/, route => route.abort())
  await page.goto(productionBase + '/admin/community?verify=v661-loader-missing', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  await page.getByRole('heading', { name: 'スタイル共有' }).waitFor({ state: 'visible', timeout: 5000 })
  const productionState = await state(page)
  assert.equal(productionState.ready, 'v516')
  assert.equal(productionState.release, 'v661')
  assert.equal(productionState.reason, 'runtime-unavailable')
  assert.notEqual(productionState.loaderVisibility, 'visible')
  await context.close()
  return { productionState }
}

try {
  const result = productionBase ? await verifyProduction() : await verifyFixture()
  console.log(JSON.stringify({
    release: 'style-order-loading-recovery-v661',
    loaderBrowserVerified: true,
    mode: productionBase ? 'production' : 'fixture',
    result,
  }, null, 2))
} finally {
  await browser.close()
}
