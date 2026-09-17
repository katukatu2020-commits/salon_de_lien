import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const route = process.argv[2] || '/admin/appointments'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const browser = await chromium.launch({ executablePath, headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
try {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: route },
  })
  if (!response.ok()) throw new Error(`Admin login failed: ${response.status()}`)
  const page = await context.newPage()
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  await page.locator('.admin-main-content').waitFor({ state: 'visible', timeout: 20_000 })
  if (process.env.MOBILE_CSS_PATH) {
    await page.addStyleTag({ content: fs.readFileSync(process.env.MOBILE_CSS_PATH, 'utf8') })
  }
  await page.waitForTimeout(1_200)
  const result = await page.evaluate(() => {
    const describe = element => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id,
        class: element.className,
        text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 140),
        rect: [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)],
        display: style.display,
        overflow: `${style.overflowX}/${style.overflowY}`,
        ancestors: [...function * parents() { let parent = element.parentElement; while (parent && parent !== document.body) { yield `${parent.tagName.toLowerCase()}#${parent.id}.${parent.className}`; parent = parent.parentElement } }()].slice(0, 8),
        children: [...element.children].slice(0, 12).map(child => ({
          tag: child.tagName.toLowerCase(),
          id: child.id,
          class: child.className,
          text: child.textContent?.replace(/\s+/g, ' ').trim().slice(0, 100),
          rect: (() => { const value = child.getBoundingClientRect(); return [Math.round(value.x), Math.round(value.y), Math.round(value.width), Math.round(value.height)] })(),
        })),
      }
    }
    const main = document.querySelector('.admin-main-content')
    const root = main?.firstElementChild
    return {
      path: location.pathname + location.search,
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className,
      workspaceMedia: [...document.querySelectorAll('header[data-orimia-admin-workspace-source-v572] > div > div:has(> figure)')].map(describe),
      main: main ? describe(main) : null,
      root: root ? describe(root) : null,
      rootChildren: root ? [...root.children].slice(0, 16).map(describe) : [],
      headers: [...document.querySelectorAll('.admin-main-content header')].slice(0, 8).map(describe),
      navs: [...document.querySelectorAll('.admin-main-content nav')].slice(0, 8).map(describe),
      firstHeaderHtml: document.querySelector('.admin-main-content > div > header')?.outerHTML.slice(0, 12_000),
      visibleHeaderHtml: [...document.querySelectorAll('.admin-main-content header.lien-glass')].find(element => element.getBoundingClientRect().width > 0)?.outerHTML.slice(0, 12_000),
      focusedHtml: document.querySelector('#customer-list, #product-catalog, #staff-schedule, .community-admin-page, .ca-setup-card')?.outerHTML.slice(0, 30_000),
    }
  })
  console.log(JSON.stringify(result, null, 2))
} finally {
  await context.close()
  await browser.close()
}
