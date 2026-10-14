import assert from 'node:assert/strict'
const base = process.env.ORIMIA_SMOKE_URL || 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready', { cache: 'no-store' })
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('x-lien-hotpepper-menu-rows'), 'v711')
assert.equal(ready.headers.get('x-lien-hotpepper-menu-import'), 'v612')
assert.equal(ready.headers.get('x-lien-staff-work-shading'), 'v710')
const denied = await fetch(base + '/api/lien-hotpepper-menus-v612', { redirect: 'manual' })
assert.equal(denied.status, 401)
console.log('v711 production smoke PASS: release, existing menu import and unauthenticated access denied; no production data changed')
