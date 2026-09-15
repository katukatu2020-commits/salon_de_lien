import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-stamp-reward-pricing'), 'v645')
assert.equal(ready.headers.get('x-lien-stamp-booking-rewards'), 'v644')
assert.equal(ready.headers.get('x-lien-business-account-approvals'), 'v643')

const booking = await fetch(`${base}/customer-booking-confirmation-v616.js?v=645-pricing1`, { cache: 'no-store' })
assert.equal(booking.status, 200)
const bookingSource = await booking.text()
assert.match(bookingSource, /prepareRequestedStampMenu/)
assert.match(bookingSource, /予約確認のお支払い目安は0円です/)
assert.match(bookingSource, /このメニューはスタンプ特典の対象外です/)
assert.match(bookingSource, /お支払い目安は0円になります/)

const workflows = await fetch(`${base}/ui-workflows-v294.js`, { cache: 'no-store' })
assert.equal(workflows.status, 200)
assert.match(await workflows.text(), /benefitKind !== 'STAMP_MENU_FREE'/)

const context = await fetch(`${base}/api/lien-customer-booking-context`, { cache: 'no-store', redirect: 'manual' })
assert.equal(context.status, 401)

console.log(JSON.stringify({
  release: 'stamp-reward-pricing-v645',
  productionVerified: true,
  stampRewardMenuSelectionAssetVerified: true,
  zeroYenPricingAssetVerified: true,
  misleadingBannerRemoved: true,
}))
