import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { chromium } from 'playwright-core'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'http://127.0.0.1:3125').replace(/\/$/, '')
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const screenshotDir = process.env.VERIFY_SCREENSHOT_DIR || path.join(os.tmpdir(), 'customer-staff-booking-v520')
fs.mkdirSync(screenshotDir, { recursive: true })

function tokyoDateAfter(days) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(new Date(Date.now() + days * 24 * 60 * 60 * 1000))
}

const prisma = new PrismaClient()
const fixturePrefix = `v520-${randomUUID()}`
const availableStaffKey = `${fixturePrefix}-available`
const leaveStaffKey = `${fixturePrefix}-leave`
const availableStaffName = 'V520 予約確認'
const leaveStaffName = 'V520 休暇中'
const fixtureAppointmentId = `${fixturePrefix}-appointment`
const date = tokyoDateAfter(60)
const startMinutes = 660
const nextStartMinutes = 690
const testStartedAt = new Date()

let browser
let createdAppointmentId = null
let originalDailySchedule = null
let organizationId = null
let customerId = null

try {
  const customerRows = await prisma.$queryRawUnsafe(
    `SELECT u."customerId",c."organizationId"
       FROM "AppUser" u JOIN "Customer" c ON c."id"=u."customerId"
      WHERE u."loginId"=$1 LIMIT 1`,
    'demo.hana',
  )
  assert.equal(customerRows.length, 1, 'demo customer was not found')
  customerId = customerRows[0].customerId
  organizationId = customerRows[0].organizationId

  const menuRows = await prisma.$queryRawUnsafe(
    `SELECT "id","name","durationMinutes"
       FROM "SalonMenu"
      WHERE "organizationId"=$1 AND "active"=TRUE AND "durationMinutes">=60
      ORDER BY "durationMinutes","sortOrder" LIMIT 1`,
    organizationId,
  )
  assert.equal(menuRows.length, 1, 'a 60-minute booking menu was not found')
  const menu = menuRows[0]

  const otherCustomerRows = await prisma.$queryRawUnsafe(
    `SELECT "id" FROM "Customer"
      WHERE "organizationId"=$1 AND "id"<>$2 AND "deletedAt" IS NULL
      ORDER BY "createdAt" LIMIT 1`,
    organizationId,
    customerId,
  )
  assert.ok(otherCustomerRows.length > 0, 'a fixture appointment customer was not found')

  const dailyRows = await prisma.$queryRawUnsafe(
    `SELECT "isClosed","openMinutes","closeMinutes","capacity","updatedByUserId"
       FROM "OrganizationDailySchedule"
      WHERE "organizationId"=$1 AND "date"=$2 LIMIT 1`,
    organizationId,
    date,
  )
  originalDailySchedule = dailyRows[0] || null

  await prisma.$transaction(async transaction => {
    await transaction.$executeRawUnsafe(
      `INSERT INTO "StaffBookingSetting"
        ("id","organizationId","staffKey","staffName","active","onLeave","maxConcurrentAppointments","workStartMinutes","workEndMinutes","closedWeekdays","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,TRUE,FALSE,2,600,1200,'',NOW(),NOW()),
              ($5,$2,$6,$7,TRUE,TRUE,2,600,1200,'',NOW(),NOW())`,
      randomUUID(),
      organizationId,
      availableStaffKey,
      availableStaffName,
      randomUUID(),
      leaveStaffKey,
      leaveStaffName,
    )
    await transaction.$executeRawUnsafe(
      `INSERT INTO "OrganizationDailySchedule"
        ("organizationId","date","isClosed","openMinutes","closeMinutes","capacity","createdAt","updatedAt")
       VALUES ($1,$2,FALSE,600,1200,99,NOW(),NOW())
       ON CONFLICT ("organizationId","date") DO UPDATE
         SET "isClosed"=FALSE,"openMinutes"=600,"closeMinutes"=1200,"capacity"=99,"updatedAt"=NOW()`,
      organizationId,
      date,
    )
    await transaction.$executeRawUnsafe(
      `INSERT INTO "Appointment"
        ("id","customerId","scheduledAt","durationMinutes","menu","staffName","status","source","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,'予約確定','v520 integration fixture',NOW(),NOW())`,
      fixtureAppointmentId,
      otherCustomerRows[0].id,
      new Date(`${date}T11:00:00+09:00`),
      Number(menu.durationMinutes),
      menu.name,
      availableStaffName,
    )
  })

  browser = await chromium.launch({ executablePath, headless: true })
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } })
  const login = await context.request.post(`${baseUrl}/api/customer-auth/login`, {
    form: { loginId: 'demo.hana', password: 'Mypage2026!', next: '/u/appointments' },
  })
  assert.equal(login.ok(), true, `customer login returned ${login.status()}`)

  const page = await context.newPage()
  await page.goto(`${baseUrl}/u/appointments?integration=v520`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'メニューとスタイリストを選択' }).waitFor()
  await page.getByRole('button', { name: availableStaffName, exact: true }).waitFor()
  assert.equal(await page.getByRole('button', { name: leaveStaffName, exact: true }).count(), 0, 'on-leave staff is visible in the customer selector')
  await page.screenshot({ path: path.join(screenshotDir, 'staff-selector-desktop.png'), fullPage: false })

  const availabilityResponse = await context.request.get(
    `${baseUrl}/api/customer/appointments/availability?month=${date.slice(0, 7)}&staff=${encodeURIComponent(availableStaffKey)}&menu=${encodeURIComponent(menu.id)}`,
  )
  assert.equal(availabilityResponse.ok(), true, `availability returned ${availabilityResponse.status()}`)
  const availability = await availabilityResponse.json()
  const day = availability.days.find(item => item.date === date)
  assert.ok(day, 'fixture day is missing from availability')
  const fixtureRows = await prisma.$queryRawUnsafe(
    'SELECT "scheduledAt","staffName","status" FROM "Appointment" WHERE "id"=$1',
    fixtureAppointmentId,
  )
  assert.equal(
    day.slots.includes(startMinutes),
    false,
    `same staff can still start two customers at 11:00: ${JSON.stringify({ date, fixtureRows, day })}`,
  )
  assert.equal(day.slots.includes(nextStartMinutes), true, 'same staff cannot accept the staggered 11:30 start')

  const sameStartResponse = await context.request.post(`${baseUrl}/api/customer/appointments`, {
    data: { staffKey: availableStaffKey, menuKey: menu.id, date, startMinutes },
  })
  assert.equal(sameStartResponse.ok(), false, 'booking submission accepted a duplicate staff start')

  const staggeredResponse = await context.request.post(`${baseUrl}/api/customer/appointments`, {
    data: { staffKey: availableStaffKey, menuKey: menu.id, date, startMinutes: nextStartMinutes },
  })
  assert.equal(staggeredResponse.ok(), true, `staggered booking returned ${staggeredResponse.status()}: ${await staggeredResponse.text()}`)
  const staggered = await staggeredResponse.json()
  createdAppointmentId = staggered.appointment?.id || null
  assert.ok(createdAppointmentId, 'staggered booking did not return an appointment')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: 'メニューとスタイリストを選択' }).waitFor()
  assert.equal(await page.getByRole('button', { name: leaveStaffName, exact: true }).count(), 0, 'on-leave staff is visible on mobile')
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'customer booking page overflows on mobile')
  await page.screenshot({ path: path.join(screenshotDir, 'staff-selector-mobile.png'), fullPage: false })
  await context.close()

  console.log(JSON.stringify({
    release: 'customer-staff-booking-v520',
    browserVerified: true,
    date,
    rejectedStart: startMinutes,
    acceptedStart: nextStartMinutes,
  }))
} finally {
  if (browser) await browser.close().catch(() => {})
  if (organizationId) {
    await prisma.$transaction(async transaction => {
      if (createdAppointmentId) {
        await transaction.$executeRawUnsafe('DELETE FROM "Appointment" WHERE "id"=$1', createdAppointmentId)
      }
      await transaction.$executeRawUnsafe('DELETE FROM "Appointment" WHERE "id"=$1', fixtureAppointmentId)
      if (customerId) {
        await transaction.$executeRawUnsafe(
          `DELETE FROM "ContactLog"
            WHERE "customerId"=$1 AND "createdAt">=$2 AND "message" LIKE $3`,
          customerId,
          testStartedAt,
          `%${availableStaffName}%`,
        )
      }
      await transaction.$executeRawUnsafe(
        'DELETE FROM "StaffBookingSetting" WHERE "organizationId"=$1 AND "staffKey" IN ($2,$3)',
        organizationId,
        availableStaffKey,
        leaveStaffKey,
      )
      if (originalDailySchedule) {
        await transaction.$executeRawUnsafe(
          `UPDATE "OrganizationDailySchedule"
              SET "isClosed"=$3,"openMinutes"=$4,"closeMinutes"=$5,"capacity"=$6,"updatedByUserId"=$7,"updatedAt"=NOW()
            WHERE "organizationId"=$1 AND "date"=$2`,
          organizationId,
          date,
          originalDailySchedule.isClosed,
          Number(originalDailySchedule.openMinutes),
          Number(originalDailySchedule.closeMinutes),
          Number(originalDailySchedule.capacity),
          originalDailySchedule.updatedByUserId,
        )
      } else {
        await transaction.$executeRawUnsafe(
          'DELETE FROM "OrganizationDailySchedule" WHERE "organizationId"=$1 AND "date"=$2',
          organizationId,
          date,
        )
      }
    }).catch(error => console.error('v520 fixture cleanup failed', error))
  }
  await prisma.$disconnect()
}
