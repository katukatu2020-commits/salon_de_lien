import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3120').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'orimia-v544')
fs.mkdirSync(screenshotRoot, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })

function screenshotPath(name) {
  return path.join(screenshotRoot, `customer-registration-single-loader-v544-${name}.png`)
}

async function loaderState(page) {
  return page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    const shell = document.querySelector('body > .admin-app-shell, body > .app')
    const loader = document.getElementById('orimia-ui-loader-v536')
    const mark = loader?.querySelector('.orimia-ui-loader-v536__mark')
    const brand = loader?.querySelector('.orimia-ui-loader-v536__brand')
    const bodyPseudo = getComputedStyle(body, '::after')
    const shellPseudo = shell ? getComputedStyle(shell, '::after') : null
    const markRect = mark?.getBoundingClientRect()
    const brandRect = brand?.getBoundingClientRect()
    const pseudoVisible = style => Boolean(style)
      && style.content !== 'none'
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number(style.opacity || 0) > 0
      && String(style.backgroundImage || '').includes('orimia-icon-192.png')
    const loaderMarkVisible = Boolean(mark)
      && getComputedStyle(mark).visibility !== 'hidden'
      && Number(getComputedStyle(mark).opacity || 0) > 0
    return {
      href: location.pathname + location.search,
      ready: root.dataset.orimiaUiReady || null,
      mode: root.dataset.orimiaUiTransition || null,
      bookingGate: root.hasAttribute('data-orimia-customer-booking-gate-v524'),
      loadingRuntime: root.dataset.orimiaLoadingExperience || null,
      loaderCount: document.querySelectorAll('#orimia-ui-loader-v536').length,
      loaderImageCount: loader?.querySelectorAll('img[src*="orimia-icon-192.png"]').length || 0,
      loaderVisibility: loader ? getComputedStyle(loader).visibility : null,
      bodyPseudoVisible: pseudoVisible(bodyPseudo),
      shellPseudoVisible: pseudoVisible(shellPseudo),
      visibleMarkCount: Number(loaderMarkVisible) + Number(pseudoVisible(bodyPseudo)) + Number(pseudoVisible(shellPseudo)),
      bodyPseudoContent: bodyPseudo.content,
      shellPseudoContent: shellPseudo?.content || null,
      markBottom: markRect?.bottom || 0,
      brandTop: brandRect?.top || 0,
      copy: loader?.querySelector('[data-orimia-loader-copy]')?.textContent?.trim() || null,
    }
  })
}

function assertSingleMark(state, label) {
  assert.equal(state.visibleMarkCount, 1, `${label}: expected one visible ORIMIA mark, found ${state.visibleMarkCount}`)
}

const results = {}

try {
  const coldContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
  const coldPage = await coldContext.newPage()
  await coldPage.route('**/*navigation-loading-v536-release1.js', async route => {
    await new Promise(resolve => setTimeout(resolve, 1800))
    await route.continue()
  })
  await coldPage.goto(`${baseUrl}/u/register?verify=v544-cold`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await coldPage.waitForFunction(() => (
    document.documentElement.hasAttribute('data-orimia-customer-booking-gate-v524')
      && [...document.styleSheets].some(sheet => String(sheet.href || '').includes('v=544-single-loader1'))
  ))
  const cold = await loaderState(coldPage)
  assert.equal(cold.bookingGate, true)
  assert.equal(cold.loadingRuntime, null)
  assert.equal(cold.bodyPseudoVisible, true, 'cold load: legacy first-paint mark is missing')
  assert.equal(cold.shellPseudoVisible, false, 'cold load: generic shell mark duplicates the legacy first-paint mark')
  assertSingleMark(cold, 'cold load')
  await coldPage.screenshot({ path: screenshotPath('cold-first-paint') })

  await coldPage.waitForFunction(() => window.__orimiaUiTransitionV536 === true, null, { timeout: 6000 })
  const enhancedCold = await loaderState(coldPage)
  assert.equal(enhancedCold.loadingRuntime, 'v536')
  assert.equal(enhancedCold.loaderCount, 1)
  assert.equal(enhancedCold.loaderImageCount, 1)
  assert.equal(enhancedCold.bodyPseudoVisible, false, 'cold load: legacy body mark remained behind enhanced loader')
  assert.equal(enhancedCold.shellPseudoVisible, false, 'cold load: shell fallback remained behind enhanced loader')
  assertSingleMark(enhancedCold, 'enhanced cold load')
  assert.ok(enhancedCold.brandTop > enhancedCold.markBottom, 'cold load: loader mark overlaps the ORIMIA wordmark')
  await coldPage.screenshot({ path: screenshotPath('cold-enhanced') })
  results.cold = { cold, enhanced: enhancedCold }
  await coldContext.close()

  const navigationContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  })
  const page = await navigationContext.newPage()
  await page.goto(`${baseUrl}/u/login?verify=v544`, { waitUntil: 'networkidle', timeout: 30_000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/u/register"]')
    if (!link) throw new Error('customer registration link was not found')
    window.__v544RegistrationLink = link
    window.__v544BlockedRegistration = event => {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    link.addEventListener('click', window.__v544BlockedRegistration, true)
  })

  await page.locator('a[href="/u/register"]').click({ noWaitAfter: true })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiTransition === 'navigation')
  await page.waitForTimeout(180)
  const navigating = await loaderState(page)
  assert.equal(navigating.loaderCount, 1)
  assert.equal(navigating.loaderImageCount, 1)
  assert.equal(navigating.loaderVisibility, 'visible')
  assert.equal(navigating.bodyPseudoVisible, false, 'registration navigation: legacy body mark remained visible')
  assert.equal(navigating.shellPseudoVisible, false, 'registration navigation: shell fallback remained visible')
  assertSingleMark(navigating, 'registration navigation')
  assert.ok(navigating.brandTop > navigating.markBottom, 'registration navigation: loader mark overlaps the ORIMIA wordmark')
  await page.screenshot({ path: screenshotPath('registration-navigation') })

  await page.evaluate(() => {
    window.__v544RegistrationLink.removeEventListener('click', window.__v544BlockedRegistration, true)
    delete window.__v544RegistrationLink
    delete window.__v544BlockedRegistration
  })
  await page.goto(`${baseUrl}/u/register?verify=v544-navigation`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await page.waitForURL(url => url.pathname === '/u/register' && url.searchParams.get('verify') === 'v544-navigation', { timeout: 10_000 })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516', null, { timeout: 10_000 })
  await page.locator('#orimia-ui-loader-v536').waitFor({ state: 'hidden', timeout: 2000 })
  const ready = await loaderState(page)
  assert.equal(ready.loaderVisibility, 'hidden')
  assert.equal(ready.bodyPseudoVisible, false)
  assert.equal(ready.shellPseudoVisible, false)
  await page.getByRole('heading', { name: 'お客様アプリ初回登録' }).waitFor({ state: 'visible' })
  await page.screenshot({ path: screenshotPath('registration-ready') })
  results.navigation = { navigating, ready }
  await navigationContext.close()

  console.log(JSON.stringify({
    release: 'customer-registration-single-loader-v544',
    browserVerified: true,
    results,
  }, null, 2))
} finally {
  await browser.close()
}
