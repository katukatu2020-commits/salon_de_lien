import assert from 'node:assert/strict'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com').replace(/\/$/, '')

const ready = await fetch(`${baseUrl}/api/health/ready`, { headers: { 'Cache-Control': 'no-cache' } })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-customer-registration-filter'), 'v496')
assert.equal(ready.headers.get('x-lien-attendance-history-editor'), 'v497')

const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  redirect: 'manual',
  headers: { Origin: baseUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'demo.owner', password: 'LienDemo2026!', next: '/admin/account?panel=attendance' }),
})
assert.equal(login.status, 303)
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
assert.match(cookie, /^[^=]+=/)

const page = await fetch(`${baseUrl}/admin/account?panel=attendance`, {
  headers: { cookie, Accept: 'text/html', 'Cache-Control': 'no-cache' },
})
assert.equal(page.status, 200)

const attendance = await fetch(`${baseUrl}/api/admin/attendance`, {
  headers: { cookie, Accept: 'application/json', 'Cache-Control': 'no-cache' },
})
assert.equal(attendance.status, 200)
const payload = await attendance.json()
assert.equal(payload.ok, true)
assert.equal(payload.canEditRecords, true)
assert.match(payload.month, /^20\d{2}-(0[1-9]|1[0-2])$/)
assert.ok(Array.isArray(payload.people))
assert.ok(Array.isArray(payload.records))
assert.ok(Array.isArray(payload.today))
for (const row of payload.today) {
  if (row.clockInAt && !row.clockOutAt) assert.ok(row.workDate, 'open shifts must expose their original work date')
}

console.log(JSON.stringify({ ready: ready.status, page: page.status, attendance: attendance.status, staff: payload.people.length, records: payload.records.length }))
