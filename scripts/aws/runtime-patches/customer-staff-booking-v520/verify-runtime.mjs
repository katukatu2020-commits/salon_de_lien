import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = process.env.APP_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const require = createRequire(import.meta.url)
const policy = require(path.join(root, 'customer-staff-booking-v520.js'))

const date = '2026-09-08'
const staff = [
  { staffKey: 'a', staffName: '担当 A', maxConcurrentAppointments: 2, workStartMinutes: 600, workEndMinutes: 1200, closedWeekdays: [] },
  { staffKey: 'b', staffName: '担当 B', maxConcurrentAppointments: 2, workStartMinutes: 600, workEndMinutes: 1200, closedWeekdays: [] },
]
const appointment = (staffName, startMinutes, durationMinutes = 60) => ({
  staffName,
  scheduledAt: new Date(`${date}T${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}:00+09:00`),
  durationMinutes,
})
const common = { staff, staffKey: 'a', date, startMinutes: 660, durationMinutes: 60, dailyCapacity: 4 }

assert.equal(policy.evaluateBookingSlot({ ...common, appointments: [appointment('担当 A', 660)] }).reason, 'selected-staff-start-gap')
assert.equal(policy.evaluateBookingSlot({ ...common, appointments: [appointment('担当 A', 660)], startMinutes: 690 }).available, true)
assert.equal(policy.evaluateBookingSlot({ ...common, appointments: [appointment('担当 B', 660)] }).available, true)
assert.equal(policy.evaluateBookingSlot({ ...common, staff: [staff[0]], appointments: [appointment('フリー', 660)] }).reason, 'no-staff-start-capacity')
assert.equal(policy.evaluateBookingSlot({ ...common, staff: [staff[0]], appointments: [], breaks: [{ staffKey: 'a', startMinutes: 0, durationMinutes: 1440 }] }).reason, 'no-working-staff')

const server = read('server.js')
const tenant = read('tenant-setup.js')
const customerAppointmentsPage = read(path.join('.next', 'server', 'app', 'u', '(account)', 'appointments', 'page.js'))

assert.match(server, /X-Lien-Customer-Staff-Booking', 'v520'/)
assert.match(tenant, /require\('\.\/customer-staff-booking-v520'\)/)
assert.doesNotMatch(tenant, /require\('\.\/booking-availability-v430'\)/)
assert.match(tenant, /"closedWeekdays","active","onLeave" FROM "StaffBookingSetting" WHERE "organizationId"=\$1 ORDER BY/)
assert.match(tenant, /const selectableRows = rows\.filter\(row => row\.active === true && row\.onLeave !== true\)/)
assert.match(tenant, /if \(rows\.length \|\| organizationId !== LEGACY_ORGANIZATION_ID\) return selectableRows\.map\(normalize\)/)
assert.match(tenant, /const nextMonth = rangeMonth === 12/)
assert.match(tenant, /const end = new Date\(`\$\{nextMonth\}-01T00:00:00\+09:00`\)/)
assert.doesNotMatch(tenant, /const end = new Date\(start\); end\.setUTCMonth/)

assert.match(customerAppointmentsPage, /"staffKey","staffName","active","onLeave" FROM "StaffBookingSetting"/)
assert.match(customerAppointmentsPage, /tenantStaffRows\.filter\(e=>e\.active===true&&e\.onLeave!==true\)/)
assert.match(customerAppointmentsPage, /tenantStaffRows\.some\(e=>e\.active===true&&e\.onLeave!==true&&e\.staffKey===r\)/)
assert.match(customerAppointmentsPage, /customer-staff-booking-v520/)

console.log(JSON.stringify({ release: 'customer-staff-booking-v520', verified: true }))
