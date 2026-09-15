import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-stamp-booking-rewards'), 'v644')
assert.equal(ready.headers.get('x-lien-business-account-approvals'), 'v643')
assert.equal(ready.headers.get('x-lien-customer-store-limit'), 'v642')

const confirmation = await fetch(`${base}/customer-booking-confirmation-v616.js?v=644-stamp-reward1`, { cache: 'no-store' })
assert.equal(confirmation.status, 200)
const confirmationSource = await confirmation.text()
assert.match(confirmationSource, /STAMP_MENU_FREE/)
assert.match(confirmationSource, /スタンプカード特典（メニュー無料）/)
assert.match(confirmationSource, /スタンプカード特典が予約と会計に適用されます/)

const journey = await fetch(`${base}/customer-journey-v601.js?v=644-menu-scroll1`, { cache: 'no-store' })
assert.equal(journey.status, 200)
const journeySource = await journey.text()
assert.match(journeySource, /let menuScrollSnapshot=null/)
assert.match(journeySource, /addEventListener\('pointerdown',rememberMenuScroll,true\)/)
assert.match(journeySource, /addEventListener\('touchstart',rememberMenuScroll,\{capture:true,passive:true\}\)/)
assert.match(journeySource, /restoreFrames<3/)

const context = await fetch(`${base}/api/lien-customer-booking-context`, { cache: 'no-store', redirect: 'manual' })
assert.equal(context.status, 401)
const stamps = await fetch(`${base}/u/stamps`, { cache: 'no-store', redirect: 'manual' })
assert.equal(stamps.status, 302)
assert.equal(stamps.headers.get('location'), '/u/login')

console.log(JSON.stringify({
  release: 'stamp-booking-rewards-v644',
  productionVerified: true,
  stampRewardAssetVerified: true,
  menuScrollAssetVerified: true,
  customerRoutesProtected: true,
}))
