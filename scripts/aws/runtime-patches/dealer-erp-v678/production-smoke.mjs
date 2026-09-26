import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready')
assert.equal(ready.status,200)
for (const [name,value] of [['X-Lien-Dealer-Erp','v678'],['X-Lien-Branch-Shared-Contact','v677'],['X-Lien-Style-Mobile-Stability','v676'],['X-Lien-Dealer-Sales-Team','v671']]) assert.equal(ready.headers.get(name),value,name)
for (const page of ['operations','inventory','fulfillment','receivables','activities','messages']) {
  const r=await fetch(base+'/dealer/'+page,{ redirect:'manual' })
  assert.ok([302,303].includes(r.status),page+': '+r.status)
  assert.match(r.headers.get('location'),/\/dealer\/login/)
}
for (const route of ['options','inventory','orders','receivables','payments','activities','threads','unread']) assert.equal((await fetch(base+'/api/dealer/erp/'+route,{ redirect:'manual' })).status,401,route)
for (const asset of ['dealer-erp-v678-client.js','dealer-erp-v678-nav.js','dealer-erp-v678.css']) {
  const r=await fetch(base+'/'+asset+'?v=1');assert.equal(r.status,200,asset);assert.ok((await r.text()).length>500)
}
const salon=await fetch(base+'/admin/dealer-messages?dealer=read-only-smoke',{ redirect:'manual' })
assert.ok([302,303].includes(salon.status))
assert.match(salon.headers.get('location'),/login/)
console.log('PASS: v678 readiness, assets, protected dealer and salon routes. No production account/order mutations.')
