import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium, webkit } = require('playwright-core')
const base = (process.env.SMOKE_BASE_URL || 'http://localhost:3599').replace(/\/$/, '')
const out = process.env.SCREENSHOT_DIR || 'artifacts/business-logout-v599/browser'
const webkitMode = process.env.SMOKE_BROWSER === 'webkit'
fs.mkdirSync(out, { recursive: true })
const browser = await (webkitMode ? webkit.launch({ headless: true }) : chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
}))
const results = []
try {
  for (const [route, cookie, destination, protectedPath, loginPath] of [
    ['/api/auth/logout', 'lien_admin_session', '/business', '/admin/customers', '/admin/login'],
    ['/api/dealer/auth/logout', 'orimia_dealer_session', '/business', '/dealer/orders', '/dealer/login'],
    ['/api/customer-auth/logout', 'lien_customer_session', '/', '/u/home', '/u/login'],
  ]) {
    const context = await browser.newContext()
    // Isolated expired sessions exercise logout without touching anyone's browser or account.
    await context.addCookies([
      { name: cookie, value: 'expired-logout-fixture', url: base },
      { name: 'logout-unrelated-fixture', value: 'preserved', url: base },
    ])
    const rejected = await context.request.post(base + route, { headers: { Origin: 'https://example.org' }, maxRedirects: 0 })
    assert.equal(rejected.status(), 403)
    assert.ok((await context.cookies()).some(c => c.name === cookie), 'Invalid origin must not clear cookies')
    const response = await context.request.post(base + route + '?next=https://example.org/', { headers: { Origin: base }, maxRedirects: 0 })
    assert.equal(response.status(), 303)
    assert.equal(new URL(response.headers().location, base).href, base + destination)
    assert.match(response.headers()['cache-control'], /no-store/)
    const cleared = response.headers()['set-cookie']
    assert.match(cleared, new RegExp('^' + cookie + '=;'))
    assert.match(cleared, /Max-Age=0/)
    assert.match(cleared, /HttpOnly/)
    assert.match(cleared, /SameSite=lax/i)
    if (base.startsWith('https:')) assert.match(cleared, /Secure/i)
    const cookies = await context.cookies()
    assert.ok(!cookies.some(c => c.name === cookie))
    assert.ok(cookies.some(c => c.name === 'logout-unrelated-fixture' && c.value === 'preserved'))
    const protectedResponse = await context.request.get(base + protectedPath, { maxRedirects: 0 })
    assert.ok([302, 303, 307].includes(protectedResponse.status()))
    assert.equal(new URL(protectedResponse.headers().location, base).pathname, loginPath)
    const page = await context.newPage()
    await page.goto(new URL(response.headers().location, base).href, { waitUntil: 'domcontentloaded' })
    assert.equal(new URL(page.url()).pathname, destination)
    await page.locator('h1').first().waitFor({ state: 'visible' })
    results.push({ route, destination, cookieCleared: true, originGuard: true, authenticationRequired: true })
    await context.close()
  }

  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const login = await context.request.post(base + '/api/auth/login', {
      form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/community' },
      headers: { Origin: base }, maxRedirects: 0,
    })
    assert.equal(login.status(), 303)
    assert.ok((await context.cookies()).some(c => c.name === 'lien_admin_session' && c.value))
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base + '/admin/community', { waitUntil: 'domcontentloaded' })
    const logout = page.locator('form[action="/api/auth/logout"] button:visible').first()
    if (width < 768) await page.getByRole('button', { name: 'メニューを開く', exact: true }).click()
    await logout.waitFor({ state: 'visible' })
    await logout.click()
    await page.waitForURL(base + '/business', { waitUntil: 'domcontentloaded' })
    await page.locator('h1').first().waitFor({ state: 'visible' })
    assert.ok(!((await context.cookies()).some(c => c.name === 'lien_admin_session')))
    await page.screenshot({ path: path.join(out, `salon-logout-${width}.png`), fullPage: false })
    await page.goto(base + '/admin/community', { waitUntil: 'domcontentloaded' })
    assert.equal(new URL(page.url()).pathname, '/admin/login')
    results.push({ width, salonButton: true, destination: '/business', errors })
    await context.close()
  }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify({ passed: true, results }))
} finally {
  await browser.close()
}
