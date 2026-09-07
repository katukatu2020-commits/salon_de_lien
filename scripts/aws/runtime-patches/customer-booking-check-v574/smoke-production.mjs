import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))

for (let attempt = 1; attempt <= 20; attempt += 1) {
  const response = await fetch(`${baseUrl}/api/health/ready?smoke=v574-${Date.now()}-${attempt}`, { cache:'no-store' })
  if (
    response.status === 200
      && response.headers.get('x-lien-customer-booking-check') === 'v574'
      && response.headers.get('x-lien-admin-home-visual') === 'v573'
      && response.headers.get('x-lien-customer-experience') === 'v508'
  ) break
  if (attempt === 20) assert.fail(`production readiness did not reach v574; last status ${response.status}`)
  await sleep(1500)
}

const cssResponse = await fetch(`${baseUrl}/customer-experience-v508.css?v=574-booking-check1`, { cache:'no-store' })
assert.equal(cssResponse.status, 200)
const css = await cssResponse.text()
assert.match(css, /customer-booking-check-v574/)
assert.match(css, /button\.cx-slot-confirmed-v508 > \.cx-slot-check-v508/)

const browser = await chromium.launch(executablePath ? { executablePath, headless:true } : { headless:true })
try {
  const context = await browser.newContext({ viewport:{ width:390, height:844 } })
  const login = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form:{ loginId:'demo.hana', password:'Mypage2026!', next:'/u/appointments' },
  })
  assert.ok(login.ok(), `customer login failed with ${login.status()}`)
  const page = await context.newPage()
  await page.goto(`${baseUrl}/u/appointments?smoke=v574`, { waitUntil:'domcontentloaded', timeout:30_000 })
  await page.waitForFunction(() => (
    document.documentElement.dataset.orimiaUiReady === 'v516'
      && document.documentElement.dataset.customerExperience === 'v508'
  ), null, { timeout:15_000 })
  const candidate = page.locator('button[aria-label*="予約可能"]:not([disabled])').first()
  await candidate.waitFor({ state:'visible', timeout:15_000 })
  await candidate.click()
  const selected = page.locator('button.cx-slot-selected-v508, button.cx-slot-confirmed-v508').first()
  const mark = selected.locator(':scope > .cx-slot-check-v508')
  await mark.waitFor({ state:'visible', timeout:10_000 })
  const centered = await selected.evaluate(button => {
    const indicator = button.querySelector(':scope > .cx-slot-check-v508')
    const outer = button.getBoundingClientRect()
    const inner = indicator.getBoundingClientRect()
    const indicatorStyle = getComputedStyle(indicator)
    return {
      deltaX:Math.abs((outer.x + outer.width / 2) - (inner.x + inner.width / 2)),
      deltaY:Math.abs((outer.y + outer.height / 2) - (inner.y + inner.height / 2)),
      position:indicatorStyle.position,
      originalColor:getComputedStyle(button).color,
      originalTextFill:getComputedStyle(button).webkitTextFillColor,
      extraVisible:[...button.children].filter(child => child !== indicator && getComputedStyle(child).display !== 'none').length,
    }
  })
  assert.ok(centered.deltaX <= 0.75)
  assert.ok(centered.deltaY <= 0.75)
  assert.equal(centered.position, 'absolute')
  assert.equal(centered.originalColor, 'rgba(0, 0, 0, 0)')
  assert.equal(centered.originalTextFill, 'rgba(0, 0, 0, 0)')
  assert.equal(centered.extraVisible, 0)
  await selected.evaluate(button => {
    button.removeAttribute('aria-label')
    button.classList.remove('cx-slot-selected-v508')
    button.classList.add('cx-slot-confirmed-v508')
  })
  await page.waitForTimeout(250)
  const confirmed = await selected.evaluate(button => {
    const indicator = button.querySelector(':scope > .cx-slot-check-v508')
    const outer = button.getBoundingClientRect()
    const inner = indicator.getBoundingClientRect()
    return {
      deltaX:Math.abs((outer.x + outer.width / 2) - (inner.x + inner.width / 2)),
      deltaY:Math.abs((outer.y + outer.height / 2) - (inner.y + inner.height / 2)),
      background:getComputedStyle(button).backgroundColor,
    }
  })
  assert.ok(confirmed.deltaX <= 0.75)
  assert.ok(confirmed.deltaY <= 0.75)
  assert.equal(confirmed.background, 'rgb(63, 121, 82)')
  await context.close()
} finally {
  await browser.close()
}

console.log(JSON.stringify({
  release:'customer-booking-check-v574',
  production:true,
  customerBooking:true,
  checkCentered:true,
  originalSymbolHidden:true,
  readOnly:true,
}))
