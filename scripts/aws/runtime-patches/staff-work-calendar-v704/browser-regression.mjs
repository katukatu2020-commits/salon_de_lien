import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(process.env.BROWSER_PACKAGE_JSON || path.resolve('package.json'))
const { chromium } = require('playwright-core')
const base = 'http://127.0.0.1:3188', route = '/api/admin/staff-work-calendar'
execFileSync('docker', ['cp', 'scripts/aws/runtime-patches/staff-work-calendar-v704/qa-fixture.cjs', 'orimia-qa-v680-app:/tmp/qa704.cjs'])
const fixture = (...args) => execFileSync('docker', ['exec', 'orimia-qa-v680-app', 'node', '/tmp/qa704.cjs', ...args], { encoding: 'utf8' })
fixture('guard')
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const customer = await browser.newContext()
const output = 'artifacts/staff-work-calendar-v704'; fs.mkdirSync(output, { recursive: true })
let date, month, original, plan, modified = false
const get = async () => (await (await context.request.get(base + route + (month ? '?month=' + month : ''))).json())
const day = async () => (await get()).days.find(d => d.date === date)
const save = async (staff, status = 200, revision) => {
  const current = await day()
  const response = await context.request.post(base + route, { headers: { Origin: base }, data: { date, revision: revision ?? current.revision, staff } })
  assert.equal(response.status(), status, await response.text())
  return response
}
try {
  assert.equal((await context.request.post(base + '/api/auth/login', { form: { email: 'demo.owner', password: 'QaLocalOnly-v680!', next: '/admin/appointments' } })).status(), 200)
  assert.equal((await customer.request.post(base + '/api/customer-auth/login', { form: { loginId: 'demo.hana', password: 'QaLocalOnly-v680!', next: '/u/appointments' } })).status(), 200)
  plan = await get()
  const future = new Date(plan.today + 'T00:00:00Z'); future.setUTCDate(future.getUTCDate() + 14)
  const busy = JSON.parse(fixture('busy'))
  for (let i = 0; i < 60 && (future.getUTCDay() === 1 || busy.includes(future.toISOString().slice(0, 10))); i++) future.setUTCDate(future.getUTCDate() + 1)
  date = future.toISOString().slice(0, 10); month = date.slice(0, 7)
  original = await day()
  assert.ok(original.staff.every(row => row.mode === 'default'), 'Use an unconfigured QA date only')
  const member = original.staff[0], key = member.staffKey
  const availability = async (staffKey = key) => {
    const response = await customer.request.get(base + '/api/customer/appointments/availability?month=' + month + '&staff=' + staffKey + '&menu=showcase-yohaku-menu-001')
    assert.equal(response.status(), 200, await response.text())
    return (await response.json()).days.find(d => d.date === date).slots
  }
  assert.ok((await availability()).length > 0)
  const page = await context.newPage(); page.setDefaultTimeout(10000)
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/admin/account?panel=attendance&view=policy&workMonth=' + month)
  await page.getByText('勤務予定カレンダー', { exact: true }).waitFor()
  await page.screenshot({ path: output + '/desktop-calendar.png', fullPage: true })
  await page.getByRole('link', { name: new RegExp(date + ' 出勤') }).click()
  const row = page.locator('[data-work-staff="' + key + '"]')
  await row.locator('select').selectOption('work')
  await row.locator('[data-work-start]').fill('11:00'); await row.locator('[data-work-end]').fill('14:00')
  modified = true
  await page.getByRole('button', { name: '勤務予定を保存', exact: true }).click()
  await page.getByText('保存しました。', { exact: true }).waitFor()
  const limited = await availability()
  assert.ok(limited.length > 0 && limited.every(minute => minute >= 660 && minute <= 780), JSON.stringify(limited))
  const breaks = await (await context.request.get(base + '/api/admin/staff-breaks?date=' + date)).json()
  assert.equal(breaks.staff.find(s => s.staffKey === key).workStartMinutes, 660)
  const rejected = await customer.request.post(base + '/api/customer/appointments', { headers: { Origin: base }, data: { date, staffKey: key, menuKey: 'showcase-yohaku-menu-001', startMinutes: 600 } })
  assert.ok(rejected.status() >= 400, 'Booking submission must reject outside working hours')
  const responsePage = await context.request.get(base + '/admin/appointments?date=' + date + '&month=' + month)
  assert.equal(responsePage.status(), 200)
  assert.match(await responsePage.text(), /workStartMinutes[^\d]{0,12}660/)
  const stale = original.revision
  await save([{ staffKey: key, mode: 'off', startMinutes: 660, endMinutes: 840 }], 409, stale)
  fixture('seed', date, member.staffName)
  await save([{ staffKey: key, mode: 'off', startMinutes: 660, endMinutes: 840 }], 409)
  fixture('cleanup')
  await save([{ staffKey: key, mode: 'off', startMinutes: 660, endMinutes: 840 }])
  assert.deepEqual(await availability(), [])
  await save(original.staff.map(s => ({ staffKey: s.staffKey, mode: 'off', startMinutes: 600, endMinutes: 1140 })))
  assert.deepEqual(await availability('free'), [])
  await save([{ staffKey: 'foreign-org-staff', mode: 'default' }], 400)
  await page.reload(); await page.locator('[data-work-form-v704]').waitFor()
  await page.screenshot({ path: output + '/desktop-day.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await page.screenshot({ path: output + '/mobile-day.png', fullPage: true })
  await page.getByRole('link', { name: 'カレンダーへ戻る', exact: true }).click()
  await page.getByText('勤務予定カレンダー', { exact: true }).waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await page.screenshot({ path: output + '/mobile-calendar.png', fullPage: true })
  await page.goto(base + '/admin/account?panel=attendance&view=policy&workMonth=' + plan.maximumDate.slice(0, 7))
  await page.getByText('勤務予定カレンダー', { exact: true }).waitFor()
  assert.equal(await page.getByRole('link', { name: '次の月', exact: true }).count(), 0)
  await save(original.staff.map(s => ({ staffKey: s.staffKey, mode: 'default' })))
  modified = false
  assert.ok((await availability()).length > 0, 'Reset restores standard availability')
  assert.deepEqual(errors, [])
  console.log('PASS v704 browser/API: calendar/day editor, save/reset, selected/free customer availability, booking rejection, conflicts, stale update, tenant validation, shift props, break bounds and desktop/mobile')
} finally {
  fixture('cleanup')
  if (modified && original) await save(original.staff.map(s => ({ staffKey: s.staffKey, mode: 'default' })))
  await browser.close()
}
