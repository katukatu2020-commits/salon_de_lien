import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3129').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-booking-transition-v524')
fs.mkdirSync(screenshotDir, { recursive: true })

const browser = await chromium.launch({ executablePath, headless: true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/home' },
  })
  assert.equal(response.ok(), true, `customer login returned ${response.status()}`)
}

async function installSampler(context) {
  await context.addInitScript(() => {
    window.__orimiaBookingTransitionV524Samples = []
    const findMenuSelect = () => [...document.querySelectorAll('select')].find(select => (
      [...select.options].some(option => /\d+\s*分/.test(option.textContent || ''))
    )) || document.querySelector('select[name="menu"]')
    const visible = element => {
      if (!element) return false
      if (typeof element.checkVisibility === 'function') {
        if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false
      }
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      if (style.clipPath === 'inset(50%)' || (rect.width <= 1 && rect.height <= 1)) return false
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0
        && rect.width > 0 && rect.height > 0
    }
    const sample = () => {
      if (location.pathname === '/u/appointments') {
        const select = findMenuSelect()
        if (select) {
          const topLevel = [...document.body.children].find(child => child.contains(select))
          const bodyAfter = getComputedStyle(document.body, '::after')
          window.__orimiaBookingTransitionV524Samples.push({
            at: Math.round(performance.now()),
            ready: document.documentElement.dataset.orimiaUiReady || '',
            gate: document.documentElement.hasAttribute('data-orimia-customer-booking-gate-v524'),
            nativeVisible: visible(select),
            pickerVisible: visible(document.querySelector('.cx-menu-picker-v508')),
            topVisibility: topLevel ? getComputedStyle(topLevel).visibility : '',
            topOpacity: topLevel ? getComputedStyle(topLevel).opacity : '',
            loaderImage: bodyAfter.backgroundImage,
          })
        }
      }
      window.requestAnimationFrame(sample)
    }
    window.requestAnimationFrame(sample)
  })
}

async function waitForCorrectBooking(page) {
  await page.waitForFunction(() => (
    document.documentElement.dataset.orimiaUiReady === 'v516'
      && document.querySelector('.cx-menu-picker-v508')?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
      && document.querySelector('.cx-menu-picker-v508')?.textContent?.includes('選択中のメニュー')
  ), null, { timeout: 12000 })
}

async function assertInterimIsGated(page, label) {
  try {
    await page.waitForFunction(() => {
      const select = [...document.querySelectorAll('select')].find(element => (
        [...element.options].some(option => /\d+\s*分/.test(option.textContent || ''))
      )) || document.querySelector('select[name="menu"]')
      return Boolean(select)
        && document.documentElement.hasAttribute('data-orimia-customer-booking-gate-v524')
        && document.documentElement.dataset.orimiaUiReady !== 'v516'
    }, null, { timeout: 7000 })
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      url: location.href,
      ready: document.documentElement.dataset.orimiaUiReady || '',
      gate: document.documentElement.hasAttribute('data-orimia-customer-booking-gate-v524'),
      picker: Boolean(document.querySelector('.cx-menu-picker-v508')),
      selects: [...document.querySelectorAll('select')].map(select => ({
        name: select.name,
        className: select.className,
        firstOption: select.options[0]?.textContent || '',
      })),
      samples: window.__orimiaBookingTransitionV524Samples || [],
    }))
    throw new Error(`${label}: interim state was not reached: ${JSON.stringify(diagnostic)}`, { cause: error })
  }

  const state = await page.evaluate(() => {
    const select = [...document.querySelectorAll('select')].find(element => (
      [...element.options].some(option => /\d+\s*分/.test(option.textContent || ''))
    )) || document.querySelector('select[name="menu"]')
    const topLevel = [...document.body.children].find(child => child.contains(select))
    return {
      nativeVisible: select.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
      topVisibility: getComputedStyle(topLevel).visibility,
      topOpacity: getComputedStyle(topLevel).opacity,
      loaderImage: getComputedStyle(document.body, '::after').backgroundImage,
      gate: document.documentElement.hasAttribute('data-orimia-customer-booking-gate-v524'),
      ready: document.documentElement.dataset.orimiaUiReady || '',
    }
  })
  assert.equal(state.gate, true, `${label}: booking gate is missing`)
  assert.notEqual(state.ready, 'v516', `${label}: interim assertion ran after reveal`)
  assert.equal(state.nativeVisible, false, `${label}: native menu selector was exposed`)
  assert.equal(state.topVisibility, 'hidden', `${label}: interim application was not hidden`)
  assert.equal(state.topOpacity, '0', `${label}: interim application remained opaque`)
  assert.match(state.loaderImage, /orimia-icon-192\.png/, `${label}: ORIMIA loading treatment is missing`)
  return state
}

async function assertFinalState(page, label) {
  await waitForCorrectBooking(page)
  const state = await page.evaluate(() => {
    const nativeField = document.querySelector('.cx-menu-native-field-v508')
    return {
      ready: document.documentElement.dataset.orimiaUiReady,
      gate: document.documentElement.hasAttribute('data-orimia-customer-booking-gate-v524'),
      pickerVisible: document.querySelector('.cx-menu-picker-v508')?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ?? false,
      nativeVisible: nativeField ? (() => {
        const select = nativeField.querySelector('select')
        if (!select) return false
        const style = getComputedStyle(select)
        const rect = select.getBoundingClientRect()
        return select.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          && style.clipPath !== 'inset(50%)' && (rect.width > 1 || rect.height > 1)
      })() : false,
      selectedCopy: document.querySelector('.cx-menu-picker-v508')?.textContent || '',
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      samples: window.__orimiaBookingTransitionV524Samples || [],
    }
  })
  assert.equal(state.ready, 'v516', `${label}: final runtime did not become ready`)
  assert.equal(state.gate, true, `${label}: booking route marker disappeared`)
  assert.equal(state.pickerVisible, true, `${label}: enhanced menu picker is hidden`)
  assert.equal(state.nativeVisible, false, `${label}: native menu selector remains visible after enhancement`)
  assert.match(state.selectedCopy, /選択中のメニュー/, `${label}: enhanced selection summary is missing`)
  assert.ok(state.overflow <= 1, `${label}: mobile page overflows by ${state.overflow}px`)

  const interimSamples = state.samples.filter(sample => sample.ready !== 'v516')
  assert.ok(interimSamples.length > 0, `${label}: no interim booking state was sampled`)
  assert.equal(interimSamples.some(sample => sample.nativeVisible), false, `${label}: sampled a visible native selector`)
  assert.equal(interimSamples.every(sample => sample.gate), true, `${label}: sampled an ungated interim state`)
  return { ...state, samples: state.samples.length, interimSamples: interimSamples.length }
}

try {
  const navigationContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await installSampler(navigationContext)
  await login(navigationContext)
  const navigationPage = await navigationContext.newPage()
  await navigationPage.goto(`${baseUrl}/u/home?regression=v524-navigation`, { waitUntil: 'domcontentloaded' })
  await navigationPage.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')
  await navigationPage.locator('a[href="/u/appointments"]').first().click({ noWaitAfter: true })
  await navigationPage.waitForURL(url => url.pathname === '/u/appointments')
  const navigationInterim = await assertInterimIsGated(navigationPage, 'customer navigation')
  await navigationPage.screenshot({ path: path.join(screenshotDir, 'navigation-loading-mobile.png'), fullPage: false })
  const navigationFinal = await assertFinalState(navigationPage, 'customer navigation')
  await navigationPage.screenshot({ path: path.join(screenshotDir, 'navigation-ready-mobile.png'), fullPage: false })

  await navigationPage.locator('a[href="/u/home"]:visible').last().click({ noWaitAfter: true })
  await navigationPage.waitForURL(url => url.pathname === '/u/home')
  await navigationPage.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')
  await navigationPage.evaluate(() => history.back())
  await navigationPage.waitForURL(url => url.pathname === '/u/appointments')
  const historyInterim = await assertInterimIsGated(navigationPage, 'customer browser back')
  const historyFinal = await assertFinalState(navigationPage, 'customer browser back')
  await navigationContext.close()

  const coldContext = await browser.newContext({ viewport: { width: 430, height: 932 } })
  await installSampler(coldContext)
  await login(coldContext)
  const coldPage = await coldContext.newPage()
  await coldPage.route('**/customer-experience-v508.js*', async route => {
    await new Promise(resolve => setTimeout(resolve, 1300))
    await route.continue()
  })
  await coldPage.goto(`${baseUrl}/u/appointments?regression=v524-cold`, { waitUntil: 'domcontentloaded' })
  const coldInterim = await assertInterimIsGated(coldPage, 'cold booking load')
  await coldPage.screenshot({ path: path.join(screenshotDir, 'cold-loading-mobile.png'), fullPage: false })
  const coldFinal = await assertFinalState(coldPage, 'cold booking load')
  await coldPage.screenshot({ path: path.join(screenshotDir, 'cold-ready-mobile.png'), fullPage: false })
  await coldContext.close()

  console.log(JSON.stringify({
    baseUrl,
    release: 'customer-booking-transition-v524',
    browserVerified: true,
    navigation: { interim: navigationInterim, final: navigationFinal },
    history: { interim: historyInterim, final: historyFinal },
    cold: { interim: coldInterim, final: coldFinal },
  }))
} finally {
  await browser.close()
}
