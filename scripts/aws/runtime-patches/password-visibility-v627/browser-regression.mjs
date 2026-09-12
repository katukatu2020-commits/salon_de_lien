import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const here = path.dirname(fileURLToPath(import.meta.url))
const client = fs.readFileSync(path.join(here, 'password-visibility-v627.js'), 'utf8')
const css = fs.readFileSync(path.join(here, 'password-visibility-v627.css'), 'utf8')
const base = String(process.env.SMOKE_BASE_URL || '').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/password-visibility-v627/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive: true })

const routes = [
  { key: 'customer', path: '/u/login', action: '/api/customer-auth/login', userField: 'loginId' },
  { key: 'store', path: '/admin/login', action: '/api/auth/login', userField: 'email' },
  { key: 'dealer', path: '/dealer/login', action: '/api/dealer/auth/login', userField: 'loginId' },
]

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

function syntheticHtml(route) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#fbf7f0;color:#2f2a25;font-family:sans-serif}
    main{min-height:100vh;display:grid;place-items:center;padding:20px}.card{width:min(100%,430px);padding:28px;background:#fff;border:1px solid #e8ded2;border-radius:8px}
    form,label{display:grid;gap:10px}form{gap:18px}input{width:100%;height:48px;border:1px solid #e8ded2;border-radius:8px;padding:0 14px;font-size:16px}.submit{height:48px}
  </style></head><body><main><section class="card"><h1>${route.key} login</h1><form action="${route.action}" method="post"><label>Account<input name="${route.userField}" autocomplete="username"></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="submit" type="submit">Login</button></form></section></main></body></html>`
}

async function assertToggle(page, route, label) {
  const input = page.locator('input[name="password"][autocomplete="current-password"]')
  const toggle = page.locator('[data-orimia-password-toggle-v627="v627"]')
  await toggle.waitFor({ state: 'visible' })
  assert.equal(await toggle.getAttribute('type'), 'button', `${label}: toggle can submit the form`)
  assert.equal(await toggle.getAttribute('aria-label'), 'パスワードを表示', `${label}: initial label is wrong`)
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false', `${label}: initial state is wrong`)
  assert.equal(await input.getAttribute('type'), 'password', `${label}: password is visible initially`)
  assert.equal(await input.getAttribute('name'), 'password', `${label}: input name changed`)
  assert.equal(await input.getAttribute('autocomplete'), 'current-password', `${label}: autocomplete changed`)

  const formAction = await page.locator('form').getAttribute('action')
  assert.equal(new URL(formAction, page.url()).pathname, route.action, `${label}: form action changed`)

  const box = await toggle.boundingBox()
  assert.ok(box && box.width >= 43.5 && box.height >= 43.5, `${label}: tap target is below 44px`)
  const paddingRight = await input.evaluate(element => parseFloat(getComputedStyle(element).paddingRight))
  assert.ok(paddingRight >= 52, `${label}: password text can overlap the toggle`)

  await input.fill('VisiblePassword2026!')
  await input.focus()
  await input.evaluate(element => element.setSelectionRange(3, 9))
  assert.deepEqual(
    await input.evaluate(element => ({ start: element.selectionStart, end: element.selectionEnd })),
    { start: 3, end: 9 },
    `${label}: test browser could not set the initial caret`,
  )
  await toggle.click()
  assert.equal(await input.getAttribute('type'), 'text', `${label}: password did not become visible`)
  assert.equal(await input.inputValue(), 'VisiblePassword2026!', `${label}: password value changed`)
  assert.equal(await toggle.getAttribute('aria-label'), 'パスワードを隠す', `${label}: visible label is wrong`)
  assert.equal(await toggle.getAttribute('aria-pressed'), 'true', `${label}: visible state is wrong`)
  await page.waitForFunction(() => {
    const input = document.querySelector('input[name="password"]')
    return document.activeElement === input && input.selectionStart === 3 && input.selectionEnd === 9
  })
  const pointerState = await page.evaluate(() => ({
    active: document.activeElement === document.querySelector('input[name="password"]'),
    start: document.querySelector('input[name="password"]').selectionStart,
    end: document.querySelector('input[name="password"]').selectionEnd,
  }))
  assert.deepEqual(pointerState, { active: true, start: 3, end: 9 }, `${label}: pointer toggle lost focus or caret`)

  await toggle.focus()
  await toggle.press('Enter')
  assert.equal(await input.getAttribute('type'), 'password', `${label}: keyboard toggle did not hide password`)
  assert.equal(await page.evaluate(() => window.__orimiaSyntheticSubmitCount || 0), 0, `${label}: toggle submitted the form`)
}

async function verifySynthetic(browser) {
  const results = []
  for (const route of routes) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await context.newPage()
    const errors = collectErrors(page)
    await page.route('http://v627.local/**', request => request.fulfill({ contentType: 'text/html; charset=utf-8', body: syntheticHtml(route) }))
    await page.goto('http://v627.local' + route.path)
    await page.evaluate(() => {
      window.__orimiaSyntheticSubmitCount = 0
      document.querySelector('form').addEventListener('submit', event => {
        event.preventDefault()
        window.__orimiaSyntheticSubmitCount += 1
      })
    })
    await page.addStyleTag({ content: css })
    await page.addScriptTag({ content: client })
    await assertToggle(page, route, `synthetic ${route.key}`)
    await page.screenshot({ path: path.join(output, `synthetic-${route.key}-mobile.png`) })
    assert.deepEqual(errors, [], `synthetic ${route.key}: browser errors`)
    results.push(route.key)
    await context.close()
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.route('http://v627.local/**', request => request.fulfill({ contentType: 'text/html; charset=utf-8', body: syntheticHtml(routes[0]) }))
  await page.goto('http://v627.local/u/password-reset')
  await page.addStyleTag({ content: css })
  await page.addScriptTag({ content: client })
  await page.waitForTimeout(100)
  assert.equal(await page.locator('[data-orimia-password-toggle-v627]').count(), 0, 'password reset route was enhanced')
  await context.close()
  return results
}

async function verifyLive(browser) {
  const assetResponses = await Promise.all([
    fetch(base + '/password-visibility-v627.js?v=627-release1'),
    fetch(base + '/password-visibility-v627.css?v=627-release1'),
  ])
  for (const response of assetResponses) assert.ok(response.ok, `live asset returned ${response.status}`)

  const results = []
  for (const width of [390, 1280]) {
    for (const route of routes) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 })
      const page = await context.newPage()
      const errors = collectErrors(page)
      const response = await page.goto(`${base}${route.path}?verify=v627-${route.key}-${width}`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      assert.ok(response?.ok(), `${route.key} ${width}: login returned ${response?.status()}`)
      const html = await response.text()
      assert.ok(html.includes('orimia-password-visibility-v627'), `${route.key} ${width}: assets are not in initial HTML`)
      await page.waitForFunction(() => {
        const loader = document.getElementById('orimia-ui-loader-v536')
        return !loader || getComputedStyle(loader).visibility === 'hidden'
      }, null, { timeout: 15_000 }).catch(() => {})
      await assertToggle(page, route, `live ${route.key} ${width}`)

      const layout = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }))
      assert.ok(layout.documentWidth <= layout.viewport + 2, `${route.key} ${width}: horizontal overflow`)
      await page.screenshot({ path: path.join(output, `live-${route.key}-${width}.png`), fullPage: false })
      assert.deepEqual(errors, [], `${route.key} ${width}: unexpected browser errors`)
      results.push({ route: route.key, width, layout })
      await context.close()
    }
  }
  return results
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  const synthetic = await verifySynthetic(browser)
  const live = base ? await verifyLive(browser) : []
  console.log(JSON.stringify({
    release: 'password-visibility-v627',
    browserVerified: true,
    synthetic,
    liveVerified: Boolean(base),
    live,
  }))
} finally {
  await browser.close()
}
