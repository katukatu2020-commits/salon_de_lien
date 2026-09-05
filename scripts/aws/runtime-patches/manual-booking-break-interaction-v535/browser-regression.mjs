import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3115').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'manual-booking-break-interaction-v535')
fs.mkdirSync(screenshotDir, { recursive: true })

function tokyoToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function timeLabel(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

async function openManualDialogFromLane(page, staffKey, minutes) {
  const lane = page.locator(`.shift-lane[data-staff-key="${staffKey}"]`)
  await lane.waitFor({ state: 'visible', timeout: 15_000 })
  await lane.scrollIntoViewIfNeeded()
  const geometry = await lane.evaluate((node, selectedMinutes) => {
    const canvas = node.closest('.shift-canvas')
    const rect = node.getBoundingClientRect()
    const open = Number(canvas?.dataset.tsBusinessOpen || 600)
    const close = Number(canvas?.dataset.tsBusinessClose || 1140)
    return {
      x: rect.left + ((selectedMinutes + 7.5 - open) / (close - open)) * rect.width,
      y: rect.top + rect.height / 2,
      open,
      close,
      width: rect.width,
    }
  }, minutes)
  assert.ok(minutes >= geometry.open && minutes < geometry.close, `selected time is outside the shift canvas: ${JSON.stringify(geometry)}`)
  assert.ok(geometry.x >= 0 && geometry.x <= await page.evaluate(() => innerWidth), `selected shift cell is outside the viewport: ${JSON.stringify(geometry)}`)
  await page.mouse.dblclick(geometry.x, geometry.y, { delay: 45 })
  const dialog = page.locator('[aria-labelledby="manual-appointment-title"]')
  await dialog.waitFor({ state: 'visible', timeout: 10_000 })
  await dialog.locator('input[name="startTime"]').waitFor({ state: 'visible' })
  await page.waitForFunction(expected => document.querySelector('[aria-labelledby="manual-appointment-title"] input[name="startTime"]')?.value === expected, timeLabel(minutes))
  return dialog
}

const prisma = new PrismaClient()
const organizationId = 'org_showcase_yohaku'
const suffix = randomUUID().slice(0, 8)
const customerId = `v535-customer-${suffix}`
const customerName = `V535 Manual Customer ${suffix}`
const staffId = `v535-staff-${suffix}`
const staffKey = `v535-staff-key-${suffix}`
const staffName = `V535 Manual Staff ${suffix}`
const menuId = `v535-menu-${suffix}`
const menuName = `V535 Verification Menu ${suffix}`
const date = tokyoToday()
const appointmentStart = 720
const breakStart = 840
let appointmentId = null
let breakId = null
let browser

try {
  await prisma.$transaction(async transaction => {
    await transaction.$executeRawUnsafe(
      `INSERT INTO "Customer" ("id","name","organizationId","createdAt","updatedAt") VALUES ($1,$2,$3,NOW(),NOW())`,
      customerId,
      customerName,
      organizationId,
    )
    await transaction.$executeRawUnsafe(
      `INSERT INTO "StaffBookingSetting"
        ("id","organizationId","staffKey","staffName","active","onLeave","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,TRUE,FALSE,1,480,1260,'',NOW(),NOW())`,
      staffId,
      organizationId,
      staffKey,
      staffName,
    )
    await transaction.$executeRawUnsafe(
      `INSERT INTO "SalonMenu" ("id","organizationId","name","category","durationMinutes","priceYen","source","active","sortOrder","createdAt","updatedAt")
       VALUES ($1,$2,$3,'verification',30,5500,'manual',TRUE,-100,NOW(),NOW())`,
      menuId,
      organizationId,
      menuName,
    )
  })

  browser = await chromium.launch({ executablePath, headless: true })
  const context = await browser.newContext({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 1 })
  const login = await context.request.post(`${baseUrl}/api/auth/login`, {
    form: { email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/appointments' },
  })
  assert.equal(login.ok(), true, `admin login returned ${login.status()}`)

  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  const navigation = await page.goto(`${baseUrl}/admin/appointments?date=${date}&integration=v535`, { waitUntil: 'domcontentloaded', timeout: 35_000 })
  assert.equal(navigation?.ok(), true, `appointments page returned ${navigation?.status()}`)
  await page.waitForFunction(() => document.documentElement.dataset.orimiaUiReady === 'v516')

  const normalDialog = await openManualDialogFromLane(page, staffKey, appointmentStart)
  const normalForm = normalDialog.locator('form')
  const inactiveBreakControls = await normalDialog.locator('[data-lien-break-panel-v521] input,[data-lien-break-panel-v521] select').evaluateAll(controls => controls.map(control => ({
    name: control.name,
    disabled: control.disabled,
    required: control.required,
  })))
  assert.equal(inactiveBreakControls.length, 3)
  assert.ok(inactiveBreakControls.every(control => control.disabled && !control.required), `hidden break validation is still active: ${JSON.stringify(inactiveBreakControls)}`)

  await normalDialog.locator('select[name="customerId"]').selectOption(customerId)
  await normalDialog.locator('select[name="staffName"]').selectOption({ label: staffName })
  const menu = normalDialog.locator('select[name="menu"]')
  await menu.locator(`option[value="${menuName}"]`).waitFor({ state: 'attached', timeout: 10_000 })
  await menu.selectOption(menuName)
  await normalDialog.locator('input[name="durationMinutes"]').fill('30')
  await normalDialog.locator('select[name="bookingProvider"]').selectOption('phone')

  const normalValidity = await normalForm.evaluate(form => ({
    valid: form.checkValidity(),
    invalid: [...form.elements].filter(control => !control.validity?.valid).map(control => ({ name: control.name, value: control.value })),
    submittedNames: [...new FormData(form).keys()],
  }))
  assert.equal(normalValidity.valid, true, `normal appointment form is invalid: ${JSON.stringify(normalValidity.invalid)}`)
  assert.equal(normalValidity.submittedNames.includes('breakStaffKey'), false)
  await page.screenshot({ path: path.join(screenshotDir, 'manual-appointment-desktop.png'), fullPage: false })

  const appointmentRequest = page.waitForRequest(request => request.url() === `${baseUrl}/api/admin/appointments/manual` && request.method() === 'POST')
  const appointmentResponse = page.waitForResponse(response => response.url() === `${baseUrl}/api/admin/appointments/manual` && response.request().method() === 'POST')
  await normalDialog.locator('button[type="submit"]').click()
  const submittedAppointment = await appointmentRequest
  const submittedAppointmentBody = submittedAppointment.postDataJSON()
  const createdAppointmentResponse = await appointmentResponse
  const createdAppointment = await createdAppointmentResponse.json()
  assert.equal(createdAppointmentResponse.status(), 200, createdAppointment.error || 'manual appointment registration failed')
  assert.equal(createdAppointment.success, true)
  appointmentId = createdAppointment.appointment?.id || null
  assert.ok(appointmentId, 'manual appointment response did not contain an id')
  assert.equal(submittedAppointmentBody.customerId, customerId)
  assert.equal(submittedAppointmentBody.startMinutes, appointmentStart)
  assert.equal(submittedAppointmentBody.staffName, staffName)
  assert.equal(submittedAppointmentBody.menu, menuName)

  const storedAppointments = await prisma.$queryRawUnsafe(
    `SELECT "customerId","staffName","durationMinutes","bookingProvider" FROM "Appointment" WHERE "id"=$1`,
    appointmentId,
  )
  assert.equal(storedAppointments.length, 1)
  assert.equal(storedAppointments[0].customerId, customerId)
  assert.equal(storedAppointments[0].staffName, staffName)
  assert.equal(Number(storedAppointments[0].durationMinutes), 30)
  assert.equal(storedAppointments[0].bookingProvider, 'phone')

  await normalDialog.waitFor({ state: 'hidden', timeout: 10_000 })
  const breakDialog = await openManualDialogFromLane(page, staffKey, breakStart)
  const toggle = breakDialog.locator('[data-lien-break-checkbox-v521]')
  await toggle.check()
  const panel = breakDialog.locator('[data-lien-break-panel-v521]')
  await panel.waitFor({ state: 'visible' })
  const breakStaff = panel.locator('[data-lien-break-staff-v521]')
  await breakStaff.locator(`option[value="${staffKey}"]`).waitFor({ state: 'attached', timeout: 10_000 })
  await breakStaff.selectOption(staffKey)
  assert.equal(await panel.locator('[data-lien-break-start-v521]').inputValue(), timeLabel(breakStart), 'selected shift time was not copied to break start')
  assert.equal(await panel.locator('[data-lien-break-end-v521]').inputValue(), timeLabel(breakStart + 60), 'default break duration was not preserved')

  const activeBreakControls = await panel.locator('input,select').evaluateAll(controls => controls.map(control => ({ disabled: control.disabled, required: control.required })))
  assert.ok(activeBreakControls.every(control => !control.disabled && control.required), `break controls are not active: ${JSON.stringify(activeBreakControls)}`)

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileLayout = await breakDialog.evaluate(dialog => ({
    pageOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    dialogOverflow: dialog.scrollWidth - dialog.clientWidth,
  }))
  assert.ok(mobileLayout.pageOverflow <= 1, `mobile page overflows by ${mobileLayout.pageOverflow}px`)
  assert.ok(mobileLayout.dialogOverflow <= 1, `mobile dialog overflows by ${mobileLayout.dialogOverflow}px`)
  await page.screenshot({ path: path.join(screenshotDir, 'break-registration-mobile.png'), fullPage: false })
  await page.setViewportSize({ width: 1800, height: 1100 })

  const breakCreateResponse = page.waitForResponse(response => response.url() === `${baseUrl}/api/admin/staff-breaks` && response.request().method() === 'POST')
  await breakDialog.locator('button[type="submit"]').click()
  const createdBreakResponse = await breakCreateResponse
  const createdBreak = await createdBreakResponse.json()
  assert.equal(createdBreakResponse.status(), 201, createdBreak.error || 'break registration failed')
  breakId = createdBreak.break?.id || null
  assert.ok(breakId, 'break response did not contain an id')
  assert.equal(createdBreak.break.startMinutes, breakStart)
  assert.equal(createdBreak.break.durationMinutes, 60)

  await page.waitForTimeout(1_200)
  let breakCard = page.locator(`.lien-shift-break-v442[data-break-id="${breakId}"]`)
  await breakCard.waitFor({ state: 'visible', timeout: 15_000 })
  await breakCard.scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(screenshotDir, 'break-card-before-drag.png'), fullPage: false })

  const moveGeometry = await breakCard.evaluate(node => {
    const card = node.getBoundingClientRect()
    const lane = node.closest('.shift-lane').getBoundingClientRect()
    const canvas = node.closest('.shift-canvas')
    const span = Number(canvas.dataset.tsBusinessClose) - Number(canvas.dataset.tsBusinessOpen)
    return { x: card.left + Math.min(card.width - 18, Math.max(12, card.width * 0.35)), y: card.top + card.height / 2, delta: lane.width / span * 30 }
  })
  const moveResponse = page.waitForResponse(response => response.url() === `${baseUrl}/api/admin/staff-breaks/${breakId}` && response.request().method() === 'PATCH')
  await page.mouse.move(moveGeometry.x, moveGeometry.y)
  await page.mouse.down()
  await page.mouse.move(moveGeometry.x + moveGeometry.delta, moveGeometry.y, { steps: 8 })
  await page.mouse.up()
  const movedResponse = await moveResponse
  const movedPayload = await movedResponse.json()
  assert.equal(movedResponse.status(), 200, movedPayload.error || 'break drag failed')
  assert.equal(movedPayload.break.startMinutes, breakStart + 30)

  await page.waitForTimeout(1_200)
  breakCard = page.locator(`.lien-shift-break-v442[data-break-id="${breakId}"]`)
  await breakCard.waitFor({ state: 'visible', timeout: 15_000 })
  const resizeHandle = breakCard.locator('.lien-break-resize-v461')
  await resizeHandle.waitFor({ state: 'visible' })
  const resizeGeometry = await resizeHandle.evaluate(node => {
    const handle = node.getBoundingClientRect()
    const lane = node.closest('.shift-lane').getBoundingClientRect()
    const canvas = node.closest('.shift-canvas')
    const span = Number(canvas.dataset.tsBusinessClose) - Number(canvas.dataset.tsBusinessOpen)
    return { x: handle.left + handle.width / 2, y: handle.top + handle.height / 2, delta: lane.width / span * 30 }
  })
  const resizeResponse = page.waitForResponse(response => response.url() === `${baseUrl}/api/admin/staff-breaks/${breakId}` && response.request().method() === 'PATCH')
  await page.mouse.move(resizeGeometry.x, resizeGeometry.y)
  await page.mouse.down()
  await page.mouse.move(resizeGeometry.x + resizeGeometry.delta, resizeGeometry.y, { steps: 8 })
  await page.mouse.up()
  const resizedResponse = await resizeResponse
  const resizedPayload = await resizedResponse.json()
  assert.equal(resizedResponse.status(), 200, resizedPayload.error || 'break resize failed')
  assert.equal(resizedPayload.break.startMinutes, breakStart + 30)
  assert.equal(resizedPayload.break.durationMinutes, 90)

  await page.waitForTimeout(1_200)
  breakCard = page.locator(`.lien-shift-break-v442[data-break-id="${breakId}"]`)
  await breakCard.waitFor({ state: 'visible', timeout: 15_000 })
  await breakCard.scrollIntoViewIfNeeded()
  await page.screenshot({ path: path.join(screenshotDir, 'break-card-after-drag-resize.png'), fullPage: false })

  const storedBreaks = await prisma.$queryRawUnsafe(
    `SELECT "startMinutes","durationMinutes" FROM "StaffScheduleBreak" WHERE "id"=$1`,
    breakId,
  )
  assert.equal(storedBreaks.length, 1)
  assert.equal(Number(storedBreaks[0].startMinutes), breakStart + 30)
  assert.equal(Number(storedBreaks[0].durationMinutes), 90)
  assert.equal(consoleErrors.some(message => message.includes('not focusable') || message.includes('invalid form control')), false, `browser validation error remained: ${JSON.stringify(consoleErrors)}`)

  await context.close()
  console.log(JSON.stringify({
    release: 'manual-booking-break-interaction-v535',
    browserVerified: true,
    date,
    manualAppointment: { status: 200, startMinutes: appointmentStart, durationMinutes: 30 },
    break: { status: 201, initialStartMinutes: breakStart, movedStartMinutes: breakStart + 30, resizedDurationMinutes: 90 },
    screenshotDir,
  }))
} finally {
  if (browser) await browser.close().catch(() => {})
  await prisma.$transaction(async transaction => {
    if (breakId) await transaction.$executeRawUnsafe('DELETE FROM "StaffScheduleBreak" WHERE "id"=$1', breakId)
    else await transaction.$executeRawUnsafe('DELETE FROM "StaffScheduleBreak" WHERE "organizationId"=$1 AND "staffKey"=$2', organizationId, staffKey)
    if (appointmentId) await transaction.$executeRawUnsafe('DELETE FROM "Appointment" WHERE "id"=$1', appointmentId)
    await transaction.$executeRawUnsafe('DELETE FROM "ContactLog" WHERE "customerId"=$1', customerId)
    await transaction.$executeRawUnsafe('DELETE FROM "CustomerNormalizedNameIdentity" WHERE "customerId"=$1', customerId).catch(() => 0)
    await transaction.$executeRawUnsafe('DELETE FROM "Customer" WHERE "id"=$1', customerId)
    await transaction.$executeRawUnsafe('DELETE FROM "SalonMenu" WHERE "id"=$1', menuId)
    await transaction.$executeRawUnsafe('DELETE FROM "StaffBookingSetting" WHERE "id"=$1', staffId)
  }).catch(error => console.error('v535 fixture cleanup failed', error))
  await prisma.$disconnect()
}
