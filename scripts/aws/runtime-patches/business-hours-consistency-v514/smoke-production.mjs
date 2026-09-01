import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const headers = { 'Cache-Control': 'no-cache', 'User-Agent': 'ORIMIA-business-hours-v514-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v514`, { headers })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-business-hours-consistency'), 'v514')
assert.equal(ready.headers.get('x-lien-customer-global-profile-extended'), 'v513')
assert.equal(ready.headers.get('x-lien-public-brand-icon'), 'v511')

const tenantAsset = await fetch(`${baseUrl}/tenant-setup-client.js?smoke=v514`, { headers })
assert.equal(tenantAsset.status, 200)
const tenantSource = await tenantAsset.text()
assert.match(tenantSource, /シフト表・予約カレンダーへ戻る/)
assert.match(tenantSource, /business-hours-consistency-v514/)

const shiftAsset = await fetch(`${baseUrl}/_next/static/chunks/app/admin/appointments/page-shift-line-break-v461.js?smoke=v514`, { headers })
assert.equal(shiftAsset.status, 200)
const shiftSource = await shiftAsset.text()
assert.match(shiftSource, /\/api\/lien-business-days\?date=/)
assert.match(shiftSource, /business-hours-consistency-v514/)

console.log(JSON.stringify({ baseUrl, release: 'business-hours-consistency-v514', ready: true }, null, 2))
