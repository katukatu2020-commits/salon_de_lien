const assert = require('node:assert/strict'), test = require('node:test')
const { workTimeShading } = require('./shading.cjs')
const { effectiveRows } = require('/app/staff-work-calendar-v704.cjs')
test('daily plans, policies and holidays drive shading without overlapping layers', () => {
  const row = { staffKey: 'staff', key: 'staff', workStartMinutes: 600, workEndMinutes: 1140, closedWeekdays: '3' }
  const plan = { policies: [{ staffKey: 'staff', plannedStart: '08:00', plannedEnd: '19:00' }], overrides: [{ staffKey: 'staff', date: '2026-10-07', isDayOff: false, startMinutes: 660, endMinutes: 840 }] }
  assert.deepEqual(workTimeShading(effectiveRows([row], '2026-10-07', plan)[0], 480, 1200), { before: 25, after: 50 })
  assert.deepEqual(workTimeShading(effectiveRows([row], '2026-10-08', plan)[0], 480, 1200), { before: 0, after: 60 / 720 * 100 })
  plan.overrides = []
  assert.deepEqual(workTimeShading(effectiveRows([row], '2026-10-07', plan)[0], 480, 1200), { before: 100, after: 0 })
})
test('bounded geometry and virtual free lane', () => {
  for (const [start, end] of [[0, 0], [NaN, 900], [900, 800], [300, 480], [1200, 1400]]) assert.deepEqual(workTimeShading({ workStartMinutes: start, workEndMinutes: end }, 480, 1200), { before: 100, after: 0 })
  assert.deepEqual(workTimeShading({ workStartMinutes: 420, workEndMinutes: 1300 }, 480, 1200), { before: 0, after: 0 })
  assert.deepEqual(workTimeShading({ key: 'free', workStartMinutes: 0, workEndMinutes: 0 }, 480, 1200), { before: 0, after: 0 })
  assert.deepEqual(workTimeShading({ key: 'free', workStartMinutes: 0, workEndMinutes: 0 }, 480, 1200, true), { before: 100, after: 0 })
})
