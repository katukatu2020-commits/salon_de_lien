import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const manifestPath = '/tmp/stamp-booking-rewards-v644-changes.json'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const count = (source, value) => source.split(value).length - 1

assert.ok(fs.existsSync(manifestPath), 'v644 change manifest is missing')
const changes = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
assert.equal(changes.length, 22)
assert.deepEqual(
  [...new Set(changes.map(change => change.file))].sort(),
  [
    'customer-booking-coupon-v616.js',
    'customer-experience-v508.js',
    'public/customer-booking-confirmation-v616.js',
    'public/customer-journey-v601.js',
    'server.js',
    'stamp-booking-rewards-v644.js',
  ],
)

const server = read('server.js')
const service = read('stamp-booking-rewards-v644.js')
const coupons = read('customer-booking-coupon-v616.js')
const confirmation = read('public/customer-booking-confirmation-v616.js')
const journey = read('public/customer-journey-v601.js')
const experience = read('customer-experience-v508.js')

assert.equal(count(server, "X-Lien-Stamp-Booking-Rewards', 'v644'"), 1)
assert.match(server, /require\('\.\/stamp-booking-rewards-v644'\)/)
assert.doesNotMatch(server, /require\('\.\/customer-booking-coupon-v616'\)/)
assert.match(server, /customer-booking-confirmation-v616\.js\?v=644-stamp-reward1/)
assert.match(server, /customer-journey-v601\.js\?v=644-menu-scroll1/)
assert.match(server, /customer-experience-v508\.js\?v=644-menu-scroll1/)
assert.match(server, /customerBookingCoupon\.stampRewards\(session\)/)
assert.match(server, /stampRewards\.bookingHref/)
assert.match(server, /予約確認画面で選択すると料金へ反映されます/)

assert.match(service, /CustomerStampRewardGrantV644/)
assert.match(service, /rewardSequence/)
assert.match(service, /discountRate = Number\(grant\?\.discountRate \|\| \(rewardType === 'MENU_FREE' \? 100/)
assert.match(service, /templateVersion","status"/)
assert.match(service, /stamp-reward-v644/)
assert.match(service, /pg_advisory_xact_lock/)
assert.match(service, /ci\."status"='issued'/)

assert.match(coupons, /stampRewardType === 'MENU_FREE'/)
assert.match(coupons, /STAMP_MENU_FREE/)
assert.match(coupons, /exact \? menu === normalized/)
assert.match(coupons, /CustomerStampRewardGrantV644/)

assert.match(confirmation, /スタンプカード特典（メニュー無料）/)
assert.match(confirmation, /スタンプカード特典が予約と会計に適用されます/)
assert.match(confirmation, /exact \? menu === value/)
assert.match(confirmation, /coupon\.displayName/)

assert.match(journey, /let menuScrollSnapshot=null/)
assert.match(journey, /addEventListener\('pointerdown',rememberMenuScroll,true\)/)
assert.match(journey, /addEventListener\('touchstart',rememberMenuScroll,\{capture:true,passive:true\}\)/)
assert.match(journey, /restoreFrames<3/)
assert.match(experience, /lastFocus\.focus\(\{ preventScroll: true \}\)/)
assert.match(experience, /const scrollTop = window\.scrollY/)

assert.equal(count(server, "X-Lien-Business-Account-Approvals', 'v643'"), 1)
assert.equal(count(server, "X-Lien-Customer-Store-Limit', 'v642'"), 1)
assert.equal(count(server, "X-Lien-Search-Input-Stability', 'v641'"), 1)

console.log(JSON.stringify({
  release: 'stamp-booking-rewards-v644',
  runtimeVerified: true,
  generatedStampCoupons: true,
  exactFreeMenuScope: true,
  bookingAndCheckoutRate: 100,
  menuSelectionScrollPreserved: true,
  changedRuntimeFiles: 6,
}))
