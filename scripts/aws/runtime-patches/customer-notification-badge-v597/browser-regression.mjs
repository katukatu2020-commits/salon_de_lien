import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium, webkit } = require('playwright-core')
const webkitMode = process.env.SMOKE_BROWSER === 'webkit'
const base = process.env.SMOKE_BASE_URL || 'http://localhost:3597'
const out = process.env.SCREENSHOT_DIR || 'artifacts/customer-notification-badge-v597/browser'
fs.mkdirSync(out, { recursive: true })
const badgeClass = 'absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#c54843] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#fffdf9]'
const nativeBadge = '.customer-premium-topbar a[href="/u/news"] > span.absolute'
const browser = await (webkitMode ? webkit.launch({ headless: true }) : chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }))
const results = []
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, ...(webkitMode && width < 1024 ? { isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : {}) })
    const visibleHeader = width >= 1024 ? '.ocd-header' : '.orimia-customer-header-v518'
    const login = await context.request.post(base + '/api/customer-auth/login', {
      form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' }, headers: { Origin: base }
    })
    assert.ok(login.ok(), 'Demo login failed')
    let count = 0
    // Replace only the browser's received fixture, never create or mark notifications in the database.
    await context.route('**/u/**', async route => {
      if (!new URL(route.request().url()).pathname.startsWith('/u/')) return route.continue()
      if (route.request().method() !== 'GET') return route.continue()
      const response = await route.fetch()
      const type = response.headers()['content-type'] || ''
      if (!/text\/(html|x-component)/.test(type)) return route.fulfill({ response })
      let body = await response.text()
      body = body.replace(/(\\?"unreadCount\\?":)\d+/g, (_, key) => key + count)
      if (type.includes('html')) {
        body = body.replace(/(<a[^>]*class="customer-premium-icon-button relative"[^>]*>)(<span class="customer-premium-bell-icon"[^>]*><\/span>)(?:<span[^>]*>[^<]*<\/span>)?(<\/a>)/g, (_, open, bell, close) =>
          open.replace(/aria-label="[^"]*"/, `aria-label="${count ? 'お知らせ 未読' + count + '件' : 'お知らせ'}"`) + bell +
          (count ? `<span class="${badgeClass}">${count > 99 ? '99+' : count}</span>` : '') + close)
      }
      await route.fulfill({ response, body })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', e => errors.push(e.message))
    for (count of [0, 1, 9, 10, 99, 100, 1000, 0]) {
      console.log('badge case', width, count)
      await page.goto(base + '/u/appointments')
      await page.waitForFunction(() => document.querySelector('.orimia-customer-header-v518'))
      await page.waitForSelector(visibleHeader, { state: 'visible' })
      const selector = width >= 1024 ? '.ocd-unread' : nativeBadge
      if (width >= 1024) await page.waitForSelector('.ocd-header')
      assert.equal(await page.locator('.customer-premium-topbar a[href="/u/news"]').getAttribute('aria-label'), count ? 'お知らせ 未読' + count + '件' : 'お知らせ')
      if (!count) {
        await page.waitForFunction(s => !document.querySelector(s) || getComputedStyle(document.querySelector(s)).display === 'none', selector)
        assert.equal(await page.locator(nativeBadge).count(), 0)
      } else {
        await page.waitForFunction(({ s, text }) => document.querySelector(s)?.textContent === text, { s: selector, text: count > 99 ? '99+' : String(count) })
        const metrics = await page.locator(selector).evaluate(el => {
          const style = getComputedStyle(el)
          const rect = el.getBoundingClientRect()
          const parent = el.parentElement.getBoundingClientRect()
          const range = document.createRange()
          range.selectNodeContents(el)
          const text = range.getBoundingClientRect()
          return { height: rect.height, width: rect.width, textWidth: text.width, textTop: text.top, textBottom: text.bottom, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, parentRight: parent.right, parentTop: parent.top, background: style.backgroundColor, color: style.color, shadow: style.boxShadow, viewport: innerWidth }
        })
        assert.equal(metrics.height, 20)
        assert.equal(metrics.background, 'rgb(197, 72, 99)')
        assert.equal(metrics.color, 'rgb(255, 255, 255)')
        assert.equal(metrics.shadow, 'none', 'No inherited blue Tailwind ring')
        assert.ok(metrics.width >= metrics.textWidth + 11)
        assert.ok(metrics.textTop >= metrics.top && metrics.textBottom <= metrics.bottom)
        assert.ok(metrics.left >= 0 && metrics.right <= metrics.viewport)
        assert.ok(Math.abs(metrics.right - metrics.parentRight) <= 3)
        assert.ok(Math.abs(metrics.top - metrics.parentTop) <= 3)
        if ([1, 10, 100].includes(count)) await page.screenshot({ path: path.join(out, `${width}-count-${count}.png`) })
      }
      results.push({ width, count, passed: true })
    }
    count = 12
    await page.goto(base + '/u/appointments')
    await page.waitForSelector(visibleHeader, { state: 'visible' })
    await page.waitForSelector(nativeBadge, { state: 'attached' })
    const selector = width >= 1024 ? '.ocd-unread' : nativeBadge
    // Follow the actual navigation, then go back; the component must retain its count.
    const historyLink = page.locator('a[href="/u/history"]:visible').first()
    if (await historyLink.count()) await historyLink.click()
    else await page.goto(base + '/u/history')
    await page.waitForURL(url => url.pathname === '/u/history')
    await page.waitForFunction(s => document.querySelector(s)?.textContent === '12', selector)
    await page.goBack()
    await page.waitForURL(url => url.pathname === '/u/appointments')
    await page.waitForFunction(s => document.querySelector(s)?.textContent === '12', selector)
    for (const route of ['/u/profile', '/u/home', '/u/menu']) {
      await page.goto(base + route)
      await page.waitForSelector(visibleHeader, { state: 'visible' })
      assert.equal(await page.locator('.customer-premium-bell-icon').count() > 1, false)
    }
    // Existing baseline hydration errors are reported, not silently discarded.
    results.push({ width, navigation: true, pageErrors: [...new Set(errors)] })
    await context.close()
  }
  // Verify the critical styles without any enhancement JS, including legacy badge markup.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false })
  const page = await context.newPage()
  const cssResponse = await context.request.get(base + '/shell-consistency-v518.css?v=597-notification-badge1')
  assert.ok(cssResponse.ok())
  const css = await cssResponse.text()
  assert.ok(css.includes('customer-notification-badge-v597'))
  await page.setContent(`<style>${css}</style><style>header a{display:block;width:40px;height:40px;margin:30px}</style><header class="customer-premium-topbar"><a href="/u/news"><span class="${badgeClass}">99+</span></a></header><header class="topbar"><a href="/u/news"><span class="badge">9</span></a><a href="/u/news" class="customer-notification-link"><span class="customer-notification-badge">10</span></a></header><div class="topbar"><span class="badge" id="unrelated">Other</span></div>`)
  for (const selector of [nativeBadge, '.topbar a > .badge', '.customer-notification-badge']) {
    assert.equal(await page.locator(selector).evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(197, 72, 99)')
    assert.equal(await page.locator(selector).evaluate(e => e.getBoundingClientRect().height), 20)
  }
  assert.notEqual(await page.locator('#unrelated').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(197, 72, 99)')
  await page.locator('.topbar a > .badge').evaluate(e => { e.textContent = '' })
  assert.equal(await page.locator('.topbar a > .badge').evaluate(e => getComputedStyle(e).display), 'none')
  await page.locator('.customer-notification-badge').evaluate(e => { e.hidden = true })
  assert.equal(await page.locator('.customer-notification-badge').evaluate(e => getComputedStyle(e).display), 'none')
  await page.screenshot({ path: path.join(out, 'no-javascript-critical-styles.png') })
  await context.close()
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2))
  console.log(JSON.stringify({ passed: true, countCases: 32, viewportWidths: [320, 390, 768, 1440], nativeNavigation: true, criticalStylesWithoutJs: true, dataWrites: false, results }))
} finally {
  await browser.close()
}
