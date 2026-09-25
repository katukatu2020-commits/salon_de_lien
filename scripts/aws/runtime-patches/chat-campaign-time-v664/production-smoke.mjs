import assert from 'node:assert/strict'

const base = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const health = await fetch(`${base}/api/health/ready?smoke=v664`, { cache: 'no-store' })
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-chat-campaign-time'), 'v664')
assert.equal(health.headers.get('x-lien-appointment-datetime-editor'), 'v663')

const chat = await fetch(`${base}/api/lien-chat?audience=staff`, { cache: 'no-store' })
assert.equal(chat.status, 401)

const campaigns = await fetch(`${base}/admin/customers/messages/campaigns?smoke=v664`, {
  redirect: 'manual',
  cache: 'no-store',
})
assert.ok([302, 303].includes(campaigns.status))
assert.equal(campaigns.headers.get('location'), '/admin/login')

console.log(JSON.stringify({ release: 'chat-campaign-time-v664', productionSmokeVerified: true }))
