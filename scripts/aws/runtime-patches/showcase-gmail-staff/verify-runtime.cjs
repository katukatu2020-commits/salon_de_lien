'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = process.env.RUNTIME_ROOT || '/app'
const { parseReservationMail } = require(path.join(root, 'tenant-setup.js'))

const named = parseReservationMail({
  subject: '【かんざし結】新規のご予約が確定しました',
  body: [
    '■お客様名',
    '田中 花子',
    '■来店日時',
    '2026年08月20日（木）13:30',
    '■ご指名',
    '指名なし',
    '■予約時担当スタイリスト名',
    '谷崎 太二',
    '■予約時メニュー',
    'カット + カラー',
  ].join('\n'),
})
assert.equal(named.ok, true)
assert.equal(named.value.staffName, '谷崎 太二')

const free = parseReservationMail({
  subject: '【かんざし結】新規のご予約が確定しました',
  body: [
    '■お客様名',
    '佐藤 花子',
    '■来店日時',
    '2026年08月21日（金）10:00',
    '■担当スタッフ',
    '指名なし',
    '■予約時メニュー',
    'カット',
  ].join('\n'),
})
assert.equal(free.ok, true)
const tenantRuntime = fs.readFileSync(path.join(root, 'tenant-setup.js'), 'utf8')
assert.match(tenantRuntime, /imported:staff-parser-v3/)
assert.match(tenantRuntime, /ignored:staff-parser-v3/)
assert.equal(free.value.staffName, 'フリー')

const appointmentsPage = fs.readFileSync(
  path.join(root, '.next/server/app/admin/appointments/page.js'),
  'utf8',
)
assert.match(appointmentsPage, /G\.some\(\(entry\) => entry\.name === t\)/)
assert.match(appointmentsPage, /key: w\.jb\.key/)

console.log(JSON.stringify({
  verified: true,
  namedStaff: named.value.staffName,
  freeStaff: free.value.staffName,
  tenantShiftStaff: true,
}))
