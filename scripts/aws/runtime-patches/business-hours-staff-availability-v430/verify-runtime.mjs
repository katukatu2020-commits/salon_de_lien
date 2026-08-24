import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { evaluateBookingSlot } = require('/app/booking-availability-v430.js')

const staff = [
  { staffKey: 'a', staffName: '担当 A', maxConcurrentAppointments: 1, workStartMinutes: 480, workEndMinutes: 1140, closedWeekdays: [] },
  { staffKey: 'b', staffName: '担当 B', maxConcurrentAppointments: 1, workStartMinutes: 480, workEndMinutes: 1140, closedWeekdays: [] },
]
const appointment = (staffName, hour) => ({ staffName, scheduledAt: new Date(`2026-08-25T${hour}:00:00+09:00`), durationMinutes: 60 })

assert.equal(evaluateBookingSlot({ staff, appointments: [appointment('担当 B', '10')], staffKey: 'a', date: '2026-08-25', startMinutes: 600, durationMinutes: 60, dailyCapacity: 2 }).available, true)
assert.equal(evaluateBookingSlot({ staff, appointments: [appointment('担当 A', '10')], staffKey: 'a', date: '2026-08-25', startMinutes: 600, durationMinutes: 60, dailyCapacity: 2 }).available, false)
assert.equal(evaluateBookingSlot({ staff, appointments: [appointment('担当 B', '10')], staffKey: 'a', date: '2026-08-25', startMinutes: 600, durationMinutes: 60, dailyCapacity: 1 }).reason, 'store-capacity')
assert.equal(evaluateBookingSlot({ staff: [{ ...staff[0], closedWeekdays: [2] }], appointments: [], staffKey: 'a', date: '2026-08-25', startMinutes: 600, durationMinutes: 60, dailyCapacity: 1 }).reason, 'no-working-staff')
assert.equal(evaluateBookingSlot({ staff, appointments: [], staffKey: 'a', date: '2026-08-25', startMinutes: 480, durationMinutes: 60, dailyCapacity: 2 }).available, true)

const tenant = fs.readFileSync('/app/tenant-setup.js', 'utf8')
for (const marker of [
  "require('./booking-availability-v430')",
  'appointments: dayAppointments',
  'dailyCapacity: Number(daySchedule.capacity || defaultCapacity || 0)',
  'dailyCapacity: Number(currentSchedule.capacity || 0)',
]) assert.ok(tenant.includes(marker), `tenant setup missing: ${marker}`)

const storeProfile = fs.readFileSync('/app/store-profile.js', 'utf8')
assert.ok(storeProfile.includes('previousOpenMinutes'))
assert.ok(storeProfile.includes('UPDATE "OrganizationDailySchedule" SET "openMinutes"=$2,"closeMinutes"=$3'))

const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')
assert.ok(tenantClient.includes("if (event.detail.overridden === undefined) state.dailyScheduleDate = ''"))

const shiftClient = fs.readFileSync('/app/.next/static/chunks/app/admin/appointments/page-shift-staff-drop-v394.js', 'utf8')
assert.ok(shiftClient.includes('e.profile?.businessSchedule||e.businessSchedule||e'))
assert.ok(shiftClient.includes('.finally(()=>{if(!__cancelled)__setShiftHydrated(true)})'))
assert.ok(!shiftClient.includes('(0,l.useEffect)(()=>{__setShiftHydrated(true)},[])'))
new Function(shiftClient)

console.log('Business hours and staff availability v430 verified.')
