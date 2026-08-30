import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')
const ready = await fetch(`${baseUrl}/api/health/ready?smoke=v489`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-name-auto-merge'), 'v489')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/customers' }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const customers = await fetch(`${baseUrl}/admin/customers?smoke=v489`, { headers: { cookie, 'Cache-Control': 'no-cache' } })
assert.equal(customers.status, 200)
assert.match(await customers.text(), /顧客|Customer/)

const invalidManual = await fetch(`${baseUrl}/api/admin/appointments/manual`, {
  method: 'POST',
  headers: { cookie, Origin: baseUrl, 'Content-Type': 'application/json' },
  body: '{}',
})
assert.equal(invalidManual.status, 400)
const invalidPayload = await invalidManual.json()
assert.equal(typeof invalidPayload.error, 'string')

console.log('customer name auto merge v489 production smoke passed')
