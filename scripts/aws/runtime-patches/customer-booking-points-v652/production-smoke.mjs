import assert from 'node:assert/strict'

const base = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${base}/api/health/ready`, { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-booking-points'), 'v652')
assert.equal(ready.headers.get('x-lien-business-application-phone-type'), 'v651')
assert.equal(ready.headers.get('x-lien-stamp-booking-rewards'), 'v644')

const pointsAsset = await fetch(`${base}/customer-booking-points-v652.js?v=652-release1`, { cache: 'no-store' })
assert.equal(pointsAsset.status, 200)
const pointsSource = await pointsAsset.text()
assert.match(pointsSource, /利用ポイント/)
assert.match(pointsSource, /お支払い目安/)
assert.match(pointsSource, /__lienBookingPointsV652/)

const confirmation = await fetch(`${base}/customer-booking-confirmation-v616.js?v=645-pricing1`, { cache: 'no-store' })
assert.equal(confirmation.status, 200)
const confirmationSource = await confirmation.text()
assert.match(confirmationSource, /クーポンを予約金額に適用します。/)
assert.doesNotMatch(confirmationSource, /クーポンは会計時に適用されます。/)

const workflow = await fetch(`${base}/ui-workflows-v294.js`, { cache: 'no-store' })
assert.equal(workflow.status, 200)
const workflowSource = await workflow.text()
assert.match(workflowSource, /pointsToUse: selectedPoints/)
assert.match(workflowSource, /pricing\.bookingApplied/)

const protectedContext = await fetch(`${base}/api/lien-customer-booking-context`, { cache: 'no-store', redirect: 'manual' })
assert.equal(protectedContext.status, 401)

console.log(JSON.stringify({
  release: 'customer-booking-points-v652',
  productionVerified: true,
  pointsAssetVerified: true,
  serverAuthoritativeLinkVerified: true,
  customerContextProtected: true,
}))
