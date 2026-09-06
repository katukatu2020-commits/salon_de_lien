import assert from 'node:assert/strict'

const baseUrl = String(process.env.VERIFY_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${baseUrl}/api/health/ready?verify=v565-${Date.now()}`, { cache:'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-appointment-history'), 'v565')
assert.equal(ready.headers.get('x-lien-customer-chart-attachments'), 'v564')
assert.equal(ready.headers.get('x-lien-daily-sales-print-fit'), 'v563')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method:'POST',
  redirect:'manual',
  headers:{ Origin:baseUrl, 'Content-Type':'application/x-www-form-urlencoded' },
  body:new URLSearchParams({ email:'demo.owner', password:'LienDemo2026!', next:'/admin/customers' }),
})
assert.ok([302, 303].includes(login.status), `owner login failed: ${login.status}`)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^lien_admin_session=/)

const missing = await fetch(`${baseUrl}/api/admin/customers/v565-read-only-smoke/visit-history`, {
  headers:{ Cookie:cookie, Accept:'application/json', 'Cache-Control':'no-cache' },
})
assert.equal(missing.status, 404)
const missingPayload = await missing.json()
assert.match(missingPayload.error, /顧客カルテ/)

const unauthorized = await fetch(`${baseUrl}/api/admin/customers/v565-read-only-smoke/visit-history`)
assert.equal(unauthorized.status, 401)

const client = await fetch(`${baseUrl}/commercial-admin-v136.js?verify=v565-${Date.now()}`, { cache:'no-store' })
assert.equal(client.status, 200)
const clientSource = await client.text()
assert.match(clientSource, /__lienCustomerAppointmentHistoryV565/)
assert.match(clientSource, /現在の予約/)
assert.match(clientSource, /施術メモ/)

console.log(JSON.stringify({ release:'customer-appointment-history-memos-v565', production:true, readOnly:true }))
