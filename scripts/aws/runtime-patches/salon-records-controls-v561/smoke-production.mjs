import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const commonHeaders = { 'Cache-Control':'no-cache', 'User-Agent':'ORIMIA-salon-records-controls-v561-smoke/1.0' }

const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v561`, { headers:commonHeaders, cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-salon-records-controls'), 'v561')
assert.equal(ready.headers.get('x-lien-customer-comment-layout'), 'v560')
assert.equal(ready.headers.get('x-lien-owner-shared-switch'), 'v550')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ ...commonHeaders, Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/owner-analytics?salesLedger=1' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const ownerCookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(ownerCookie, /^lien_admin_session=/)
const ownerHeaders = { ...commonHeaders, Cookie:ownerCookie, Accept:'application/json' }

const ledger = await fetch(`${baseUrl}/api/admin/sales-ledger?from=2025-01-01&to=2027-12-31`, { headers:ownerHeaders, cache:'no-store' })
assert.equal(ledger.status, 200)
const ledgerPayload = await ledger.json()
assert.ok(ledgerPayload.rows.length > 0, 'no sale fixture was available')
const customerId = ledgerPayload.rows.find(row => row.customerId)?.customerId
assert.ok(customerId, 'no customer id was available')

const charts = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(customerId)}/chart-photos?limit=1`, { headers:ownerHeaders, cache:'no-store' })
assert.equal(charts.status, 200)
const chartPayload = await charts.json()
assert.equal(chartPayload.ok, true)
assert.ok(Array.isArray(chartPayload.items))

const invalidUpload = await fetch(`${baseUrl}/api/admin/customers/${encodeURIComponent(customerId)}/chart-photos`, {
  method:'POST',
  headers:{ ...ownerHeaders, Origin:baseUrl, 'Content-Type':'text/plain' },
  body:'invalid-image-smoke',
})
assert.equal(invalidUpload.status, 415)

const fakeCancel = await fetch(`${baseUrl}/api/admin/sales-ledger/void`, {
  method:'POST',
  headers:{ ...ownerHeaders, Origin:baseUrl, 'Content-Type':'application/json' },
  body:JSON.stringify({ saleId:`smoke-missing-${Date.now()}`, reason:'smoke only', confirmed:true }),
})
assert.equal(fakeCancel.status, 404)

const ownerAttendance = await fetch(`${baseUrl}/api/admin/attendance?month=2026-09`, { headers:ownerHeaders, cache:'no-store' })
assert.equal(ownerAttendance.status, 200)
assert.equal((await ownerAttendance.json()).canEditRecords, true)

const switchResponse = await fetch(`${baseUrl}/api/admin/shared-account-switch`, {
  method:'POST',
  headers:{ ...ownerHeaders, Origin:baseUrl },
})
assert.equal(switchResponse.status, 200)
const sharedCookie = (switchResponse.headers.get('set-cookie') || '').split(';')[0]
assert.match(sharedCookie, /^lien_admin_session=/)
const sharedHeaders = { ...commonHeaders, Cookie:sharedCookie, Accept:'application/json' }

const sharedAttendance = await fetch(`${baseUrl}/api/admin/attendance?month=2026-09`, { headers:sharedHeaders, cache:'no-store' })
assert.equal(sharedAttendance.status, 200)
const sharedPayload = await sharedAttendance.json()
assert.equal(sharedPayload.canEditRecords, false)
assert.equal(sharedPayload.sharedStoreAccount, true)

const forgedEdit = await fetch(`${baseUrl}/api/admin/attendance`, {
  method:'POST',
  headers:{ ...sharedHeaders, Origin:baseUrl, 'Content-Type':'application/json' },
  body:JSON.stringify({ action:'save_record', staffKey:'smoke-forged' }),
})
assert.equal(forgedEdit.status, 403)

for (const asset of ['/commercial-admin-v101.js', '/sales-ledger-v318.js']) {
  const response = await fetch(`${baseUrl}${asset}?smoke=v561`, { headers:ownerHeaders, cache:'no-store' })
  assert.equal(response.status, 200, `${asset} returned ${response.status}`)
  assert.match(await response.text(), /salon-records-controls-v561/)
}

console.log(JSON.stringify({
  release:'salon-records-controls-v561',
  productionReady:true,
  chartRead:true,
  cancellationRouteProtected:true,
  sharedAttendanceReadOnly:true,
}))
