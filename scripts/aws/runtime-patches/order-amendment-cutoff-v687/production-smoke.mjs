import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
async function get(path){const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});return{status:r.status,headers:r.headers,text:await r.text()}}
const health=await get('/api/health/ready');assert.equal(health.status,200)
for(const [key,value]of [['X-Lien-Order-Amendment-Cutoff','v687'],['X-Lien-Salon-Order-Entry','v686'],['X-Lien-Campaign-Booking-Menu','v685'],['X-Lien-Appointment-Datetime-Recovery','v684'],['X-Lien-Partner-Chat','v682']])assert.equal(health.headers.get(key),value)
for(const [file,marker]of [['order-amendments-v687.js','order-cancel'],['dealer-order-entry-v687.js','data-order-edit-v687'],['salon-order-entry-v687.js','data-order-edit-v687'],['inventory-orders-common-layout-v572.salon-orders-v687.js','/salon-order-entry-v687.js']]){const r=await get('/'+file+'?v=687-1');assert.equal(r.status,200);assert.ok(r.text.includes(marker))}
assert.equal((await get('/order-amendments-v687.css?v=687-1')).status,200)
assert.equal((await get('/api/dealer/erp/order-cutoff')).status,401)
assert.equal((await get('/api/admin/wholesale/erp/order-amendment?dealer=none&id=none')).status,401)
console.log('v687 production read-only smoke PASS: release, assets, authenticated amendment/policy APIs')
