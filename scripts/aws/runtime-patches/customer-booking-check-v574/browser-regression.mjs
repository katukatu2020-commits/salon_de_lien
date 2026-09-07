import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3150').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactRoot = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-booking-check-v574')
const knownHydrationNoise = /Minified React error #(329|418|423)/
fs.mkdirSync(artifactRoot, { recursive:true })

async function login(context) {
  const response = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form:{ loginId:'demo.hana', password:'Mypage2026!', next:'/u/appointments' },
  })
  assert.ok(response.ok(), `customer login failed with ${response.status()}`)
}

function watch(page, label, errors) {
  page.on('console', message => {
    if (message.type() === 'error' && !knownHydrationNoise.test(message.text())) errors.push(`${label}:console:${message.text()}`)
  })
  page.on('pageerror', error => {
    if (!knownHydrationNoise.test(String(error))) errors.push(`${label}:pageerror:${error}`)
  })
}

async function inspectIndicator(button) {
  return button.evaluate(element => {
    const mark = element.querySelector(':scope > .cx-slot-check-v508')
    const buttonRect = element.getBoundingClientRect()
    const markRect = mark?.getBoundingClientRect()
    const buttonStyle = getComputedStyle(element)
    const markStyle = mark ? getComputedStyle(mark) : null
    const otherChildren = [...element.children]
      .filter(child => child !== mark)
      .map(child => ({ display:getComputedStyle(child).display, visible:child.getBoundingClientRect().width > 0 }))
    return {
      html:element.outerHTML,
      height:buttonRect.height,
      buttonCenter:{ x:buttonRect.x + buttonRect.width / 2, y:buttonRect.y + buttonRect.height / 2 },
      markCenter:markRect ? { x:markRect.x + markRect.width / 2, y:markRect.y + markRect.height / 2 } : null,
      markPosition:markStyle?.position,
      markDisplay:markStyle?.display,
      markColor:markStyle?.color,
      buttonColor:buttonStyle.color,
      buttonTextFill:buttonStyle.webkitTextFillColor,
      fontSize:buttonStyle.fontSize,
      lineHeight:buttonStyle.lineHeight,
      backgroundColor:buttonStyle.backgroundColor,
      otherChildren,
    }
  })
}

function assertCentered(state, label) {
  assert.ok(state.markCenter, `${label}: check mark is missing`)
  assert.ok(Math.abs(state.buttonCenter.x - state.markCenter.x) <= 0.75, `${label}: horizontal center differs`)
  assert.ok(Math.abs(state.buttonCenter.y - state.markCenter.y) <= 0.75, `${label}: vertical center differs`)
  assert.equal(state.markPosition, 'absolute', `${label}: check is still participating in grid rows`)
  assert.equal(state.markDisplay, 'grid')
  assert.equal(state.markColor, 'rgb(255, 255, 255)')
  assert.equal(state.buttonColor, 'rgba(0, 0, 0, 0)', `${label}: original symbol can still be painted`)
  assert.equal(state.buttonTextFill, 'rgba(0, 0, 0, 0)', `${label}: Safari can still paint the original symbol`)
  assert.equal(state.fontSize, '0px')
  assert.equal(state.lineHeight, '0px')
  assert.equal(state.otherChildren.some(child => child.display !== 'none' && child.visible), false, `${label}: original icon remains visible`)
}

async function runViewport(browser, viewport, label, errors) {
  const context = await browser.newContext({ viewport })
  await login(context)
  const page = await context.newPage()
  watch(page, label, errors)
  await page.goto(`${baseUrl}/u/appointments?regression=v574-${label}`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.waitForFunction(() => (
    document.documentElement.dataset.orimiaUiReady === 'v516'
      && document.documentElement.dataset.customerExperience === 'v508'
  ), null, { timeout:15_000 })

  const candidate = page.locator('button[aria-label*="予約可能"]:not([disabled])').first()
  await candidate.waitFor({ state:'visible', timeout:15_000 })
  await candidate.scrollIntoViewIfNeeded()
  const initialHeight = (await candidate.boundingBox())?.height
  assert.ok(initialHeight)
  await candidate.click()

  const selected = page.locator('button.cx-slot-selected-v508, button.cx-slot-confirmed-v508').first()
  await selected.locator(':scope > .cx-slot-check-v508').waitFor({ state:'visible', timeout:10_000 })
  await selected.scrollIntoViewIfNeeded()
  const selectedState = await inspectIndicator(selected)
  assertCentered(selectedState, `${label} selected`)
  assert.ok(Math.abs(selectedState.height - initialHeight) <= 0.5, `${label}: selection changed the row height`)

  await selected.evaluate(button => {
    button.removeAttribute('aria-label')
    button.classList.remove('cx-slot-selected-v508')
    button.classList.add('cx-slot-confirmed-v508')
  })
  await page.waitForTimeout(250)
  const confirmedState = await inspectIndicator(selected)
  assertCentered(confirmedState, `${label} confirmed`)
  assert.equal(confirmedState.backgroundColor, 'rgb(63, 121, 82)', `${label}: confirmed cell is not green`)
  assert.ok(Math.abs(confirmedState.height - initialHeight) <= 0.5, `${label}: confirmation changed the row height`)

  await page.screenshot({ path:path.join(artifactRoot, `${label}.png`) })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${label}: page overflows horizontally`)
  await context.close()
  return { initialHeight, selectedState, confirmedState }
}

const browser = await chromium.launch({ executablePath, headless:true })
const errors = []
try {
  const desktop = await runViewport(browser, { width:1116, height:720 }, 'desktop', errors)
  const mobile = await runViewport(browser, { width:390, height:844 }, 'mobile', errors)
  for (const filename of ['desktop.png', 'mobile.png']) {
    assert.ok(fs.statSync(path.join(artifactRoot, filename)).size > 10_000, `${filename} appears blank`)
  }
  assert.deepEqual(errors, [], errors.join('\n'))
  console.log(JSON.stringify({
    release:'customer-booking-check-v574',
    browserVerified:true,
    desktopCentered:true,
    mobileCentered:true,
    rowHeightStable:true,
    originalSymbolHidden:true,
    heights:{ desktop:desktop.initialHeight, mobile:mobile.initialHeight },
    artifacts:artifactRoot,
  }))
} finally {
  await browser.close()
}
