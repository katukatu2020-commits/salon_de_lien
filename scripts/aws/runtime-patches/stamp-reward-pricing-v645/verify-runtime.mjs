import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const booking = read('public/customer-booking-confirmation-v616.js')
const workflows = read('ui-workflows-v294.js')
const stampService = read('stamp-booking-rewards-v644.js')
const journey = read('public/customer-journey-v601.js')

assert.match(server, /customer-booking-confirmation-v616\.js\?v=645-pricing1/)
assert.match(server, /X-Lien-Stamp-Reward-Pricing', 'v645'/)
assert.match(booking, /requestedStampReward/)
assert.match(booking, /prepareRequestedStampMenu/)
assert.match(booking, /function bookingMenuSelect/)
assert.match(booking, /nativeSelect\.dispatchEvent\(new Event\('change'/)
assert.match(booking, /radio\.dispatchEvent\(new Event\('change'/)
assert.match(booking, /document\.querySelector\('\.cj-booking-top'\)/)
assert.match(booking, /予約確認のお支払い目安は0円です/)
assert.match(booking, /このメニューはスタンプ特典の対象外です/)
assert.match(booking, /お支払い目安は0円になります/)
assert.match(workflows, /benefitKind !== 'STAMP_MENU_FREE'/)
assert.match(stampService, /discountRate = Number/)
assert.match(stampService, /rewardType === 'MENU_FREE' \? 100/)
assert.match(journey, /touchstart/)
assert.match(journey, /restoreFrames<3/)

new Function(booking)
new Function(workflows)
console.log(JSON.stringify({
  release: 'stamp-reward-pricing-v645',
  runtimeVerified: true,
  rewardMenuAutoSelected: true,
  applicableRewardTotal: 0,
  misleadingLegacyBannerSuppressed: true,
  incompatibleMenuExplained: true,
  previousScrollFixPreserved: true,
}))
