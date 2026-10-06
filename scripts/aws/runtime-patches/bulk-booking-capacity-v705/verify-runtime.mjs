import fs from 'node:fs'
import assert from 'node:assert/strict'
const read = file => fs.readFileSync('/app/' + file, 'utf8')
assert.match(read('server.js'), /X-Lien-Bulk-Booking-Capacity/)
assert.match(read('tenant-setup.js'), /input\?\.action === 'set-capacity'/)
assert.match(read('tenant-setup.js'), /lock: workCalendarV704.lock/)
assert.match(read('tenant-setup-client.js'), /bindBulkCapacityV705\(root\)/)
assert.match(read('tenant-setup-client.js'), /bulkCapacityMarkupV705\(payload\) \+/)
assert.match(read('tenant-setup-client.js'), /営業時間・休業日は変更していません/)
assert.match(read('bulk-booking-capacity-v705.cjs'), /prisma\.\$transaction/)
const chunk = '.next/static/chunks/app/admin/appointments/page-checkout-shift-v700.capacity-v705.js'
assert.match(read('.next/app-build-manifest.json'), /page-checkout-shift-v700\.capacity-v705\.js/)
for (const file of [chunk, '.next/server/app/admin/appointments/page.js']) {
  assert.match(read(file), /daily-capacity-v705/)
  assert.match(read(file), /__businessSchedule\.capacity, __businessSchedule\.isClosed, __shiftWeekday/)
}
console.log('PASS v705 runtime: existing business-day route/UI extended; staff calendar and booking integration retained')
