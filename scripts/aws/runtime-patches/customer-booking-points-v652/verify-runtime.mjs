import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const mode = process.argv[2] || 'verify'

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8') }

if (mode === 'snapshot') {
  const server = read('server.js')
  const stamp = read('stamp-booking-rewards-v644.js')
  const workflows = read('ui-workflows-v294.js')
  assert.match(server, /X-Lien-Business-Application-Phone-Type', 'v651'/)
  assert.doesNotMatch(server, /X-Lien-Customer-Booking-Points', 'v652'/)
  assert.match(stamp, /require\('\.\/customer-booking-coupon-v616'\)/)
  assert.match(workflows, /window\.__lienCustomerBookingCouponV366/)
  assert.doesNotMatch(workflows, /window\.__lienBookingPointsV652/)
  console.log(JSON.stringify({ snapshot: true, parent: 'v651' }))
  process.exit(0)
}

const server = read('server.js')
const stamp = read('stamp-booking-rewards-v644.js')
const workflows = read('ui-workflows-v294.js')
const service = read('customer-booking-points-v652.js')
const client = read('public/customer-booking-points-v652.js')
const confirmation = read('public/customer-booking-confirmation-v616.js')

assert.match(server, /X-Lien-Customer-Booking-Points', 'v652'/)
assert.match(server, /customer-booking-points-v652\.js\?v=652-release1/)
assert.match(stamp, /require\('\.\/customer-booking-points-v652'\)/)
assert.match(workflows, /window\.__lienBookingPointsV652/)
assert.match(workflows, /pointsToUse: selectedPoints/)
assert.match(workflows, /pricing\.bookingApplied/)
assert.match(service, /CustomerBookingAdjustmentV652/)
assert.match(service, /appointment_booking/)
assert.match(service, /lien_release_booking_adjustment_v652/)
assert.match(client, /利用ポイント/)
assert.match(client, /お支払い目安/)
assert.match(confirmation, /クーポンを予約金額に適用します。/)
assert.doesNotMatch(confirmation, /クーポンは会計時に適用されます。/)

console.log(JSON.stringify({ verified: true, release: 'customer-booking-points-v652' }))
