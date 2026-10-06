import assert from 'node:assert/strict'
const base = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const health = await fetch(base + '/api/health/ready')
assert.equal(health.status, 200)
assert.equal(health.headers.get('x-lien-hotpepper-menu-restore'), 'v703')
assert.equal(health.headers.get('x-lien-staff-break-drag'), 'v702')
const asset = await fetch(base + '/hotpepper-menu-import-v703.js?v=703-1')
assert.equal(asset.status, 200)
assert.ok((await asset.text()).includes('data-hotpepper-menu-entry-v703'))
assert.equal((await fetch(base + '/hotpepper-menu-import-v703.css?v=703-1')).status, 200)
const unauthorized = await fetch(base + '/api/lien-hotpepper-menus-v612', { redirect: 'manual' })
assert.ok([401, 403, 302, 307].includes(unauthorized.status))
console.log('PASS production read-only v703: active client/CSS, readiness and import authentication')
