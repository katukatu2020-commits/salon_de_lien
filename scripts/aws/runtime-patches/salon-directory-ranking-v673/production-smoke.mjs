import assert from 'node:assert/strict'
const base = process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const health = await fetch(base + '/api/health/ready')
assert.equal(health.status,200)
for (const [header,value] of [['x-lien-salon-directory-ranking','v673'],['x-lien-salon-group-master','v672'],['x-lien-dealer-sales-team','v671'],['x-lien-orimia-store-directory','v670'],['x-lien-admin-chat-reply','v669']]) assert.equal(health.headers.get(header),value)
const api = await fetch(base + '/api/lien-customer-stores', {redirect:'manual'})
assert.equal(api.status,401)
assert.match(api.headers.get('cache-control'),/no-store/)
for (const route of ['/salon-directory-ranking-v673-client.js','/salon-directory-ranking-v673.css']) {
  const r = await fetch(base + route)
  assert.equal(r.status,200)
  assert.match(await r.text(),/orimia/)
}
console.log(JSON.stringify({ release:'salon-directory-ranking-v673',productionHealth:true,protectedDirectory:true,publicAssets:true }))
