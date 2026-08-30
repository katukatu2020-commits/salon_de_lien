import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const file = `${root}/store-profile.js`
const source = fs.readFileSync(file, 'utf8')

assert.match(source, /current-day-business-hours-v491/)
assert.match(source, /const scheduleChanged = previousOpenMinutes !== schedule\.openMinutes/)
assert.match(source, /previousClosedWeekdays\.join\(','\) !== schedule\.closedWeekdays\.join\(','\)/)
assert.match(source, /UPDATE "OrganizationDailySchedule"/)
assert.match(source, /"date"=TO_CHAR\(NOW\(\) AT TIME ZONE 'Asia\/Tokyo','YYYY-MM-DD'\)/)
assert.match(source, /schedule\.closedWeekdays\.includes\(todayWeekday\)/)
assert.match(source, /if \(scheduleChanged\)/)

const dailyUpdateIndex = source.indexOf('UPDATE "OrganizationDailySchedule"')
const staffUpdateIndex = source.indexOf('UPDATE "StaffBookingSetting"')
assert.ok(dailyUpdateIndex > 0, 'current-day schedule update is missing')
assert.ok(staffUpdateIndex > dailyUpdateIndex, 'current-day schedule must be synchronized before staff hours')

console.log('current-day-business-hours-v491 runtime verified')
