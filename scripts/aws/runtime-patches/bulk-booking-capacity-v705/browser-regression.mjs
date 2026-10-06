import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(process.env.BROWSER_PACKAGE_JSON || path.resolve('package.json'))
const { chromium } = require('playwright-core')
const base = 'http://127.0.0.1:3188', route = '/api/lien-business-days', output = 'artifacts/bulk-booking-capacity-v705'
execFileSync('docker', ['cp', 'scripts/aws/runtime-patches/bulk-booking-capacity-v705/qa-fixture.cjs', 'orimia-qa-v680-app:/tmp/qa705.cjs'])
const fixture = action => execFileSync('docker', ['exec', 'orimia-qa-v680-app', 'node', '/tmp/qa705.cjs', action], { encoding: 'utf8' })
fixture('guard'); fixture('prepare')
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), customer = await browser.newContext()
fs.mkdirSync(output, { recursive: true })
const get = async () => (await (await context.request.get(base + route + '?month=2026-11')).json()).days
const body = { action: 'set-capacity', from: '2026-11-03', to: '2026-11-09', weekdays: [0,1,2,3,4,5,6], capacity: 4 }
const save = async (data, status = 200) => {
  const response = await context.request.post(base + route, { headers: { Origin: base }, data })
  assert.equal(response.status(), status, await response.text())
  return response.json()
}
try {
  assert.equal((await customer.request.post(base + route, { headers: { Origin: base }, data: body })).status(), 401)
  assert.equal((await context.request.post(base + '/api/auth/login', { form: { email: 'demo.owner', password: 'QaLocalOnly-v680!', next: '/admin/appointments' } })).status(), 200)
  assert.equal((await customer.request.post(base + '/api/customer-auth/login', { form: { loginId: 'demo.hana', password: 'QaLocalOnly-v680!', next: '/u/appointments' } })).status(), 200)
  assert.equal((await context.request.post(base + route, { headers: { Origin: 'https://invalid.test' }, data: body })).status(), 403)
  const original = await get(), page = await context.newPage(), errors = []
  page.setDefaultTimeout(10000); page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/admin/appointments?businessDays=1&month=2026-11')
  const form = page.locator('[data-bulk-capacity-v705]')
  await form.locator('[name="from"]').fill(body.from); await form.locator('[name="to"]').fill(body.to)
  await form.locator('[name="capacity"]').fill('4')
  await form.getByRole('button').click()
  await form.getByText(/7日分の受付可能数を4に保存しました/).waitFor()
  let days = await get()
  for (const day of days) {
    const before = original.find(row => row.date === day.date)
    assert.equal(day.isClosed, before.isClosed); assert.equal(day.openMinutes, before.openMinutes); assert.equal(day.closeMinutes, before.closeMinutes)
    assert.equal(day.capacity, day.date >= body.from && day.date <= body.to ? 4 : before.capacity)
  }
  const filtered = await save({ ...body, weekdays: [2,4], capacity: 3 })
  assert.deepEqual(filtered.dates, ['2026-11-03','2026-11-05'])
  days = await get()
  assert.equal(days.find(d => d.date === '2026-11-04').capacity, 4)
  await save({ ...body, capacity: 4 })
  fixture('seed')
  await save({ ...body, capacity: 2 }, 409)
  assert.ok((await get()).filter(d => d.date >= body.from && d.date <= body.to).every(d => d.capacity === 4), 'Conflict must not partially save any day')
  for (const invalid of [{ capacity: 0 }, { capacity: 100 }, { from: '2026-02-30' }, { weekdays: [] }]) await save({ ...body, ...invalid }, 400)
  const slots = async () => {
    const response = await customer.request.get(base + '/api/customer/appointments/availability?month=2026-11&staff=free&menu=showcase-yohaku-menu-001')
    assert.equal(response.status(), 200)
    return (await response.json()).days.find(d => d.date === '2026-11-05').slots
  }
  assert.ok((await slots()).includes(750), 'Free slot available at capacity four')
  await save({ ...body, capacity: 3 })
  assert.ok(!(await slots()).includes(750), 'Customer slot blocked at capacity three')
  const booking = await customer.request.post(base + '/api/customer/appointments', { headers: { Origin: base }, data: { date: '2026-11-05', staffKey: 'free', menuKey: 'showcase-yohaku-menu-001', startMinutes: 750 } })
  assert.ok(booking.status() >= 400, 'Submit must reject fully booked capacity')
  await page.goto(base + '/admin/appointments?date=2026-11-05&month=2026-11')
  await page.locator('.shift-canvas').waitFor()
  await page.waitForFunction(() => document.querySelector('input[aria-label="12:30 残り受付数"]')?.value === '0')
  assert.equal(await page.locator('input[aria-label="10:00 残り受付数"]').inputValue(), '3')
  assert.match(await page.locator('input[aria-label="12:30 残り受付数"]').getAttribute('title'), /\/ 3件/)
  await page.screenshot({ path: output + '/shift-linked.png', fullPage: true })
  await page.goto(base + '/admin/appointments?businessDays=1&month=2026-11')
  await form.waitFor()
  const dayCapacity = page.locator('.ts-day-card[data-date="2026-11-03"] [name="capacity"]')
  await dayCapacity.fill('6'); await dayCapacity.press('Tab')
  await form.getByRole('button').click()
  await form.getByText(/未保存の変更があります/).waitFor()
  assert.equal(await dayCapacity.inputValue(), '6')
  const crossing = await save({ ...body, from: '2026-10-31', to: '2026-11-01', capacity: 3 })
  assert.deepEqual(crossing.dates, ['2026-10-31', '2026-11-01'])
  const october = await (await context.request.get(base + route + '?month=2026-10')).json()
  assert.equal(october.days.find(day => day.date === '2026-10-31').capacity, 3)
  assert.equal((await get()).find(day => day.date === '2026-11-01').capacity, 3)
  await page.reload(); await form.waitFor()
  await page.locator('.ts-bulk-capacity-v705').scrollIntoViewIfNeeded()
  await page.screenshot({ path: output + '/desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('.ts-bulk-capacity-v705').scrollIntoViewIfNeeded()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await page.screenshot({ path: output + '/mobile.png' })
  await form.locator('[name="from"]').fill(body.from); await form.locator('[name="to"]').fill(body.to)
  await form.locator('[name="capacity"]').fill('4'); await form.getByRole('button').click()
  await form.getByText(/7日分の受付可能数を4に保存しました/).waitFor()
  assert.deepEqual(errors, [])
  console.log('PASS v705 browser/API: bulk save, weekdays, hours/holiday preservation, atomic conflict rejection, validation, origin/auth, customer availability/submit, dirty protection and desktop/mobile')
} finally {
  fixture('restore')
  await browser.close()
}
