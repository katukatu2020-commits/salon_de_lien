import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  MINIMUM_STAFF_START_GAP_MINUTES,
  evaluateBookingSlot,
} = require('./customer-staff-booking-v520.js')

const date = '2026-09-08'
const staff = [
  { staffKey: 'a', staffName: '担当 A', maxConcurrentAppointments: 2, workStartMinutes: 600, workEndMinutes: 1200, closedWeekdays: [] },
  { staffKey: 'b', staffName: '担当 B', maxConcurrentAppointments: 2, workStartMinutes: 600, workEndMinutes: 1200, closedWeekdays: [] },
]
const appointment = (staffName, startMinutes, durationMinutes = 60) => {
  const hour = String(Math.floor(startMinutes / 60)).padStart(2, '0')
  const minute = String(startMinutes % 60).padStart(2, '0')
  return { staffName, scheduledAt: new Date(`${date}T${hour}:${minute}:00+09:00`), durationMinutes }
}
const evaluate = input => evaluateBookingSlot({
  staff,
  appointments: [],
  staffKey: 'a',
  date,
  startMinutes: 660,
  durationMinutes: 60,
  dailyCapacity: 4,
  ...input,
})

assert.equal(MINIMUM_STAFF_START_GAP_MINUTES, 30)

const sameStart = evaluate({ appointments: [appointment('担当 A', 660)] })
assert.equal(sameStart.available, false)
assert.equal(sameStart.reason, 'selected-staff-start-gap')

const thirtyMinutesLater = evaluate({
  appointments: [appointment('担当 A', 660)],
  startMinutes: 690,
})
assert.equal(thirtyMinutesLater.available, true)

const otherStaffSameStart = evaluate({ appointments: [appointment('担当 B', 660)] })
assert.equal(otherStaffSameStart.available, true)

const selectedCapacityReached = evaluate({
  staff: [{ ...staff[0], maxConcurrentAppointments: 1 }, staff[1]],
  appointments: [appointment('担当 A', 660)],
  startMinutes: 690,
})
assert.equal(selectedCapacityReached.available, false)
assert.equal(selectedCapacityReached.reason, 'selected-staff-capacity')

const oneStaffFreeSameStart = evaluate({
  staff: [staff[0]],
  appointments: [appointment('担当 A', 660)],
  staffKey: 'free',
  dailyCapacity: 2,
})
assert.equal(oneStaffFreeSameStart.available, false)
assert.equal(oneStaffFreeSameStart.reason, 'no-staff-start-capacity')

const twoStaffFreeSameStart = evaluate({
  appointments: [appointment('担当 A', 660)],
  staffKey: 'free',
})
assert.equal(twoStaffFreeSameStart.available, true)

const oneStaffSelectedAgainstFreeStart = evaluate({
  staff: [staff[0]],
  appointments: [appointment('フリー', 660)],
})
assert.equal(oneStaffSelectedAgainstFreeStart.available, false)
assert.equal(oneStaffSelectedAgainstFreeStart.reason, 'no-staff-start-capacity')

const twoStaffSelectedAgainstFreeStart = evaluate({
  appointments: [appointment('フリー', 660)],
})
assert.equal(twoStaffSelectedAgainstFreeStart.available, true)

const selectedAgainstFullStartPool = evaluate({
  appointments: [appointment('担当 B', 660), appointment('フリー', 660)],
})
assert.equal(selectedAgainstFullStartPool.available, false)
assert.equal(selectedAgainstFullStartPool.reason, 'no-staff-start-capacity')

const recurringDayOff = evaluate({ staff: [{ ...staff[0], closedWeekdays: [2] }] })
assert.equal(recurringDayOff.available, false)
assert.equal(recurringDayOff.reason, 'no-working-staff')

const fullDayLeave = evaluate({
  staff: [staff[0]],
  breaks: [{ staffKey: 'a', staffName: '担当 A', startMinutes: 0, durationMinutes: 1440 }],
})
assert.equal(fullDayLeave.available, false)
assert.equal(fullDayLeave.reason, 'no-working-staff')

console.log(JSON.stringify({ release: 'customer-staff-booking-v520', policyVerified: true }))
