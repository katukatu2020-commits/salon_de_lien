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
const output = 'artifacts/staff-work-shading-v710'; fs.mkdirSync(output, { recursive: true })
let date, month, original, changed = false, breakId
const plan = async () => (await (await context.request.get(base + route + (month ? '?month=' + month : ''))).json())
const day = async () => (await plan()).days.find(row => row.date === date)
const save = async staff => {
  const current = await day()
  const response = await context.request.post(base + route, { headers: { Origin: base }, data: { date, revision: current.revision, staff } })
  assert.equal(response.status(), 200, await response.text())
}
try {
  assert.equal((await context.request.post(base + '/api/auth/login', { form: { email: 'demo.owner', password: 'QaLocalOnly-v680!', next: '/admin/appointments' } })).status(), 200)
  const initial = await plan(), busy = JSON.parse(fixture('busy'))
  original = initial.days.find(row => row.date > initial.today && row.editable && !row.storeClosed && !busy.includes(row.date) && row.staff.length >= 2 && row.staff.every(s => s.mode === 'default') && row.openMinutes <= 660 && row.closeMinutes >= 960)
  assert.ok(original, 'Need an unused QA working date')
  date = original.date; month = date.slice(0, 7)
  const [member, off] = original.staff, key = member.staffKey
  const page = await context.newPage(); page.setDefaultTimeout(10000)
  const errors = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto(base + '/admin/account?panel=attendance&view=policy&workDate=' + date + '&workMonth=' + month)
  const editor = page.locator('[data-work-staff="' + key + '"]')
  await editor.locator('select').selectOption('work')
  await editor.locator('[data-work-start]').fill('11:00')
  await editor.locator('[data-work-end]').fill('16:00')
  await page.locator('[data-work-staff="' + off.staffKey + '"] select').selectOption('off')
  changed = true
  await page.getByRole('button', { name: '勤務予定を保存', exact: true }).click()
  await page.getByText('保存しました。', { exact: true }).waitFor()
  fixture('seed', date, member.staffName)
  const added = await context.request.post(base + '/api/admin/staff-breaks', { headers: { Origin: base }, data: { date, staffKey: key, staffName: member.staffName, startMinutes: 840, durationMinutes: 30, note: 'QA v710 shading test' } })
  assert.equal(added.status(), 201, await added.text()); breakId = (await added.json()).break.id
  await page.goto(base + '/admin/appointments?date=' + date + '&month=' + month + '&view=shift#staff-schedule')
  const lane = page.locator('.shift-lane[data-staff-key="' + key + '"]')
  const expected = { before: (660 - original.openMinutes) / (original.closeMinutes - original.openMinutes) * 100, after: (original.closeMinutes - 960) / (original.closeMinutes - original.openMinutes) * 100 }
  await page.waitForFunction(({ key, expected }) => {
    const lane = document.querySelector('.shift-lane[data-staff-key="' + key + '"]')
    return lane && Object.entries(expected).every(([side, percent]) => Math.abs(parseFloat(lane.querySelector('[data-work-shade="' + side + '"]').style.width) - percent) < .01)
  }, { key, expected })
  const check = async () => {
    for (const side of ['before', 'after']) {
      const shade = lane.locator('[data-work-shade="' + side + '"]')
      const css = await shade.evaluate(e => ({ color: getComputedStyle(e).backgroundColor, pointer: getComputedStyle(e).pointerEvents }))
      assert.notEqual(css.color, 'rgba(0, 0, 0, 0)'); assert.equal(css.pointer, 'none')
      const box = await shade.boundingBox(), parent = await lane.boundingBox()
      assert.ok(box.width >= 0 && box.width <= parent.width + 1)
    }
    const holiday = page.locator('.shift-lane[data-staff-key="' + off.staffKey + '"]')
    assert.equal(await holiday.locator('[data-work-shade=before]').evaluate(e => e.style.width), '100%')
    assert.equal(await holiday.locator('[data-work-shade=after]').evaluate(e => e.style.width), '0%')
    assert.equal(await page.locator('.shift-lane[data-staff-key=free] [data-work-shade=before]').evaluate(e => e.style.width), '0%')
    assert.ok(await page.locator('[data-appointment-id="qa704-work-calendar-appointment"]').isVisible())
    assert.ok(await page.locator('[data-break-id="' + breakId + '"]').isVisible())
  }
  await page.locator('[data-break-id="' + breakId + '"]').waitFor()
  await check()
  await page.screenshot({ path: output + '/desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 }); await check()
  await page.screenshot({ path: output + '/mobile.png', fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  const block = page.locator('[data-break-id="' + breakId + '"]')
  await block.scrollIntoViewIfNeeded()
  const box = await block.boundingBox(), parent = await lane.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  const response = page.waitForResponse(r => r.url().endsWith('/staff-breaks/' + breakId) && r.request().method() === 'PATCH')
  await page.mouse.move(box.x + box.width / 2 + parent.width * 15 / (original.closeMinutes - original.openMinutes), box.y + box.height / 2, { steps: 8 })
  await page.mouse.up(); assert.equal((await response).status(), 200)
  const adjacent = initial.days.find(row => row.date > date && !row.storeClosed && row.staff.every(s => s.mode === 'default'))
  assert.ok(adjacent)
  await page.goto(base + '/admin/appointments?date=' + adjacent.date + '&month=' + adjacent.date.slice(0, 7) + '&view=shift')
  await page.waitForFunction(({ key, start }) => document.querySelector('.shift-lane[data-staff-key="' + key + '"]')?.dataset.workStart === String(start), { key, start: adjacent.staff.find(s => s.staffKey === key).workStartMinutes })
  assert.deepEqual(errors, [])
  console.log('v710 browser PASS: daily-plan save -> shift, grey geometry, full-day holiday, free lane, adjacent date, desktop/mobile, reservation visibility and break dragging')
} finally {
  if (breakId) await context.request.delete(base + '/api/admin/staff-breaks/' + breakId, { headers: { Origin: base } })
  fixture('cleanup')
  if (changed && original) await save(original.staff.map(s => ({ staffKey: s.staffKey, mode: 'default' })))
  await browser.close()
}
