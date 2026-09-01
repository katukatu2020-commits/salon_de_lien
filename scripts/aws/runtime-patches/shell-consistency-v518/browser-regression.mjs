import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3123').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const browser = await chromium.launch({ executablePath, headless: true })

async function auditedContext(options) {
  const context = await browser.newContext(options)
  await context.addInitScript(() => {
    window.__orimiaV518RevealStates = []
    const capture = () => {
      if (document.documentElement.dataset.orimiaUiReady !== 'v516') return
      window.__orimiaV518RevealStates.push({
        href: location.pathname + location.search,
        shellReady: document.documentElement.dataset.orimiaShellReady || '',
        powered: (document.body?.innerText.match(/Powered by ORIMIA/g) || []).length,
        forSalon: (document.body?.innerText.match(/ORIMIA for Salon/g) || []).length,
      })
    }
    const observe = () => {
      if (!document.documentElement) return window.setTimeout(observe, 0)
      new MutationObserver(capture).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-orimia-ui-ready'],
      })
      capture()
    }
    observe()
  })
  return context
}

async function loginAdmin(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' },
  })
  assert.equal(response.ok(), true, `admin login failed with ${response.status()}`)
}

async function loginCustomer(context) {
  const response = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' },
  })
  assert.equal(response.ok(), true, `customer login failed with ${response.status()}`)
}

async function ready(page, pathname) {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout: 9000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaShellReady === 'v518', null, { timeout: 3000 })
  await page.waitForTimeout(160)
  const reveal = await page.evaluate(() => window.__orimiaV518RevealStates?.at(-1) || null)
  assert.ok(reveal, `${pathname} captured the first visible frame`)
  assert.equal(reveal.shellReady, 'v518', `${pathname} shell was ready before first reveal`)
  assert.equal(reveal.powered, 0, `${pathname} never revealed the retired customer brand`)
}

async function clickable(page, selector, label) {
  const state = await page.locator(selector).first().evaluate(element => {
    const rect = element.getBoundingClientRect()
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const hit = document.elementFromPoint(point.x, point.y)
    const style = getComputedStyle(element)
    return {
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
      visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
      pointer: style.pointerEvents,
      topmost: Boolean(hit && (hit === element || element.contains(hit))),
    }
  })
  assert.equal(state.visible, true, `${label} is visible`)
  assert.equal(state.pointer, 'auto', `${label} accepts pointer events`)
  assert.equal(state.topmost, true, `${label} is the topmost target at its center`)
  assert.ok(state.rect.width >= 40 && state.rect.height >= 40, `${label} has a 40px touch target`)
  return state.rect
}

async function adminMobileChecks() {
  const context = await auditedContext({ viewport: { width: 390, height: 844 } })
  await loginAdmin(context)
  const page = await context.newPage()
  const routes = [
    ['/admin/appointments', '\u4e88\u7d04'],
    ['/admin/customers', '\u9867\u5ba2'],
    ['/admin/products?section=menus', '\u5546\u54c1'],
    ['/admin/community', '\u30b9\u30bf\u30a4\u30eb'],
    ['/admin/owner-analytics', '\u96c6\u8a08'],
    ['/admin/settings', ''],
  ]

  for (const [pathname, activeLabel] of routes) {
    await ready(page, pathname)
    const state = await page.evaluate(() => ({
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      brand: document.querySelector('.admin-mobile-header > a')?.innerText.replace(/\s+/g, ' ').trim() || '',
      iconImage: document.querySelector('.admin-mobile-header > a [role="img"]')?.style.backgroundImage || '',
      bottomLabels: [...document.querySelectorAll('#admin-mobile-bottom-nav-v518 a')].map(link => link.innerText.trim()),
      activeLabel: document.querySelector('#admin-mobile-bottom-nav-v518 [aria-current="page"]')?.innerText.trim() || '',
      navRect: (() => {
        const rect = document.getElementById('admin-mobile-bottom-nav-v518')?.getBoundingClientRect()
        return rect ? { x: rect.x, width: rect.width, bottom: rect.bottom } : null
      })(),
    }))
    assert.ok(state.overflow <= 0, `${pathname} has no horizontal overflow`)
    assert.match(state.brand, /ORIMIA for Salon/)
    assert.match(state.iconImage, /orimia-icon-192/)
    assert.deepEqual(state.bottomLabels, ['\u4e88\u7d04', '\u9867\u5ba2', '\u5546\u54c1', '\u30b9\u30bf\u30a4\u30eb', '\u96c6\u8a08'])
    assert.equal(state.activeLabel, activeLabel)
    assert.deepEqual(state.navRect, { x: 0, width: 390, bottom: 844 })

    const back = await clickable(page, '.admin-mobile-header [data-store-back-v501]', `${pathname} admin back`)
    const notification = await clickable(page, '.admin-mobile-header .ca-notification-button', `${pathname} admin notifications`)
    const menu = await clickable(page, '.admin-mobile-header button[aria-label="\u30e1\u30cb\u30e5\u30fc\u3092\u958b\u304f"]', `${pathname} admin menu`)
    const brand = await page.locator('.admin-mobile-header > a').evaluate(element => {
      const rect = element.getBoundingClientRect()
      return { left: rect.left, right: rect.right }
    })
    assert.ok(back.right <= brand.left + 1, `${pathname} back does not overlap the brand`)
    assert.ok(brand.right <= notification.x + 1, `${pathname} brand does not overlap notifications`)
    assert.ok(notification.right <= menu.x + 1, `${pathname} notification does not overlap menu`)
  }

  await ready(page, '/admin/appointments')
  await Promise.all([
    page.waitForURL(/\/admin\/appointments\?notificationHistory=1/),
    page.locator('.admin-mobile-header .ca-notification-button').click(),
  ])
  await page.waitForFunction(() => document.documentElement.dataset.orimiaShellReady === 'v518')

  await ready(page, '/admin/appointments')
  await page.locator('.admin-mobile-header button[aria-label="\u30e1\u30cb\u30e5\u30fc\u3092\u958b\u304f"]').click()
  await page.waitForTimeout(120)
  const menuState = await page.evaluate(() => ({
    buttonLabel: document.querySelector('.admin-mobile-header button[aria-label*="\u30e1\u30cb\u30e5\u30fc"]')?.getAttribute('aria-label') || '',
    candidates: [...document.querySelectorAll('aside,[role="dialog"],[data-state]')].map(element => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        className: String(element.className || '').slice(0, 180),
        text: String(element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 220),
        state: element.getAttribute('data-state') || '',
        hidden: element.hidden,
        display: style.display,
        visibility: style.visibility,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      }
    }).filter(item => item.rect.width > 0 || item.display !== 'none'),
  }))
  const drawerVisible = menuState.candidates.some(item => item.display !== 'none'
    && item.visibility !== 'hidden'
    && item.rect.width >= 280
    && item.rect.height >= 800
    && item.text.includes('\u4e88\u7d04\u30ab\u30ec\u30f3\u30c0\u30fc'))
  if (process.env.DEBUG_SHELL === '1') console.log(JSON.stringify({ adminMenuState: menuState }, null, 2))
  if (!drawerVisible) console.log(JSON.stringify({ adminMenuDebug: menuState }, null, 2))
  assert.equal(drawerVisible, true, 'admin menu opens the mobile drawer')

  await ready(page, '/admin/appointments')
  await page.locator('#admin-mobile-bottom-nav-v518 a[href="/admin/customers"]').click()
  await page.waitForURL(/\/admin\/customers(?:\?|$)/)
  await page.waitForFunction(() => document.documentElement.dataset.orimiaShellReady === 'v518')
  await page.locator('.admin-mobile-header [data-store-back-v501]').click()
  await page.waitForURL(/\/admin\/appointments(?:\?|$)/)
  await context.close()
}

async function adminDesktopChecks() {
  const context = await auditedContext({ viewport: { width: 1536, height: 900 } })
  await context.addInitScript(() => localStorage.removeItem('salon-admin-sidebar-collapsed'))
  await loginAdmin(context)
  const page = await context.newPage()
  await ready(page, '/admin/appointments')
  const expanded = await page.evaluate(() => {
    const sidebar = document.querySelector('.admin-desktop-sidebar')
    const stage = document.querySelector('.admin-app-shell > div.min-w-0')
    const main = document.querySelector('.admin-main-content')
    const title = sidebar?.querySelector('span.min-w-0 > span:first-child')
    const sidebarRect = sidebar?.getBoundingClientRect()
    const stageRect = stage?.getBoundingClientRect()
    const mainRect = main?.getBoundingClientRect()
    return {
      sidebar: sidebarRect ? { x: sidebarRect.x, width: sidebarRect.width } : null,
      stage: stageRect ? { x: stageRect.x, width: stageRect.width } : null,
      main: mainRect ? { x: mainRect.x, width: mainRect.width } : null,
      brand: title?.textContent || '',
      clipped: title ? title.scrollWidth > title.clientWidth + 1 : true,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      debug: {
        htmlClass: document.documentElement.className,
        sidebarClass: sidebar?.className || '',
        stageClass: stage?.className || '',
        stageStyle: stage?.getAttribute('style') || '',
        toggleLabel: document.querySelector('.ts-sidebar-toggle')?.getAttribute('aria-label') || '',
        preference: localStorage.getItem('salon-admin-sidebar-collapsed'),
      },
    }
  })
  if (process.env.DEBUG_SHELL === '1') console.log(JSON.stringify({ adminDesktopState: expanded }, null, 2))
  assert.deepEqual(expanded.sidebar, { x: 0, width: 288 })
  assert.deepEqual(expanded.stage, { x: 0, width: 1536 })
  assert.deepEqual(expanded.main, { x: 288, width: 1248 })
  assert.equal(expanded.brand, 'ORIMIA for Salon')
  assert.equal(expanded.clipped, false)
  assert.ok(expanded.overflow <= 0)

  const toggle = page.locator('.ts-sidebar-toggle')
  await toggle.click()
  await page.waitForTimeout(260)
  const collapsed = await page.evaluate(() => {
    const mainX = document.querySelector('.admin-main-content')?.getBoundingClientRect().x
    const toggleLeft = document.querySelector('.ts-sidebar-toggle')?.getBoundingClientRect().x
    return {
      mainX: Math.round(mainX ?? -1),
      toggleLeft: Math.round(toggleLeft ?? -1),
    }
  })
  assert.equal(collapsed.mainX, 0)
  assert.ok(collapsed.toggleLeft >= 10 && collapsed.toggleLeft <= 16)
  await toggle.click()
  await page.waitForTimeout(260)
  assert.equal(Math.round(await page.locator('.admin-main-content').evaluate(element => element.getBoundingClientRect().x)), 288)
  await context.close()
}

async function customerChecks() {
  const context = await auditedContext({ viewport: { width: 390, height: 844 } })
  await loginCustomer(context)
  const page = await context.newPage()
  await ready(page, '/u/home')
  const homeStyle = await page.locator('.orimia-customer-brand-title-v518').evaluate(element => {
    const style = getComputedStyle(element)
    return { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, fontStyle: style.fontStyle }
  })
  assert.equal(await page.locator('[data-customer-shell-back-v518]').count(), 0)

  for (const pathname of ['/u/appointments', '/u/chat', '/u/community', '/u/profile']) {
    await ready(page, pathname)
    const state = await page.evaluate(() => ({
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      headerHeight: document.querySelector('.orimia-customer-header-v518')?.getBoundingClientRect().height || 0,
      powered: (document.body.innerText.match(/Powered by ORIMIA/g) || []).length,
      brand: document.querySelector('.orimia-customer-brand-title-v518')?.textContent || '',
      navItems: document.querySelectorAll('#customer-mobile-bottom-nav a').length,
    }))
    assert.ok(state.overflow <= 0, `${pathname} has no horizontal overflow`)
    assert.equal(state.headerHeight, 68)
    assert.equal(state.powered, 0)
    assert.equal(state.brand, 'ORIMIA for Salon')
    assert.equal(state.navItems, 4)

    const back = await clickable(page, '[data-customer-shell-back-v518]', `${pathname} customer back`)
    const menu = await clickable(page, '.orimia-customer-menu-v518', `${pathname} customer menu`)
    const news = await clickable(page, '.orimia-customer-news-v518', `${pathname} customer news`)
    const brand = await page.locator('.orimia-customer-brand-v518').evaluate(element => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element.querySelector('.orimia-customer-brand-title-v518'))
      return {
        rect: { left: rect.left, right: rect.right },
        style: { family: style.fontFamily, size: style.fontSize, weight: style.fontWeight, fontStyle: style.fontStyle },
      }
    })
    assert.deepEqual(brand.style, homeStyle, `${pathname} uses the shared customer header typography`)
    assert.ok(back.right <= brand.rect.left + 1, `${pathname} back does not overlap the brand`)
    assert.ok(brand.rect.right <= menu.x + 1, `${pathname} brand does not overlap menu`)
    assert.ok(menu.right <= news.x + 1, `${pathname} menu does not overlap notifications`)
  }

  await ready(page, '/u/home')
  await ready(page, '/u/appointments')
  await page.locator('[data-customer-shell-back-v518]').click()
  await page.waitForURL(/\/u\/home(?:\?|$)/)

  const manifestResponse = await context.request.get(`${baseUrl}/orimia-for-salon.webmanifest?v=518`)
  assert.equal(manifestResponse.ok(), true)
  const manifest = await manifestResponse.json()
  assert.equal(manifest.name, 'ORIMIA for Salon')
  await context.close()
}

try {
  await adminMobileChecks()
  await adminDesktopChecks()
  await customerChecks()
  console.log(JSON.stringify({ release: 'shell-consistency-v518', browserVerified: true, baseUrl }))
} finally {
  await browser.close()
}
