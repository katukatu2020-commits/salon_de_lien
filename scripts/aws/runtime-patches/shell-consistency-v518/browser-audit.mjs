import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const outputRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v518-audit')
const auditScope = process.env.AUDIT_SCOPE || 'all'
fs.mkdirSync(outputRoot, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })

async function loginAdmin(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' },
  })
  if (!response.ok()) throw new Error(`admin login failed with ${response.status()}`)
}

async function loginCustomer(context) {
  const response = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' },
  })
  if (!response.ok()) throw new Error(`customer login failed with ${response.status()}`)
}

async function inspect(page, pathname, name) {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(500)
  const state = await page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    }
    const info = element => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return {
        tag: element.tagName,
        className: String(element.className || '').slice(0, 240),
        id: element.id || '',
        text: String(element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180),
        ariaLabel: element.getAttribute('aria-label') || '',
        href: element.getAttribute('href') || '',
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        display: style.display,
        position: style.position,
        pointerEvents: style.pointerEvents,
        zIndex: style.zIndex,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }
    }
    const all = selector => [...document.querySelectorAll(selector)].filter(visible).map(info)
    const topActions = [...document.querySelectorAll('a,button')]
      .filter(visible)
      .filter(element => element.getBoundingClientRect().top < 92)
      .map(info)
    const bottomNavs = [...document.querySelectorAll('nav,[role="navigation"]')]
      .filter(visible)
      .filter(element => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return style.position === 'fixed' && rect.bottom >= innerHeight - 4
      })
      .map(info)
    return {
      pathname: location.pathname + location.search,
      title: document.title,
      bodyClass: document.body.className,
      htmlClass: document.documentElement.className,
      uiReady: document.documentElement.dataset.orimiaUiReady || '',
      viewport: { width: innerWidth, height: innerHeight, overflow: document.body.scrollWidth - innerWidth },
      headers: all('header,.admin-mobile-header,.admin-desktop-header,.admin-shell-header,.app-header'),
      sidebars: all('.admin-desktop-sidebar,aside'),
      brandCandidates: all('.admin-desktop-sidebar a:first-of-type,.admin-mobile-header a:first-of-type,.app-header a:first-of-type,header a:first-of-type'),
      topActions,
      bottomNavs,
      navs: all('nav'),
      mains: all('main'),
      poweredByCount: [...document.body.childNodes].filter(Boolean).length && (document.body.innerText.match(/Powered by ORIMIA/g) || []).length,
      forSalonCount: (document.body.innerText.match(/ORIMIA for Salon/g) || []).length,
      shellMarkup: {
        adminHeader: document.querySelector('.admin-shell-header')?.outerHTML.slice(0, 10000) || '',
        adminSidebar: document.querySelector('.admin-desktop-sidebar')?.outerHTML.slice(0, 10000) || '',
        adminStage: document.querySelector('.admin-app-shell > div.min-w-0')?.outerHTML.slice(0, 1800) || '',
        adminToggle: document.querySelector('.ts-sidebar-toggle,[aria-label="サイドバーを閉じる"],[aria-label="サイドバーを開く"]')?.outerHTML.slice(0, 1800) || '',
        customerHeader: document.querySelector('.customer-premium-topbar,.app-header,.topbar')?.outerHTML.slice(0, 10000) || '',
      },
    }
  })
  await page.screenshot({ path: path.join(outputRoot, `${name}.png`), fullPage: false })
  return state
}

const results = { admin: {}, customer: {} }

try {
  if (auditScope === 'all' || auditScope === 'admin') {
  const admin = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await loginAdmin(admin)
  const adminPage = await admin.newPage()
  for (const [pathname, name] of [
    ['/admin/appointments', 'admin-appointments-mobile'],
    ['/admin/customers', 'admin-customers-mobile'],
    ['/admin/products?section=menus', 'admin-products-mobile'],
    ['/admin/community', 'admin-community-mobile'],
    ['/admin/settings', 'admin-settings-mobile'],
  ]) results.admin[name] = await inspect(adminPage, pathname, name)
  await admin.close()

  const desktop = await browser.newContext({ viewport: { width: 1536, height: 900 } })
  await loginAdmin(desktop)
  const desktopPage = await desktop.newPage()
  results.admin.desktop = await inspect(desktopPage, '/admin/appointments', 'admin-appointments-desktop')
  await desktop.close()
  }

  if (auditScope === 'all' || auditScope === 'customer') {
  const customer = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await loginCustomer(customer)
  const customerPage = await customer.newPage()
  for (const [pathname, name] of [
    ['/u/home', 'customer-home-mobile'],
    ['/u/appointments', 'customer-appointments-mobile'],
    ['/u/chat', 'customer-chat-mobile'],
    ['/u/community', 'customer-community-mobile'],
    ['/u/profile', 'customer-profile-mobile'],
  ]) results.customer[name] = await inspect(customerPage, pathname, name)
  await customer.close()
  }

  console.log(JSON.stringify({ outputRoot, results }, null, 2))
} finally {
  await browser.close()
}
