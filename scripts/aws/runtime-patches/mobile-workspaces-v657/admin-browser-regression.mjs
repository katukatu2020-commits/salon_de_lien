import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const cssPath = process.env.MOBILE_CSS_PATH || path.join(process.env.LIEN_RUNTIME_ROOT || '/app', 'public', 'mobile-workspaces-v657.css')
const css = fs.readFileSync(cssPath, 'utf8')
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'mobile-commercial-v657', 'admin-browser')
const executablePath = process.env.CHROME_PATH || (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/chromium')
fs.mkdirSync(output, { recursive: true })

const routes = [
  ['appointments', '/admin/appointments'],
  ['customers', '/admin/customers'],
  ['products', '/admin/products'],
  ['styles', '/admin/community'],
  ['analytics', '/admin/owner-analytics'],
  ['settings', '/admin/settings'],
  ['account', '/admin/account'],
  ['messages', '/admin/customers/messages'],
  ['inventory', '/admin/products/orders'],
]

const browser = await chromium.launch({ executablePath, headless: true })
const results = []

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' },
  })
  assert.ok(response.ok(), `Admin login failed: ${response.status()}`)
}

async function signature(page) {
  return page.evaluate(() => {
    const inspect = selector => {
      const element = document.querySelector(selector)
      if (!element) return null
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return { display: style.display, width: rect.width, height: rect.height, padding: style.padding, borderRadius: style.borderRadius, fontSize: style.fontSize }
    }
    return {
      main: inspect('.admin-main-content'),
      shell: inspect('.admin-app-shell'),
      header: inspect('.admin-shell-header'),
      intro: inspect('.admin-main-content > div > header.lien-glass'),
      nav: inspect('.orimia-admin-bottom-nav-v518'),
    }
  })
}

try {
  /* Prove the stylesheet is inert at desktop width against the current production parent. */
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
  await login(desktop)
  const desktopPage = await desktop.newPage()
  await desktopPage.goto(`${baseUrl}/admin/products`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await desktopPage.locator('.admin-main-content').waitFor({ state: 'visible', timeout: 20_000 })
  await desktopPage.waitForTimeout(700)
  const before = await signature(desktopPage)
  await desktopPage.addStyleTag({ content: css })
  const after = await signature(desktopPage)
  assert.deepEqual(after, before, 'mobile stylesheet changed the salon desktop layout')
  await desktopPage.screenshot({ path: path.join(output, 'products-desktop.png'), fullPage: false })
  await desktop.close()

  for (const viewport of [{ name: 'phone-390', width: 390, height: 844 }, { name: 'phone-360', width: 360, height: 800 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 })
    await login(context)
    const page = await context.newPage()
    for (const [name, route] of routes) {
      const errors = []
      const errorHandler = error => {
        if (!/Minified React error #\d+/.test(error.message)) errors.push(error.message)
      }
      page.on('pageerror', errorHandler)
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
      await page.locator('.admin-main-content').waitFor({ state: 'visible', timeout: 20_000 })
      await page.addStyleTag({ content: css })
      await page.waitForTimeout(900)

      const metrics = await page.evaluate(() => {
        const visible = element => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
        }
        const main = document.querySelector('.admin-main-content')
        const nav = document.querySelector('.orimia-admin-bottom-nav-v518')
        const intro = [...(main?.querySelectorAll('header.lien-glass') || [])].find(visible) || null
        const introMedia = intro?.querySelector('div:has(> figure)')
        const workspaceMedia = [...(main?.querySelectorAll('header[data-orimia-admin-workspace-source-v572] > div > div:has(> figure), header[data-inventory-orders-page-header-v572] .orimia-inventory-hero-image-v572') || [])]
        const setupCard = main?.querySelector('.ca-setup-card')
        const inputs = [...main.querySelectorAll(':is(input:not([type="checkbox"]):not([type="radio"]),select,textarea)')].filter(visible)
        const navLinks = nav ? [...nav.querySelectorAll('a')].filter(visible) : []
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          navHeight: nav?.getBoundingClientRect().height || 0,
          navLinks: navLinks.map(element => ({ height: element.getBoundingClientRect().height, fontSize: Number.parseFloat(getComputedStyle(element).fontSize) })),
          introHeight: intro?.getBoundingClientRect().height || 0,
          introRadius: intro ? getComputedStyle(intro).borderRadius : null,
          introMediaDisplay: introMedia ? getComputedStyle(introMedia).display : null,
          workspaceMediaDisplays: workspaceMedia.map(element => getComputedStyle(element).display),
          setupCard: setupCard ? {
            borderTopWidth: getComputedStyle(setupCard).borderTopWidth,
            padding: getComputedStyle(setupCard).padding,
            backgroundColor: getComputedStyle(setupCard).backgroundColor,
          } : null,
          inputs: inputs.slice(0, 30).map(element => ({ tag: element.tagName, type: element.type || '', id: element.id || '', className: String(element.className || '').slice(0, 100), height: element.getBoundingClientRect().height, fontSize: Number.parseFloat(getComputedStyle(element).fontSize) })),
        }
      })

      assert.ok(metrics.overflow <= 2, `${viewport.name} ${name} overflowed by ${metrics.overflow}px`)
      assert.ok(metrics.navHeight >= 75, `${viewport.name} ${name} navigation is too short`)
      assert.equal(metrics.navLinks.length, 5, `${viewport.name} ${name} should expose five primary actions`)
      for (const link of metrics.navLinks) {
        assert.ok(link.height >= 75)
        assert.ok(link.fontSize >= 10.4)
      }
      assert.ok(metrics.introHeight === 0 || metrics.introHeight < 300, `${viewport.name} ${name} introduction is too tall`)
      if (metrics.introRadius !== null) assert.equal(metrics.introRadius, '8px')
      if (metrics.introMediaDisplay !== null) assert.equal(metrics.introMediaDisplay, 'none')
      if (name === 'inventory') assert.ok(metrics.workspaceMediaDisplays.length > 0 && metrics.workspaceMediaDisplays.every(value => value === 'none'), `${viewport.name} inventory decorative media remained visible`)
      if (name === 'settings') {
        assert.equal(metrics.setupCard?.borderTopWidth, '0px')
        assert.equal(metrics.setupCard?.padding, '0px')
        assert.equal(metrics.setupCard?.backgroundColor, 'rgba(0, 0, 0, 0)')
      }
      for (const input of metrics.inputs) {
        if (!['range', 'color', 'hidden'].includes(input.type)) assert.ok(input.height >= 44, `${viewport.name} ${name} input is too short: ${JSON.stringify(input)}`)
        assert.ok(input.fontSize >= 16, `${viewport.name} ${name} input may trigger iOS zoom: ${JSON.stringify(input)}`)
      }
      assert.deepEqual(errors, [])

      await page.screenshot({ path: path.join(output, `${name}-${viewport.name}-top.png`), fullPage: false })
      if (viewport.name === 'phone-390') await page.screenshot({ path: path.join(output, `${name}-${viewport.name}-full.png`), fullPage: true })
      results.push({ viewport: viewport.name, name, ...metrics })
      page.removeListener('pageerror', errorHandler)
    }
    await context.close()
  }

  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ desktopUnchanged: true, results }, null, 2))
  console.log(JSON.stringify({ release: 'mobile-workspaces-v657', adminBrowserVerified: true, desktopUnchanged: true, routes: routes.length, viewports: 2, output }))
} finally {
  await browser.close()
}
