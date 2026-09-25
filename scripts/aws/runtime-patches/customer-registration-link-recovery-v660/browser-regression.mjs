import assert from 'node:assert/strict'
import http from 'node:http'
import { createRequire } from 'node:module'
import { customerRegistrationLinkRecoveryScriptV660 } from './recovery-source.mjs'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const productionBase = String(process.env.VERIFY_BASE_URL || '').replace(/\/$/, '')
const registrationTestToken = String(process.env.REGISTRATION_TEST_TOKEN || '').trim()

const browser = await chromium.launch({ executablePath, headless: true })

async function recoveryState(page) {
  return page.evaluate(() => ({
    pathname: location.pathname,
    ready: document.documentElement.dataset.orimiaUiReady || null,
    release: document.documentElement.dataset.orimiaCustomerRegistrationRecoveryState || null,
    recovery: document.documentElement.dataset.orimiaCustomerRegistrationRecovery || null,
    loaderVisibility: document.getElementById('orimia-ui-loader-v536')
      ? getComputedStyle(document.getElementById('orimia-ui-loader-v536')).visibility
      : null,
  }))
}

async function verifyProduction() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  await page.route(/\/(?:_next\/static\/chunks\/app\/layout-[^?]+\.js|ui-transition-v640\.js)(?:\?|$)/, route => route.abort())
  const token = registrationTestToken || 'not-a-valid-registration-token'
  const expectedHeading = registrationTestToken ? 'はじめてのお客様登録' : '登録リンクを確認できません'
  await page.goto(`${productionBase}/u/register/${token}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.getByRole('heading', { name: expectedHeading }).waitFor({ state: 'visible', timeout: 5000 })
  const state = await recoveryState(page)
  assert.equal(state.ready, 'v516')
  assert.equal(state.recovery, 'v660')
  assert.equal(state.release, 'content-ready')
  assert.notEqual(state.loaderVisibility, 'visible')

  const loginPage = await context.newPage()
  await loginPage.route(/\/(?:_next\/static\/chunks\/app\/layout-[^?]+\.js|ui-transition-v640\.js)(?:\?|$)/, route => route.abort())
  await loginPage.goto(`${productionBase}/u/login?verify=v660-scope`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await loginPage.waitForTimeout(350)
  const loginState = await recoveryState(loginPage)
  assert.equal(loginState.recovery, null)
  assert.equal(loginState.release, null)
  await context.close()
  return { registration: state, login: loginState }
}

async function verifyFixture() {
  const html = pathname => `<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
    html:not([data-orimia-ui-ready="v516"]) body > main { visibility:hidden!important;opacity:0!important }
    #orimia-ui-loader-v536 { visibility:hidden }
    html:not([data-orimia-ui-ready="v516"]) #orimia-ui-loader-v536 { visibility:visible!important }
  </style><script>${customerRegistrationLinkRecoveryScriptV660.replaceAll('</script', '<\\/script')}</script></head><body>
    <div id="orimia-ui-loader-v536">loading</div>
    <script>setTimeout(()=>{const main=document.createElement('main');main.innerHTML=${JSON.stringify(pathname.includes('token') ? '<input name="registrationInviteToken"><h1>はじめてのお客様登録</h1>' : '<form action="/api/customer-auth/registration-link/request"><h1>お客様アプリ初回登録</h1></form>')};document.body.append(main)},250)</script>
  </body></html>`

  const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end(html(request.url || '/'))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  const base = `http://127.0.0.1:${address.port}`

  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    await page.goto(`${base}/u/register/token-value`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'はじめてのお客様登録' }).waitFor({ state: 'visible', timeout: 2000 })
    const tokenState = await recoveryState(page)
    assert.equal(tokenState.ready, 'v516')
    assert.equal(tokenState.recovery, 'v660')
    assert.equal(tokenState.release, 'content-ready')

    await page.goto(`${base}/u/login`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(500)
    const loginState = await recoveryState(page)
    assert.equal(loginState.ready, null)
    assert.equal(loginState.recovery, null)

    await context.close()
    return { tokenState, loginState }
  } finally {
    await new Promise(resolve => server.close(resolve))
  }
}

try {
  const result = productionBase ? await verifyProduction() : await verifyFixture()
  console.log(JSON.stringify({
    release: 'customer-registration-link-recovery-v660',
    browserVerified: true,
    mode: productionBase ? 'production' : 'fixture',
    result,
  }, null, 2))
} finally {
  await browser.close()
}
