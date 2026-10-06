import assert from 'node:assert/strict'
const base = 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready')
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-staff-work-calendar'), 'v704')
assert.equal(ready.headers.get('x-lien-hotpepper-menu-restore'), 'v703')
const asset = await fetch(base + '/commercial-admin-v136.js?v=704-readonly-smoke')
assert.equal(asset.status, 200)
assert.ok((await asset.text()).includes('work-calendar-v704'))
assert.equal((await fetch(base + '/api/admin/staff-work-calendar')).status, 401)
console.log('PASS production read-only v704: readiness, attendance calendar asset and endpoint authentication')
