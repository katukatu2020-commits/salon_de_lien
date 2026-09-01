import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3126').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'manual-break-booking-v521')
fs.mkdirSync(screenshotDir, { recursive: true })

function tokyoToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day}`
}

const prisma = new PrismaClient()
const organizationId = 'org_showcase_yohaku'
const fixtureId = randomUUID()
const fixtureKey = `v521-break-${fixtureId}`
const fixtureName = `V521 Break Staff ${fixtureId.slice(0, 6)}`
const date = tokyoToday()
const startMinutes = 660
const endMinutes = 720

let browser
let breakId = null

try {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "StaffBookingSetting"
      ("id","organizationId","staffKey","staffName","active","onLeave","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays","createdAt","updatedAt")
     VALUES ($1,$2,$3,$4,TRUE,FALSE,1,600,1200,'',NOW(),NOW())`,
    fixtureId,
    organizationId,
    fixtureKey,
    fixtureName,
  )

  browser = await chromium.launch({ executablePath, headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' },
  })
  assert.equal(login.ok(), true, `admin login returned ${login.status()}`)

  const page = await context.newPage()
  await page.goto(`${baseUrl}/admin/appointments?date=${date}&integration=v521`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')
  await page.locator('[data-ts-manual-appointment-launcher]').evaluate(element => element.click())

  const dialog = page.locator('[aria-labelledby="manual-appointment-title"]')
  await dialog.waitFor({ state: 'visible' })
  const toggle = dialog.locator('[data-lien-break-checkbox-v521]')
  await toggle.waitFor({ state: 'visible' })
  assert.equal(await toggle.isChecked(), false, 'break mode must be off when the modal opens')
  assert.equal(await dialog.locator('[data-lien-break-panel-v521]').isHidden(), true, 'break fields are visible before selection')

  await page.waitForTimeout(500)
  const legacyOption = dialog.locator(`select[name="menu"] option[value="__lien_staff_break_v461__"]`)
  if (await legacyOption.count()) {
    const legacyState = await legacyOption.evaluate(option => ({ hidden: option.hidden, disabled: option.disabled }))
    assert.deepEqual(legacyState, { hidden: true, disabled: true }, 'retired break menu option is still selectable')
  }

  await page.screenshot({ path: path.join(screenshotDir, 'manual-modal-default-desktop.png'), fullPage: false })
  await toggle.check()
  const panel = dialog.locator('[data-lien-break-panel-v521]')
  await panel.waitFor({ state: 'visible' })
  const staff = panel.locator('[data-lien-break-staff-v521]')
  await staff.locator(`option[value="${fixtureKey}"]`).waitFor({ state: 'attached' })

  assert.equal(await dialog.locator('select[name="customerId"]').isHidden(), true, 'customer selection is still visible in break mode')
  assert.equal(await dialog.locator('select[name="menu"]').isHidden(), true, 'treatment menu is still visible in break mode')
  assert.equal(await dialog.locator('input[name="estimatedPrice"]').isHidden(), true, 'price is still visible in break mode')
  assert.equal(await dialog.locator('[data-ts-customer-new]').isHidden(), true, 'new customer option is still visible in break mode')
  assert.equal(await dialog.locator('[data-ts-customer-code]').isHidden(), true, 'customer code option is still visible in break mode')
  assert.equal(await panel.locator('[data-lien-break-staff-v521]').isVisible(), true)
  assert.equal(await panel.locator('[data-lien-break-start-v521]').isVisible(), true)
  assert.equal(await panel.locator('[data-lien-break-end-v521]').isVisible(), true)

  await toggle.uncheck()
  assert.equal(await panel.isHidden(), true, 'break fields remain visible after break mode is cleared')
  assert.equal(await dialog.locator('select[name="customerId"]').isVisible(), true, 'customer selection was not restored')
  assert.equal(await dialog.locator('select[name="menu"]').isVisible(), true, 'treatment menu was not restored')
  assert.equal(await dialog.locator('select[name="customerId"]').isEnabled(), true, 'customer selection remains disabled')
  assert.match(await dialog.locator('button[type="submit"]').innerText(), /\u4e88\u7d04\u3092\u767b\u9332/)

  await toggle.check()
  await panel.waitFor({ state: 'visible' })
  await staff.locator(`option[value="${fixtureKey}"]`).waitFor({ state: 'attached' })
  await staff.selectOption(fixtureKey)
  await panel.locator('[data-lien-break-start-v521]').fill('11:00')
  await panel.locator('[data-lien-break-end-v521]').fill('12:00')
  await page.screenshot({ path: path.join(screenshotDir, 'manual-modal-break-desktop.png'), fullPage: false })

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileLayout = await dialog.evaluate(element => ({
    documentOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    dialogOverflow: element.scrollWidth - element.clientWidth,
  }))
  assert.ok(mobileLayout.documentOverflow <= 1, `mobile page overflows by ${mobileLayout.documentOverflow}px`)
  assert.ok(mobileLayout.dialogOverflow <= 1, `mobile dialog overflows by ${mobileLayout.dialogOverflow}px`)
  await page.screenshot({ path: path.join(screenshotDir, 'manual-modal-break-mobile.png'), fullPage: false })

  const responsePromise = page.waitForResponse(response =>
    response.url() === `${baseUrl}/api/admin/staff-breaks` && response.request().method() === 'POST',
  )
  await dialog.locator('button[type="submit"]').click()
  const createResponse = await responsePromise
  const createPayload = await createResponse.json()
  assert.equal(createResponse.status(), 201, createPayload.error || 'break registration failed')
  breakId = createPayload.break?.id || null
  assert.ok(breakId, 'break registration did not return an id')

  await page.waitForTimeout(900)
  const listResponse = await context.request.get(`${baseUrl}/api/admin/staff-breaks?date=${date}`)
  assert.equal(listResponse.ok(), true, `break list returned ${listResponse.status()}`)
  const listPayload = await listResponse.json()
  const registered = listPayload.breaks.find(item => item.id === breakId)
  assert.ok(registered, 'registered break is missing from the break list')
  assert.equal(registered.staffKey, fixtureKey)
  assert.equal(registered.startMinutes, startMinutes)
  assert.equal(registered.durationMinutes, endMinutes - startMinutes)

  const rows = await prisma.$queryRawUnsafe(
    `SELECT "staffKey","startMinutes","durationMinutes" FROM "StaffScheduleBreak" WHERE "id"=$1`,
    breakId,
  )
  assert.equal(rows.length, 1, 'break row was not persisted')
  assert.equal(rows[0].staffKey, fixtureKey)
  assert.equal(Number(rows[0].startMinutes), startMinutes)
  assert.equal(Number(rows[0].durationMinutes), endMinutes - startMinutes)

  const dayStart = new Date(`${date}T00:00:00+09:00`)
  const dayEnd = new Date(`${date}T24:00:00+09:00`)
  const appointmentCount = await prisma.appointment.count({
    where: { staffName: fixtureName, scheduledAt: { gte: dayStart, lt: dayEnd } },
  })
  assert.equal(appointmentCount, 0, 'break mode created an appointment')

  await page.setViewportSize({ width: 1280, height: 900 })
  const breakBlock = page.locator(`.lien-shift-break-v442[data-break-id="${breakId}"]`)
  await breakBlock.waitFor({ state: 'visible', timeout: 7000 })
  await breakBlock.scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(screenshotDir, 'registered-break-shift.png'), fullPage: false })
  await context.close()

  console.log(JSON.stringify({
    release: 'manual-break-booking-v521',
    browserVerified: true,
    date,
    startMinutes,
    endMinutes,
    appointmentCreated: false,
    shiftBlockVisible: true,
  }))
} finally {
  if (browser) await browser.close().catch(() => {})
  await prisma.$transaction(async transaction => {
    await transaction.$executeRawUnsafe(
      'DELETE FROM "StaffScheduleBreak" WHERE "organizationId"=$1 AND "staffKey"=$2',
      organizationId,
      fixtureKey,
    )
    await transaction.$executeRawUnsafe(
      'DELETE FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "staffKey"=$2',
      organizationId,
      fixtureKey,
    )
  }).catch(error => console.error('v521 fixture cleanup failed', error))
  await prisma.$disconnect()
}
