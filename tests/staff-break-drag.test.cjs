const { test } = require('node:test')
const assert = require('node:assert/strict')
const { calculateBreakPreview: preview } = require('../scripts/aws/runtime-patches/staff-break-drag-v702/break-drag-model.cjs')
const base = { origin: { startMinutes: 720, durationMinutes: 60 }, openMinutes: 540, closeMinutes: 1200, workStartMinutes: 600, workEndMinutes: 1140 }
test('break move preserves length and snaps to fifteen minutes', () => {
 assert.deepEqual(preview({ ...base, mode: 'move', deltaMinutes: 33 }), { startMinutes: 750, durationMinutes: 60 })
 assert.deepEqual(preview({ ...base, mode: 'move', deltaMinutes: -300 }), { startMinutes: 600, durationMinutes: 60 })
 assert.deepEqual(preview({ ...base, mode: 'move', deltaMinutes: 900 }), { startMinutes: 1080, durationMinutes: 60 })
})
test('left edge changes start while keeping end fixed', () => {
 assert.deepEqual(preview({ ...base, mode: 'start', deltaMinutes: -30 }), { startMinutes: 690, durationMinutes: 90 })
 assert.deepEqual(preview({ ...base, mode: 'start', deltaMinutes: 100 }), { startMinutes: 765, durationMinutes: 15 })
})
test('right edge changes end while keeping start fixed', () => {
 assert.deepEqual(preview({ ...base, mode: 'end', deltaMinutes: 30 }), { startMinutes: 720, durationMinutes: 90 })
 assert.deepEqual(preview({ ...base, mode: 'end', deltaMinutes: -100 }), { startMinutes: 720, durationMinutes: 15 })
 assert.deepEqual(preview({ ...base, mode: 'end', deltaMinutes: 900 }), { startMinutes: 720, durationMinutes: 420 })
})
test('zero start time and maximum duration are respected', () => {
 const day = { ...base, openMinutes: 0, workStartMinutes: 0, closeMinutes: 1440, workEndMinutes: 1440, origin: { startMinutes: 0, durationMinutes: 60 } }
 assert.deepEqual(preview({ ...day, mode: 'end', deltaMinutes: 1000 }), { startMinutes: 0, durationMinutes: 720 })
 assert.deepEqual(preview({ ...day, mode: 'start', deltaMinutes: -100 }), { startMinutes: 0, durationMinutes: 60 })
})
test('invalid or too short target staff windows are not silently resized', () => {
 assert.equal(preview({ ...base, mode: 'move', deltaMinutes: 0, workEndMinutes: 630 }), null)
 assert.equal(preview({ ...base, mode: 'move', deltaMinutes: NaN }), null)
})
