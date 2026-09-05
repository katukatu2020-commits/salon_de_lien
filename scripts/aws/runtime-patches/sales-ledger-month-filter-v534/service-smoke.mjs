import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const { monthValueInTokyo, monthRange, shiftMonth, monthLabel } = require(path.join(patchRoot, 'sales-ledger-month-filter-v534.js'))

assert.equal(monthValueInTokyo(new Date('2026-08-31T14:59:59.000Z')), '2026-08')
assert.equal(monthValueInTokyo(new Date('2026-08-31T15:00:00.000Z')), '2026-09')
assert.deepEqual(monthRange('2026-02'), { from: '2026-02-01', to: '2026-02-28' })
assert.deepEqual(monthRange('2024-02'), { from: '2024-02-01', to: '2024-02-29' })
assert.deepEqual(monthRange('2026-12'), { from: '2026-12-01', to: '2026-12-31' })
assert.equal(monthRange('2026-13'), null)
assert.equal(monthRange('2026/09'), null)
assert.equal(shiftMonth('2026-01', -1), '2025-12')
assert.equal(shiftMonth('2026-12', 1), '2027-01')
assert.equal(shiftMonth('invalid', 1), '')
assert.equal(monthLabel('2026-09'), '2026年9月')
assert.equal(monthLabel(''), 'カスタム期間')

console.log(JSON.stringify({ release: 'sales-ledger-month-filter-v534', monthCalculationsVerified: true }))
