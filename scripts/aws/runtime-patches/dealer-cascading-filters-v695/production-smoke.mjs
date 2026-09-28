import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const health=await fetch(base+'/api/health/ready');assert.equal(health.status,200)
assert.equal(health.headers.get('x-lien-dealer-cascading-filters'),'v695')
assert.equal(health.headers.get('x-lien-flam-sales-export'),'v694')
const asset=await fetch(base+'/dealer-catalog-v695.js?v=695-1');assert.equal(asset.status,200)
assert.match(await asset.text(),/syncDealerFiltersV695/)
const api=await fetch(base+'/api/dealer/bootstrap?view=products');assert.equal(api.status,401)
console.log('v695 production read-only PASS: markers, catalog asset, anonymous catalog denied')
