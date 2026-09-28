import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const r=await fetch(base+'/api/health/ready');assert.equal(r.status,200);assert.equal(r.headers.get('x-lien-dealer-contact'),'v693');assert.equal(r.headers.get('x-lien-order-consolidation'),'v692')
for(const asset of ['salon-order-entry-v693.js','salon-order-entry-v693.css','inventory-orders-common-layout-v572.salon-orders-v693.js','dealer-sales-team-v693-client.js']){
 const response=await fetch(base+'/'+asset+'?v=693-1');assert.equal(response.status,200,asset);assert.ok((await response.text()).length>100,asset)
}
const contact=await fetch(base+'/api/admin/wholesale/dealer-contact?dealerId=probe');assert.equal(contact.status,401);assert.match(contact.headers.get('cache-control'),/no-store/)
console.log('v693 production read-only PASS: release markers, all immutable assets, unauthenticated contact rejected')
