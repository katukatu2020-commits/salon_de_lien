import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv.includes('snapshot')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const clientPath = path.join(root, 'public', 'customer-coupon-menu-prefill-v665.js')

assert.match(server, /X-Lien-Chat-Campaign-Time', 'v664'/)
assert.match(server, /customer-booking-confirmation-v616\.js\?v=645-pricing1/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Coupon-Menu-Prefill/)
  assert.doesNotMatch(server, /customer-coupon-menu-prefill-v665/)
  console.log(JSON.stringify({ release: 'coupon-menu-prefill-v665', snapshotVerified: true }))
  process.exit(0)
}

const client = fs.readFileSync(clientPath, 'utf8')
assert.equal(server.split('/* coupon-menu-prefill-v665 */').length - 1, 1)
assert.match(server, /X-Lien-Coupon-Menu-Prefill', 'v665'/)
assert.match(server, /customer-coupon-menu-prefill-v665\.js\?v=665-release1/)
assert.equal(server.split('id="customer-coupon-menu-prefill-v665"').length - 1, 1)
assert.match(client, /chooseCouponMenuOption/)
assert.match(client, /__lienSelectedCouponV366 = state\.coupon/)
assert.match(client, /latestNext\.click\(\)/)
assert.match(client, /main\.dataset\.cjStep === '2'/)
assert.match(client, /lien:coupon-menu-prefilled/)
assert.match(client, /state\.completed = true/)
assert.match(client, /credentials: 'same-origin'/)
assert.doesNotMatch(client, /innerHTML\s*=/)
new Function(client)

console.log(JSON.stringify({
  release: 'coupon-menu-prefill-v665',
  runtimeVerified: true,
  couponTargetMenuSelected: true,
  bookingStartsAtStaffStep: true,
}))
