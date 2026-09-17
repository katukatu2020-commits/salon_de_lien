import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'mobile-commercial-v657', 'production-smoke')
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/chromium')
fs.mkdirSync(output, { recursive: true })

const health = await fetch(`${baseUrl}/api/health/ready`, { redirect: 'manual' })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-mobile-workspaces'), 'v657')

const stylesheet = await fetch(`${baseUrl}/mobile-workspaces-v657.css?v=657-release1`)
assert.equal(stylesheet.status, 200)
const css = await stylesheet.text()
assert.match(css, /@media \(max-width: 767\.98px\)/)
assert.match(css, /\.orimia-admin-bottom-nav-v518/)
assert.match(css, /\.wo-dealer-mobile-nav/)

const behavior = await fetch(`${baseUrl}/mobile-workspaces-v657.js?v=657-release1`)
assert.equal(behavior.status, 200)
const mobileScript = await behavior.text()
assert.match(mobileScript, /wo-mobile-form-disclosure-v657/)

for (const route of ['/admin/login', '/dealer/login']) {
  const response = await fetch(`${baseUrl}${route}`)
  assert.equal(response.status, 200)
  const html = await response.text()
  if (route === '/dealer/login') {
    assert.match(html, /id="orimia-mobile-workspaces-v657"/)
    assert.match(html, /id="orimia-mobile-workspaces-v657-script"/)
  }
}

const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const login = await context.request.post(`${baseUrl}/api/auth/login`, {
  form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' },
})
assert.ok(login.ok(), `Admin login failed: ${login.status()}`)

const routes = [
  ['appointments', '/admin/appointments'],
  ['customers', '/admin/customers'],
  ['products', '/admin/products'],
  ['styles', '/admin/community'],
  ['settings', '/admin/settings'],
]
const report = []

try {
  const page = await context.newPage()
  for (const [name, route] of routes) {
    const errors = []
    const onError = error => {
      if (!/Minified React error #\d+/.test(error.message)) errors.push(error.message)
    }
    page.on('pageerror', onError)
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.locator('.admin-main-content').waitFor({ state: 'visible', timeout: 20_000 })
    await page.waitForTimeout(1_000)
    const metrics = await page.evaluate(() => {
      const main = document.querySelector('.admin-main-content')
      const nav = document.querySelector('.orimia-admin-bottom-nav-v518')
      const visible = element => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      }
      const intro = [...(main?.querySelectorAll('header.lien-glass') || [])].find(visible) || null
      const introMedia = intro?.querySelector('div:has(> figure)')
      return {
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        navHeight: nav?.getBoundingClientRect().height || 0,
        introHeight: intro?.getBoundingClientRect().height || 0,
        introMediaDisplay: introMedia ? getComputedStyle(introMedia).display : null,
        stylesheet: Boolean(document.getElementById('orimia-mobile-workspaces-v657')),
      }
    })
    assert.ok(metrics.overflow <= 2, `${name} overflowed by ${metrics.overflow}px`)
    assert.ok(metrics.navHeight >= 75, `${name} bottom navigation is too short`)
    assert.ok(metrics.introHeight === 0 || metrics.introHeight < 300, `${name} introduction is too tall`)
    if (metrics.introMediaDisplay !== null) assert.equal(metrics.introMediaDisplay, 'none')
    assert.equal(metrics.stylesheet, true)
    assert.deepEqual(errors, [])
    await page.screenshot({ path: path.join(output, `${name}-mobile.png`), fullPage: false })
    report.push({ name, ...metrics })
    page.removeListener('pageerror', onError)
  }
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ release: 'mobile-workspaces-v657', productionVerified: true, routes: routes.length, output }))
} finally {
  await context.close()
  await browser.close()
}
