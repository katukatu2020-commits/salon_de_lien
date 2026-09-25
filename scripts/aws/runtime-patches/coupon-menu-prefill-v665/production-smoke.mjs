import assert from 'node:assert/strict'

const base = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const health = await fetch(`${base}/api/health/ready?smoke=v665`, { cache: 'no-store' })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-coupon-menu-prefill'), 'v665')
assert.equal(health.headers.get('x-lien-chat-campaign-time'), 'v664')

const asset = await fetch(`${base}/customer-coupon-menu-prefill-v665.js?v=665-smoke`, { cache: 'no-store' })
assert.equal(asset.status, 200)
const source = await asset.text()
assert.match(source, /chooseCouponMenuOption/)
assert.match(source, /latestNext\.click\(\)/)

const context = await fetch(`${base}/api/lien-customer-booking-context?coupon=smoke-v665`, {
  cache: 'no-store',
  redirect: 'manual',
})
assert.equal(context.status, 401)

const booking = await fetch(`${base}/u/appointments?coupon=smoke-v665`, {
  cache: 'no-store',
  redirect: 'manual',
})
assert.ok([302, 303, 307, 308].includes(booking.status))

console.log(JSON.stringify({ release: 'coupon-menu-prefill-v665', productionSmokeVerified: true }))
