import assert from 'node:assert/strict'
const base = process.env.ORIMIA_SMOKE_URL || 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready', { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-campaign-coupon-confirm'), 'v706')
for (const marker of ['x-lien-bulk-booking-capacity','x-lien-staff-work-calendar','x-lien-dealer-order-flow']) assert.ok(ready.headers.get(marker))
const asset = await fetch(base + '/customer-link-ui-v293.js?v=706-campaign-coupon1', { cache: 'no-store' })
assert.equal(asset.status, 200)
const code = await asset.text()
assert.match(code, /cropCampaignImageV706/)
assert.match(code, /broadcast-confirm-v706/)
assert.match(code, /form.requestSubmit\(submitter\)/)
const preview = await fetch(base + '/api/admin/broadcast-preview', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: '{"entries":[]}' })
assert.equal(preview.status, 401)
for (const route of ['/admin/customers/messages', '/admin/customers/messages/campaigns']) {
  const response = await fetch(base + route, { redirect: 'manual' })
  assert.ok([302,303,307].includes(response.status), route + ' remains authenticated')
}
console.log('v706 production read-only smoke PASS: image editor, coupon confirmation asset, health and authentication.')
