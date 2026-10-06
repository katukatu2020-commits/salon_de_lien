import assert from 'node:assert/strict'
const base = 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready')
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-bulk-booking-capacity'), 'v705')
assert.equal(ready.headers.get('x-lien-staff-work-calendar'), 'v704')
const asset = await fetch(base + '/tenant-setup-client.js?v=705-readonly-smoke')
assert.equal(asset.status, 200)
assert.ok((await asset.text()).includes('bulkCapacityMarkupV705'))
const shift = await fetch(base + '/_next/static/chunks/app/admin/appointments/page-checkout-shift-v700.capacity-v705.js')
assert.equal(shift.status, 200)
assert.ok((await shift.text()).includes('daily-capacity-v705'))
assert.equal((await fetch(base + '/api/lien-business-days?month=2026-10')).status, 401)
console.log('PASS production read-only v705: readiness, calendar bulk UI and endpoint authentication')
