import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE || import.meta.url)
const { chromium } = require('playwright-core')
const base = String(process.env.SMOKE_BASE_URL || 'http://localhost:3604').replace(/\/$/, '')
const output = process.env.SCREENSHOT_DIR || 'artifacts/customer-mypage-navigation-v604/browser'
const executablePath = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(output, { recursive:true })

const expectedLinks = [
  ['/u/history', 'history'],
  ['/u/reviews', 'reviews'],
  ['/u/catalog?category=favorites', 'favorites'],
  ['#details', 'details'],
  ['/u/stores', 'stores'],
  ['/u/sms-settings', 'notifications'],
]

const browser = await chromium.launch({ executablePath, headless:true })
const results = []

function collectErrors(page) {
  const errors = []
  page.on('pageerror', error => errors.push(`page: ${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  return errors
}

function unexpected(errors) {
  return errors.filter(message => (
    !message.includes('Minified React error #418')
    && !message.includes('Minified React error #423')
    && !message.includes('Minified React error #329')
    && !message.includes('Failed to load resource: the server responded with a status of 404')
  ))
}

async function login(context) {
  const response = await context.request.post(`${base}/api/customer-auth/login`, {
    headers:{ Origin:base },
    form:{ loginId:'demo.hana', password:'Mypage2026!', next:'/u/profile' },
  })
  assert.ok(response.ok(), `Customer login returned ${response.status()}`)
}

async function openProfile(width) {
  const context = await browser.newContext({ viewport:{ width, height:900 }, deviceScaleFactor:1 })
  await login(context)
  const page = await context.newPage()
  const errors = collectErrors(page)
  await page.goto(`${base}/u/profile?verify=v604-${width}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.locator('.cj-account-links').waitFor({ state:'visible', timeout:20_000 })
  await page.waitForTimeout(350)
  return { context, page, errors }
}

async function verifyStructure(width) {
  const { context, page, errors } = await openProfile(width)
  const links = page.locator('.cj-account-links>a')
  assert.deepEqual(await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), expectedLinks.map(([href]) => href))
  assert.equal(new Set(expectedLinks.map(([href]) => href)).size, expectedLinks.length)
  assert.equal(await page.locator('main.cj-main').getAttribute('data-cj-edit'), null)
  assert.equal(await page.locator('main.cj-main').getAttribute('data-cj-profile-edit'), 'false')
  assert.equal(await page.locator('[data-cj-profile-edit-action]').count(), 2)
  assert.deepEqual(
    await links.evaluateAll(nodes => nodes.map(node => Boolean(node.closest('[data-cj-profile-edit-action]')))),
    [false, false, false, true, false, false],
  )
  assert.equal(await page.locator('.cj-account-links form[action="/api/customer-auth/logout"][method="post"]').count(), 1)

  const measurements = await page.evaluate(() => ({
    scrollWidth:document.documentElement.scrollWidth,
    viewportWidth:innerWidth,
    rows:[...document.querySelectorAll('.cj-account-links>a')].map(node => {
      const rect = node.getBoundingClientRect()
      const target = document.elementFromPoint(rect.left + Math.min(24, rect.width / 2), rect.top + rect.height / 2)
      return target?.closest('a')?.getAttribute('href') || null
    }),
  }))
  assert.ok(measurements.scrollWidth <= measurements.viewportWidth + 1, `${width}: horizontal overflow`)
  assert.deepEqual(measurements.rows, expectedLinks.map(([href]) => href), `${width}: row hit targets overlap`)
  await page.screenshot({ path:path.join(output, `mypage-${width}.png`), fullPage:true })
  assert.deepEqual(unexpected(errors), [], `${width}: browser errors`)
  results.push({ width, uniqueLinks:true, isolatedEditTarget:true, noOverlap:true, noOverflow:true })
  await context.close()
}

async function verifyDestination(href, name) {
  const { context, page, errors } = await openProfile(390)
  const link = page.locator(`.cj-account-links>a[href="${href}"]`)
  if (href === '#details') {
    await link.click()
    await page.waitForFunction(() => location.hash === '#details')
    await page.locator('form[action="/api/customer/profile"]').waitFor({ state:'visible' })
    assert.equal(await page.locator('main.cj-main').getAttribute('data-cj-profile-edit'), 'true')
  } else {
    const target = new URL(href, base)
    await link.click()
    await page.waitForURL(url => url.pathname === target.pathname && url.search === target.search, { timeout:20_000 })
    assert.notEqual(new URL(page.url()).pathname, '/u/profile')
  }
  assert.deepEqual(unexpected(errors), [], `${name}: browser errors`)
  results.push({ destination:name, href, reached:true })
  await context.close()
}

async function verifyBookingAndLogout() {
  {
    const { context, page, errors } = await openProfile(390)
    const booking = page.locator('.cj-next-appointment a[href^="/u/appointments"]')
    await booking.waitFor({ state:'visible' })
    await booking.click()
    await page.waitForURL(url => url.pathname === '/u/appointments', { timeout:20_000 })
    assert.deepEqual(unexpected(errors), [], 'booking: browser errors')
    results.push({ destination:'booking', reached:true })
    await context.close()
  }
  {
    const { context, page, errors } = await openProfile(390)
    await page.locator('.cj-account-links form[action="/api/customer-auth/logout"] button[type="submit"]').click()
    await page.waitForURL(url => url.pathname !== '/u/profile', { timeout:20_000 })
    const summary = await context.request.get(`${base}/api/customer/mypage-summary`, { headers:{ 'Cache-Control':'no-cache' } })
    assert.equal(summary.status(), 401)
    assert.deepEqual(unexpected(errors), [], 'logout: browser errors')
    results.push({ destination:'logout', postSubmitted:true, sessionClosed:true })
    await context.close()
  }
}

try {
  for (const width of [320, 390, 1280]) await verifyStructure(width)
  for (const [href, name] of expectedLinks) await verifyDestination(href, name)
  await verifyBookingAndLogout()
  console.log(JSON.stringify({ passed:true, results }))
} finally {
  await browser.close()
}
