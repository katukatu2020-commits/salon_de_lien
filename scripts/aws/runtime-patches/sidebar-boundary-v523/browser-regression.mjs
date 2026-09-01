import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3128').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'sidebar-boundary-v523')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' },
  })
  assert.equal(response.ok(), true, `admin login returned ${response.status()}`)
}

async function openAt(width, pathname = '/admin/appointments') {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await context.addInitScript(() => localStorage.removeItem('salon-admin-sidebar-collapsed'))
  await login(context)
  const page = await context.newPage()
  await page.goto(`${baseUrl}${pathname}?regression=v523`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaShellReady === 'v518')
  await page.locator('.admin-main-content').waitFor({ state: 'visible' })
  await page.waitForTimeout(900)
  return { context, page }
}

async function expandedGeometry(page) {
  return page.evaluate(() => {
    const sidebar = document.querySelector('.admin-desktop-sidebar')
    const toggle = document.querySelector('.ts-sidebar-toggle')
    const title = sidebar?.querySelector('span.min-w-0 > span:first-child')
    const main = document.querySelector('.admin-main-content')
    const sidebarRect = sidebar?.getBoundingClientRect()
    const toggleRect = toggle?.getBoundingClientRect()
    const titleRange = title ? document.createRange() : null
    if (titleRange && title) titleRange.selectNodeContents(title)
    const titleRect = titleRange?.getBoundingClientRect()
    const mainRect = main?.getBoundingClientRect()
    return {
      sidebarRight: sidebarRect?.right ?? -1,
      sidebarWidth: sidebarRect?.width ?? -1,
      toggleLeft: toggleRect?.left ?? -1,
      toggleCenter: toggleRect ? toggleRect.left + toggleRect.width / 2 : -1,
      toggleWidth: toggleRect?.width ?? -1,
      titleRight: titleRect?.right ?? -1,
      mainLeft: mainRect?.left ?? -1,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      marker: getComputedStyle(toggle).left,
      stylesheet: document.getElementById('orimia-shell-consistency-style-v518')?.getAttribute('href') || '',
    }
  })
}

function assertExpanded(state, width) {
  assert.equal(Math.round(state.sidebarWidth), 288, `${width}px sidebar width changed`)
  assert.equal(Math.round(state.toggleWidth), 38, `${width}px toggle width changed`)
  assert.ok(Math.abs(state.toggleCenter - state.sidebarRight) <= 0.5, `${width}px toggle center misses boundary: ${JSON.stringify(state)}`)
  assert.ok(state.toggleLeft - state.titleRight >= 8, `${width}px toggle overlaps brand title: ${JSON.stringify(state)}`)
  assert.equal(Math.round(state.mainLeft), 288, `${width}px main stage is misaligned`)
  assert.equal(state.stylesheet, '/shell-consistency-v518.css?v=523-boundary1')
}

try {
  const sizes = [976, 1280, 1536]
  const measurements = []
  for (const width of sizes) {
    const { context, page } = await openAt(width)
    const expanded = await expandedGeometry(page)
    assertExpanded(expanded, width)
    measurements.push({ width, expanded })

    if (width === 976) {
      await page.screenshot({ path: path.join(screenshotDir, 'sidebar-expanded-976.png'), fullPage: false })
      const toggle = page.locator('.ts-sidebar-toggle')
      await toggle.click()
      await page.waitForFunction(() => document.documentElement.classList.contains('orimia-admin-sidebar-collapsed-v518'))
      await page.waitForTimeout(260)
      const collapsed = await page.evaluate(() => {
        const toggleRect = document.querySelector('.ts-sidebar-toggle')?.getBoundingClientRect()
        const sidebarRect = document.querySelector('.admin-desktop-sidebar')?.getBoundingClientRect()
        const mainRect = document.querySelector('.admin-main-content')?.getBoundingClientRect()
        return {
          toggleLeft: toggleRect?.left ?? -1,
          sidebarRight: sidebarRect?.right ?? 1,
          mainLeft: mainRect?.left ?? -1,
        }
      })
      assert.ok(collapsed.toggleLeft >= 11.5 && collapsed.toggleLeft <= 12.5, `collapsed toggle moved: ${JSON.stringify(collapsed)}`)
      assert.ok(collapsed.sidebarRight <= 1, `collapsed sidebar remains visible: ${JSON.stringify(collapsed)}`)
      assert.ok(Math.abs(collapsed.mainLeft) <= 0.5, `collapsed main stage remains offset: ${JSON.stringify(collapsed)}`)
      await page.screenshot({ path: path.join(screenshotDir, 'sidebar-collapsed-976.png'), fullPage: false })

      await toggle.click()
      await page.waitForFunction(() => !document.documentElement.classList.contains('orimia-admin-sidebar-collapsed-v518'))
      await page.waitForTimeout(260)
      assertExpanded(await expandedGeometry(page), width)
    }
    await context.close()
  }

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await login(mobileContext)
  const mobilePage = await mobileContext.newPage()
  await mobilePage.goto(`${baseUrl}/admin/appointments?regression=v523-mobile`, { waitUntil: 'domcontentloaded' })
  await mobilePage.waitForFunction(() => document.documentElement.dataset.orimiaShellReady === 'v518')
  const mobile = await mobilePage.evaluate(() => ({
    toggleVisible: document.querySelector('.ts-sidebar-toggle')?.checkVisibility() ?? false,
    overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
  }))
  assert.equal(mobile.toggleVisible, false)
  assert.ok(mobile.overflow <= 1, `mobile page overflows by ${mobile.overflow}px`)
  await mobileContext.close()

  console.log(JSON.stringify({ release: 'sidebar-boundary-v523', browserVerified: true, measurements }))
} finally {
  await browser.close()
}
