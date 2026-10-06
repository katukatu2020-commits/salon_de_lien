import assert from 'node:assert/strict'
const base = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready')
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-staff-break-drag'), 'v702')
assert.equal(ready.headers.get('x-lien-checkout-menu'), 'v701')
assert.equal(ready.headers.get('x-lien-checkout-shift'), 'v700')
for (const file of ['/appointment-datetime-v684.js', '/staff-breaks-checkout-menu-client-v442.js']) {
  const response = await fetch(base + file)
  assert.equal(response.status, 200)
  const source = await response.text()
  assert.ok(source.includes('__lienStaffBreakDragV702'))
  assert.ok(source.includes('lien-break-edge-v702'))
  assert.ok(source.includes('data-checkout-service-item'))
}
const response = await fetch(base + '/api/admin/staff-breaks?date=2026-10-23', { redirect: 'manual' })
assert.ok([401, 403, 302, 307].includes(response.status))
console.log('PASS production read-only v702: health, both active controllers, preserved checkout, break API authentication')
