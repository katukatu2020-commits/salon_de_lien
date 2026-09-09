import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3607').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-booking-menu-clearance-v607/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive:true })

const health = await fetch(`${base}/api/health/ready`, { headers:{ 'Cache-Control':'no-cache' } })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-customer-booking-menu-clearance'), 'v607')
assert.equal(health.headers.get('x-lien-customer-style-first-paint'), 'v606')

const browser = await chromium.launch({ executablePath, headless:true })
const results = []

try {
  for (const viewport of [
    { width:320, height:568 },
    { width:390, height:844 },
    { width:430, height:740 },
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor:1 })
    const login = await context.request.post(`${base}/api/customer-auth/login`, {
      headers:{ Origin:base },
      form:{ loginId:'demo.hana', password:'Mypage2026!', next:'/u/appointments' },
    })
    assert.ok(login.ok(), `Customer login returned ${login.status()}`)

    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(`page: ${error.message}`))
    page.on('console', message => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`)
    })

    await page.goto(`${base}/u/appointments?verify=v607-${viewport.width}`, { waitUntil:'domcontentloaded' })
    const rows = page.locator('.cj-menu-row')
    await rows.first().waitFor({ timeout:20000 })
    assert.ok(await rows.count() >= 2, 'The booking menu needs multiple rows for the clearance check')
    assert.equal(await page.locator('link[href="/customer-journey-v601.css?v=607-booking-clearance1"]').count(), 1)

    await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight))
    await page.waitForTimeout(250)

    const geometry = await page.evaluate(() => {
      const lastRow = document.querySelector('.cj-menu-row:last-child')
      const footer = document.querySelector('.cj-booking-footer')
      const navigation = document.querySelector('#customer-mobile-bottom-nav,.bottom-nav,[data-customer-bottom-nav]')
      const main = document.querySelector('main.cj-main')
      const box = element => {
        const value = element?.getBoundingClientRect()
        return value && { top:value.top, bottom:value.bottom, height:value.height }
      }
      return {
        lastRow:box(lastRow),
        footer:box(footer),
        navigation:box(navigation),
        mainPaddingBottom:Number.parseFloat(getComputedStyle(main).paddingBottom),
        scrollTop:document.scrollingElement.scrollTop,
        maxScroll:document.scrollingElement.scrollHeight - innerHeight,
        overflow:document.documentElement.scrollWidth - innerWidth,
      }
    })

    assert.ok(geometry.lastRow && geometry.footer && geometry.navigation)
    assert.ok(geometry.footer.bottom <= geometry.navigation.top + 1, 'Booking action must stay above bottom navigation')
    assert.ok(geometry.lastRow.bottom <= geometry.footer.top - 20, 'Last menu must scroll fully above the booking action')
    assert.ok(
      geometry.mainPaddingBottom >= geometry.footer.height + geometry.navigation.height + 20,
      'Main content must reserve the fixed action and navigation height',
    )
    assert.ok(geometry.scrollTop >= geometry.maxScroll - 1, 'The clearance check must run at the document end')
    assert.ok(geometry.overflow <= 1, 'Booking page must not overflow horizontally')
    await page.screenshot({
      path:path.join(output, `menu-clearance-${viewport.width}.png`),
      fullPage:false,
    })

    const lastRadio = rows.last().locator('input[type="radio"]')
    await lastRadio.check()
    assert.equal(await lastRadio.isChecked(), true, 'The final menu remains selectable')
    assert.equal(await page.locator('.cj-booking-footer .cj-primary').isEnabled(), true)
    await page.evaluate(() => window.scrollTo(0, document.scrollingElement.scrollHeight))
    await page.waitForTimeout(150)
    const selectedClearance = await page.evaluate(() => {
      const row = document.querySelector('.cj-menu-row:last-child')?.getBoundingClientRect()
      const footer = document.querySelector('.cj-booking-footer')?.getBoundingClientRect()
      return row && footer ? footer.top - row.bottom : -1
    })
    assert.ok(selectedClearance >= 20, 'Selecting the final menu must retain the bottom clearance')
    await page.screenshot({
      path:path.join(output, `menu-clearance-selected-${viewport.width}.png`),
      fullPage:false,
    })
    await page.locator('.cj-booking-footer .cj-primary').click()
    await page.locator('main.cj-main[data-cj-step="2"] .cj-staff-list button').first().waitFor({ timeout:10000 })

    const unexpected = errors.filter(message => (
      !message.includes('Minified React error #418')
      && !message.includes('Minified React error #423')
      && !message.includes('Minified React error #329')
      && !message.includes('Failed to load resource: the server responded with a status of 404')
    ))
    assert.deepEqual(unexpected, [])
    results.push({
      ...viewport,
      menuCount:await rows.count(),
      clearance:Math.round((geometry.footer.top - geometry.lastRow.bottom) * 10) / 10,
      selectedClearance:Math.round(selectedClearance * 10) / 10,
      mainPaddingBottom:geometry.mainPaddingBottom,
      finalMenuSelectable:true,
      staffStepReached:true,
      bottomNavigationClear:true,
    })
    await context.close()
  }

  console.log(JSON.stringify({ passed:true, results }))
} finally {
  await browser.close()
}
