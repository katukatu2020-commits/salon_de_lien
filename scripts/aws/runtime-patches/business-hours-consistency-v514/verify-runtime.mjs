import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const server = read('server.js')
const tenantSetup = read('tenant-setup.js')
const tenantClient = read('tenant-setup-client.js')
const shiftServer = read('.next/server/app/admin/appointments/page.js')
const shiftClient = read('.next/static/chunks/app/admin/appointments/page-shift-line-break-v461.js')

assert.match(server, /X-Lien-Business-Hours-Consistency', 'v514'/)

assert.match(tenantSetup, /split\(','\)\.filter\(value => value\.trim\(\) !== ''\)\.map\(Number\)/)
assert.doesNotMatch(tenantSetup, /split\(','\)\.map\(Number\)\.filter\(day/)

assert.match(tenantClient, /class="ts-days-back"/)
assert.match(tenantClient, /シフト表・予約カレンダーへ戻る/)
assert.match(tenantClient, /const returnDate = month === todayInJapan\(\)\.slice\(0, 7\)/)
assert.match(tenantClient, /business-hours-consistency-v514/)

for (const [label, source, dateVariable] of [
  ['server', shiftServer, 'e'],
  ['client', shiftClient, 't'],
]) {
  assert.match(source, new RegExp(`/api/lien-business-days\\?date="\\+encodeURIComponent\\(${dateVariable}\\)`), `${label} shift must fetch the selected day`)
  assert.match(source, /isClosed:[a-z]\.isClosed===true/)
  assert.match(source, /!__businessSchedule\.isClosed/)
  assert.match(source, /closedWeekdays:\[\],isClosed:false,overridden:false/)
  assert.match(source, new RegExp(`\\},\\[${dateVariable}\\]\\);`), `${label} shift effect must refresh on date change`)
  assert.match(source, /business-hours-consistency-v514/)
}

assert.doesNotMatch(shiftServer, /\/api\/admin\/store-profile[^\n]+then\(__apply\)/)
assert.doesNotMatch(shiftClient, /\/api\/admin\/store-profile[^\n]+then\(__apply\)/)

console.log(JSON.stringify({ release: 'business-hours-consistency-v514', verified: true }))
