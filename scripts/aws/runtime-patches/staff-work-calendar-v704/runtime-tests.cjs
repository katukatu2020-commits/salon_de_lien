'use strict'
const assert = require('node:assert/strict')
const model = require('./schedule.cjs')
const staff = [{ staffKey: 'a', staffName: 'スタッフ A', workStartMinutes: 540, workEndMinutes: 1200, closedWeekdays: '1', maxConcurrentAppointments: 1 }]
const plan = { policies: [{ staffKey: 'a', plannedStart: '08:00', plannedEnd: '19:00' }], overrides: [] }
assert.equal(model.maximumDate('2026-10-06'), '2027-01-06')
assert.equal(model.maximumDate('2026-01-31'), '2026-04-30')
assert.equal(model.maximumDate('2023-11-30'), '2024-02-29')
assert.throws(() => model.dateKey('2026-02-30'))
assert.equal(model.effectiveRows(staff, '2026-10-06', plan)[0].workStartMinutes, 480)
assert.equal(model.effectiveRows(staff, '2026-10-05', plan)[0].isDayOff, true)
const override = { staffKey: 'a', date: '2026-10-05', isDayOff: false, startMinutes: 660, endMinutes: 900 }
const working = model.effectiveRows(staff, '2026-10-05', { ...plan, overrides: [override] })[0]
assert.equal(working.workStartMinutes, 660)
assert.equal(working.closedWeekdays, '')
const off = model.effectiveRows(staff, '2026-10-06', { ...plan, overrides: [{ ...override, date: '2026-10-06', isDayOff: true }] })[0]
assert.equal(off.workEndMinutes, 0)
assert.equal(off.isDayOff, true)
const input = { date: '2027-01-06', staff: [{ staffKey: 'a', mode: 'work', startMinutes: 600, endMinutes: 900 }] }
assert.equal(model.validateChanges(input, staff, '2026-10-06').length, 1)
assert.throws(() => model.validateChanges({ ...input, date: '2027-01-07' }, staff, '2026-10-06'))
assert.throws(() => model.validateChanges({ ...input, date: '2026-10-05' }, staff, '2026-10-06'))
assert.throws(() => model.validateChanges({ ...input, staff: [{ ...input.staff[0], staffKey: 'other-tenant' }] }, staff, '2026-10-06'))
assert.throws(() => model.validateChanges({ ...input, staff: [input.staff[0], input.staff[0]] }, staff, '2026-10-06'))
assert.throws(() => model.validateChanges({ ...input, staff: [{ ...input.staff[0], endMinutes: 600 }] }, staff, '2026-10-06'))
assert.throws(() => model.validateChanges({ ...input, staff: [{ ...input.staff[0], startMinutes: 601 }] }, staff, '2026-10-06'))
async function run() {
  const booking = { id: 'booking', staffName: 'スタッフA', scheduledAt: new Date('2026-10-06T11:00:00+09:00'), durationMinutes: 60 }
  await assert.rejects(model.assertExistingBookings({ $queryRawUnsafe: async () => [booking] }, 'org', '2026-10-06', [off]), /既存予約/)
  await model.assertExistingBookings({ $queryRawUnsafe: async () => [booking] }, 'org', '2026-10-06', [working])
  let result
  const service = role => model.createService({ prisma: {}, sessionProvider: async () => role ? { role, organizationId: 'org', userId: 'actor' } : null, json: (res, status, body) => { result = { status, body } } })
  const url = new URL('https://test/api/admin/staff-work-calendar')
  await service(null).handle({ method: 'GET' }, {}, url); assert.equal(result.status, 401)
  await service('STAFF').handle({ method: 'POST' }, {}, url); assert.equal(result.status, 403)
  await service('CUSTOMER').handle({ method: 'GET' }, {}, url); assert.equal(result.status, 401)
  await service('ADMIN').handle({ method: 'POST', headers: { origin: 'https://evil.test', host: 'test' } }, {}, url); assert.equal(result.status, 403)
  console.log('PASS v704: calendar boundaries, inheritance, daily hours/holiday, validation, authorization and booking conflicts')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
