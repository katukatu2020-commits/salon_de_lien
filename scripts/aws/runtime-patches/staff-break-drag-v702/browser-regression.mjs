import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(process.env.BROWSER_PACKAGE_JSON || path.resolve('package.json'))
const { chromium } = require('playwright-core')
const base = 'http://127.0.0.1:3188', date = '2026-10-23'
execFileSync('docker', ['exec', 'orimia-qa-v680-app', 'node', '-e', `const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{if(process.env.ORIMIA_ISOLATED_QA!=='v680')throw Error('QA only');const [r]=await p.$queryRawUnsafe('SELECT current_database() AS db');if(r.db!=='orimia_qa_v680_20260926')throw Error('Wrong database')})().finally(()=>p.$disconnect())`])
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const output = path.resolve('artifacts/staff-break-drag-v702'); fs.mkdirSync(output, { recursive: true })
const created = [], errors = []
let page
try {
  const login = await context.request.post(base + '/api/auth/login', { form: { email: 'demo.owner', password: 'QaLocalOnly-v680!', next: '/admin/appointments' } })
  assert.equal(login.status(), 200)
  const api = async (method, suffix = '', data) => context.request.fetch(base + '/api/admin/staff-breaks' + suffix, { method, data, headers: { Origin: base } })
  const initial = await (await api('GET', '?date=' + date)).json()
  const staff = initial.staff[0]
  const create = async startMinutes => {
    const response = await api('POST', '', { date, startMinutes, durationMinutes: 60, staffKey: staff.staffKey, staffName: staff.staffName, note: 'QA v702 automated drag test' })
    const body = await response.json(); assert.equal(response.status(), 201, JSON.stringify(body)); created.push(body.break.id); return body.break.id
  }
  const id = await create(660)
  page = await context.newPage(); page.setDefaultTimeout(10000); page.on('pageerror', e => errors.push(e.message))
  const url = base + '/admin/appointments?date=' + date + '&month=2026-10#staff-schedule'
  await page.goto(url)
  const block = p => p.locator(`[data-break-id="${id}"]`)
  const ready = async p => { await block(p).locator('[data-break-edge=start]').waitFor(); await p.waitForFunction(id => !document.querySelector(`[data-break-id="${id}"]`)?.hasAttribute('aria-busy'), id) }
  await ready(page)
  let navigations = 0; page.on('framenavigated', f => { if (f === page.mainFrame()) navigations++ })
  const stored = async () => (await (await api('GET', '?date=' + date)).json()).breaks.find(row => row.id === id)
  const mouseDrag = async (mode, minutes, status = 200, cancel = false) => {
    await ready(page); await block(page).scrollIntoViewIfNeeded()
    const target = mode === 'move' ? block(page) : block(page).locator(`[data-break-edge=${mode}]`)
    const rect = await target.boundingBox(), lane = await block(page).locator('..').boundingBox()
    const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2
    await page.mouse.move(x, y); await page.mouse.down()
    await page.mouse.move(x + minutes * lane.width / (initial.closeMinutes - initial.openMinutes), y, { steps: 6 })
    assert.match(await block(page).getAttribute('class'), /is-dragging-v702/, 'The bar itself must follow the pointer')
    if (cancel) { await page.keyboard.press('Escape'); await page.mouse.up(); return }
    const saved = page.waitForResponse(r => r.url().endsWith('/staff-breaks/' + id) && r.request().method() === 'PATCH')
    await page.mouse.up(); assert.equal((await saved).status(), status); await ready(page)
  }
  await mouseDrag('move', 30); assert.equal((await stored()).startMinutes, 690)
  await mouseDrag('start', -15); assert.equal((await stored()).durationMinutes, 75)
  await mouseDrag('end', 30); assert.equal((await stored()).durationMinutes, 105)
  await mouseDrag('end', -15); assert.equal((await stored()).durationMinutes, 90)
  await mouseDrag('move', 30, 200, true); assert.equal((await stored()).startMinutes, 675)
  await block(page).focus()
  for (const key of ['ArrowRight', 'ArrowLeft']) {
    const saved = page.waitForResponse(r => r.url().endsWith('/staff-breaks/' + id) && r.request().method() === 'PATCH')
    await page.keyboard.press(key); assert.equal((await saved).status(), 200)
    await page.waitForFunction(id => document.activeElement?.getAttribute('data-break-id') === id && !document.activeElement.hasAttribute('aria-busy'), id)
  }
  assert.equal((await stored()).startMinutes, 675)
  assert.equal(await page.locator('#lien-break-delete-title').count(), 0, 'Dragging must not open delete dialog')
  await page.route('**/api/admin/staff-breaks/' + id, async route => {
    if (route.request().method() === 'PATCH') await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'QA save rejected' }) })
    else await route.continue()
  })
  await mouseDrag('move', 30, 500); assert.equal((await stored()).startMinutes, 675)
  await page.getByRole('alert').filter({ hasText: 'QA save rejected' }).waitFor()
  await page.unroute('**/api/admin/staff-breaks/' + id)
  await create(900)
  await mouseDrag('move', 225, 400); assert.equal((await stored()).startMinutes, 675)
  assert.equal(navigations, 0, 'Saving or rejection must not reload the page')
  await page.mouse.move(350, 400); await page.screenshot({ path: path.join(output, 'desktop.png') })
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, storageState: await context.storageState() })
  const phone = await mobile.newPage(); phone.setDefaultTimeout(8000); phone.on('pageerror', e => errors.push(e.message))
  await phone.goto(url); await ready(phone)
  const cdp = await mobile.newCDPSession(phone)
  const touchDrag = async (mode, minutes) => {
    await ready(phone)
    await block(phone).evaluate(e => e.scrollIntoView({ block: 'center', inline: 'center' }))
    const target = mode === 'move' ? block(phone) : block(phone).locator(`[data-break-edge=${mode}]`)
    await target.evaluate(e => {
      let scroller = e.parentElement
      while (scroller && !(scroller.scrollWidth > scroller.clientWidth && /auto|scroll/.test(getComputedStyle(scroller).overflowX))) scroller = scroller.parentElement
      if (scroller) { const r = e.getBoundingClientRect(); scroller.scrollLeft += r.x + r.width / 2 - 280 }
    })
    const rect = await target.boundingBox(), lane = await block(phone).locator('..').boundingBox()
    const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2
    assert.ok(await target.evaluate((e, p) => e.contains(document.elementFromPoint(p.x, p.y)), { x, y }), 'Touch target must not be covered by sticky staff column')
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + minutes * lane.width / (initial.closeMinutes - initial.openMinutes) * i / 6, y }] })
    await phone.screenshot({ path: path.join(output, 'mobile-during-' + mode + '.png') })
    assert.match(await block(phone).getAttribute('class'), /is-dragging-v702/, 'Touch must drag without scrolling')
    const saved = phone.waitForResponse(r => r.url().endsWith('/staff-breaks/' + id) && r.request().method() === 'PATCH')
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    assert.equal((await saved).status(), 200); await ready(phone)
  }
  await touchDrag('move', 15); assert.equal((await stored()).startMinutes, 690)
  await touchDrag('start', -15); assert.equal((await stored()).startMinutes, 675)
  await touchDrag('end', 15); assert.equal((await stored()).durationMinutes, 120)
  await phone.screenshot({ path: path.join(output, 'mobile.png') })
  await page.reload(); await ready(page); assert.match(await block(page).innerText(), /11:15/)
  assert.deepEqual(errors, [])
  console.log('PASS v702 browser: desktop/touch move, both resize edges, saved/reloaded times, Escape, rollback, overlap rejection, no reload or delete dialog, screenshots')
} catch (error) {
  if (page) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {})
  throw error
} finally {
  for (const id of created) await context.request.delete(base + '/api/admin/staff-breaks/' + id, { headers: { Origin: base } })
  await browser.close()
}
