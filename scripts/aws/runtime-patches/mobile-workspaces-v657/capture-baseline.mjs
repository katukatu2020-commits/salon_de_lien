import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const output = process.env.SCREENSHOT_DIR || path.resolve('artifacts', 'mobile-commercial-v657', 'baseline-sweep')

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

fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 })
const response = await context.request.post(`${baseUrl}/api/auth/login`, {
  form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' },
})
if (!response.ok()) throw new Error(`Admin login failed: ${response.status()}`)

const report = []
try {
  const page = await context.newPage()
  for (const [name, route] of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
    await page.locator('.admin-main-content').waitFor({ state: 'visible', timeout: 20_000 })
    await page.waitForTimeout(1_500)
    const metrics = await page.evaluate(() => {
      const visible = element => {
        const style = getComputedStyle(element)
        const rect = element.getBoundingClientRect()
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
      }
      const controls = [...document.querySelectorAll('.admin-main-content :is(button,a,input,select,textarea)')].filter(visible)
      const smallControls = controls.map(element => {
        const rect = element.getBoundingClientRect()
        return { tag: element.tagName, text: element.textContent?.trim().slice(0, 40), width: rect.width, height: rect.height }
      }).filter(item => item.height < 43 || item.width < 43)
      const smallText = [...document.querySelectorAll('.admin-main-content :is(p,span,small,label,th,td,a,button)')].filter(visible).map(element => ({
        text: element.textContent?.trim().slice(0, 40),
        size: Number.parseFloat(getComputedStyle(element).fontSize),
      })).filter(item => item.text && item.size < 11)
      const main = document.querySelector('.admin-main-content')
      const nav = document.querySelector('.orimia-admin-bottom-nav-v518') || document.querySelector('.admin-app-shell > aside')
      return {
        title: document.title,
        path: location.pathname + location.search,
        viewport: { width: innerWidth, height: innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        mainPadding: main ? getComputedStyle(main).padding : null,
        navHeight: nav ? nav.getBoundingClientRect().height : 0,
        smallControls: smallControls.slice(0, 20),
        smallControlCount: smallControls.length,
        smallText: smallText.slice(0, 20),
        smallTextCount: smallText.length,
      }
    })
    report.push({ name, ...metrics })
    await page.screenshot({ path: path.join(output, `${name}-top.png`), fullPage: false })
    await page.screenshot({ path: path.join(output, `${name}-full.png`), fullPage: true })
  }
} finally {
  await context.close()
  await browser.close()
}

fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify({ output, report }, null, 2))
