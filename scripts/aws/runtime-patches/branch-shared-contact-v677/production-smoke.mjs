import assert from 'node:assert/strict'
const base = 'https://salon-de-lien.com'
const ready = await fetch(base + '/api/health/ready')
assert.equal(ready.status, 200)
assert.equal(ready.headers.get('X-Lien-Branch-Shared-Contact'), 'v677')
assert.equal(ready.headers.get('X-Lien-Style-Mobile-Stability'), 'v676')
assert.equal(ready.headers.get('X-Lien-Salon-Branch-Inquiry'), 'v675')
const unauthenticated = await fetch(base + '/api/platform/inquiries/read-only-smoke/approve', { method: 'POST', redirect: 'manual', headers: { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' }, body: '' })
assert.equal(unauthenticated.status, 302)
assert.match(unauthenticated.headers.get('location'), /login/)
console.log('v677 readiness and unauthenticated approval guard passed; no account changes')
