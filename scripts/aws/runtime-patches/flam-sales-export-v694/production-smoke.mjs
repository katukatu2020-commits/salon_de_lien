import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const r=await fetch(base+'/api/health/ready');assert.equal(r.status,200)
assert.equal(r.headers.get('x-lien-flam-sales-export'),'v694');assert.equal(r.headers.get('x-lien-dealer-contact'),'v693')
for(const asset of ['dealer-sales-team-v694-client.js','flam-sales-export-v694.css']){
 const response=await fetch(base+'/'+asset+'?v=694-1');assert.equal(response.status,200,asset);assert.ok((await response.text()).length>100,asset)
}
for(const route of ['flam-preview','flam-export.xlsx']){
 const response=await fetch(base+'/api/dealer/erp/'+route+'?month=2026-09');assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/no-store/)
}
console.log('v694 production read-only PASS: release markers, immutable assets, anonymous preview/export rejected')
