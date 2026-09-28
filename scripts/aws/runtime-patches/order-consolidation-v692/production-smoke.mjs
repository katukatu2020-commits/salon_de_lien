import assert from 'node:assert/strict'
const base='https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready',{signal:AbortSignal.timeout(30000)})
assert.equal(ready.status,200);assert.equal(ready.headers.get('x-lien-order-consolidation'),'v692')
for(const [asset,marker]of [['salon-order-entry-v692.js','order-quote'],['order-amendments-v692.js','shipping-policy'],['dealer-orders-v692.js','発注の締切・送料設定'],['order-consolidation-v692.css','grid-template-columns'],['salon-order-entry-v692.css','oc-breakdown'],['inventory-orders-common-layout-v572.salon-orders-v692.js','salon-order-entry-v692.js']]){
 const r=await fetch(base+'/'+asset+'?v=692-1',{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,asset);assert.ok((await r.text()).includes(marker),asset)
}
const denied=await fetch(base+'/api/dealer/erp/shipping-policy',{signal:AbortSignal.timeout(30000)})
assert.equal(denied.status,401)
console.log('v692 production read-only smoke PASS')
