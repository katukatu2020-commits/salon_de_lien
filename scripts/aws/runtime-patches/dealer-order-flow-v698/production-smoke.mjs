import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const health=await fetch(base+'/api/health/ready');assert.equal(health.status,200)
assert.equal(health.headers.get('x-lien-dealer-order-flow'),'v698')
assert.equal(health.headers.get('x-lien-campaign-discount'),'v697')
for(const [file,pattern] of [['dealer-order-flow-v698/client.js',/メーカー発注・入荷/],['salon-order-entry-v698.js',/showDiscountRate===false/],['dealer-erp-v698-client.js',/actualComparison.previousYen/]]){
 const r=await fetch(base+'/'+file);assert.equal(r.status,200);assert.match(await r.text(),pattern)
}
for(const url of ['/api/dealer/flow/purchase.csv?id=smoke','/api/dealer/flow/manufacturer.csv','/api/dealer/erp/period-sales','/api/dealer/erp/procurement-preview'])assert.equal((await fetch(base+url,{redirect:'manual'})).status,401,url)
assert.equal((await fetch(base+'/dealer/procurement',{redirect:'manual'})).status,302)
console.log('v698 production read-only PASS: ready/version, immutable assets, unauthenticated procurement/report access denied')
