'use strict'
const assert = require('node:assert/strict')
const { selection, authorize, peakForDate, save } = require('./capacity.cjs')
const input = { from: '2026-10-01', to: '2026-10-31', weekdays: [0,1,2,3,4,5,6], capacity: 3 }
assert.equal(selection(input).dates.length, 31)
assert.deepEqual(selection({ ...input, weekdays: [1] }).dates, ['2026-10-05','2026-10-12','2026-10-19','2026-10-26'])
assert.equal(selection({ ...input, from: '2028-02-28', to: '2028-03-01' }).dates.length, 3)
assert.equal(selection({ ...input, from: '2026-12-31', to: '2027-01-01' }).dates.length, 2)
for (const invalid of [{ from: '2026-02-30' }, { to: '2026-09-30' }, { to: '2027-11-01' }, { weekdays: [] }, { weekdays: [7] }, { weekdays: [1,1] }, { capacity: 0 }, { capacity: 100 }, { capacity: 1.5 }, { capacity: '3' }]) assert.throws(() => selection({ ...input, ...invalid }))
assert.throws(() => selection({ ...input, to: input.from, weekdays: [1] }))
const session = { organizationId: 'org-a', userId: 'admin-a', role: 'ADMIN' }
const req = { headers: { host: 'salon.test', origin: 'https://salon.test' } }
authorize(session, req)
assert.throws(() => authorize({ ...session, role: 'STAFF' }, req), { status: 403 })
assert.throws(() => authorize(session, { headers: { ...req.headers, origin: 'https://other.test' } }), { status: 403 })
assert.throws(() => authorize(session, { headers: { host: 'salon.test' } }), { status: 403 })
const booking = (time, durationMinutes = 60) => ({ scheduledAt: '2026-10-01T' + time + ':00+09:00', durationMinutes })
assert.equal(peakForDate('2026-10-01', [booking('10:00'), booking('11:00')]), 1)
assert.equal(peakForDate('2026-10-01', [booking('10:00'), booking('10:30')]), 2)
assert.equal(peakForDate('2026-10-02', [booking('23:30', 90)]), 1)
async function run() {
  let writes = [], locks = [], appointments = []
  const db = {
    $queryRawUnsafe: async (sql, org) => { assert.equal(org, 'org-a'); return sql.includes('FROM "Appointment"') ? appointments : [{ date: '2026-10-01', isClosed: true, openMinutes: 660, closeMinutes: 900, capacity: 5 }] },
    $executeRawUnsafe: async (sql, ...params) => { writes.push({ sql, params }) },
  }
  const prisma = { $transaction: async callback => callback(db) }
  const options = { prisma, session, req, input: { ...input, to: '2026-10-02', capacity: 2 },
    businessSchedule: async () => ({ isClosed: false, openMinutes: 600, closeMinutes: 1140 }), defaultDailyCapacity: async () => 5,
    scheduleForDate: (base, override, date, capacity) => override || { ...base, capacity }, lock: async (database, org, date) => { assert.equal(database, db); assert.equal(org, 'org-a'); locks.push(date) },
  }
  const result = await save(options)
  assert.equal(result.count, 2)
  assert.deepEqual(locks, ['2026-10-01','2026-10-02'])
  assert.deepEqual(writes[0].params, ['org-a','2026-10-01',true,660,900,2,'admin-a'])
  assert.deepEqual(writes[1].params, ['org-a','2026-10-02',false,600,1140,2,'admin-a'])
  assert.doesNotMatch(writes[0].sql.split('DO UPDATE SET')[1], /"isClosed"=|"openMinutes"=|"closeMinutes"=/)
  writes = []; appointments = [booking('10:00'), booking('10:15'), booking('10:30')]
  await assert.rejects(save(options), { status: 409 })
  assert.equal(writes.length, 0, 'All dates are checked before the first write')
  await assert.rejects(save({ ...options, session: { ...session, role: 'STAFF' } }), { status: 403 })
  console.log('PASS v705: ranges/weekdays/leap dates, validation, owner/origin, tenant scope, peak conflicts, atomic preflight and hours/holiday preservation')
}
run().catch(error => { console.error(error); process.exitCode = 1 })
