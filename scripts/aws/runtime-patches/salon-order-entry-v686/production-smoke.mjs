import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
async function get(path){const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});return{status:r.status,headers:r.headers,text:await r.text()}}
const health=await get('/api/health/ready');assert.equal(health.status,200)
for(const [key,value]of [['X-Lien-Salon-Order-Entry','v686'],['X-Lien-Campaign-Booking-Menu','v685'],['X-Lien-Appointment-Datetime-Recovery','v684'],['X-Lien-Partner-Chat','v682']])assert.equal(health.headers.get(key),value)
const client=await get('/salon-order-entry-v686.js?v=686-1');assert.equal(client.status,200)
for(const marker of ['orderPageProductsV686','updateOrderQuantityV686','selected-products-filter','bootstrap?dealerId=all'])assert.ok(client.text.includes(marker))
assert.equal((await get('/salon-order-entry-v686.css?v=686-1')).status,200)
const shell=await get('/inventory-orders-common-layout-v572.salon-orders-v686.js?v=686-1');assert.equal(shell.status,200);assert.ok(shell.text.includes('/salon-order-entry-v686.js'))
assert.equal((await get('/api/admin/wholesale/bootstrap?dealerId=all')).status,401)
console.log('v686 production read-only smoke PASS: version, new client/shell/CSS and authenticated catalog')
