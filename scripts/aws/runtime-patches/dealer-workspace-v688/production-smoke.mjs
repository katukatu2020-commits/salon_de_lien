import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
async function get(path){const r=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});return{status:r.status,headers:r.headers,text:await r.text()}}
const health=await get('/api/health/ready');assert.equal(health.status,200)
for(const [key,value]of [['X-Lien-Dealer-Workspace','v688'],['X-Lien-Order-Amendment-Cutoff','v687'],['X-Lien-Salon-Order-Entry','v686'],['X-Lien-Campaign-Booking-Menu','v685'],['X-Lien-Partner-Chat','v682']])assert.equal(health.headers.get(key),value)
for(const [file,marker]of [['dealer-workspace-v688.js','dw-menu'],['dealer-workspace-v688.css','.dw-bottom'],['dealer-orders-v688.js','data-order-edit-v687'],['dealer-catalog-v688.js','renderDealerProductResults']]){const r=await get('/'+file+'?v=688-1');assert.equal(r.status,200);assert(r.text.includes(marker))}
for(const path of ['operations','orders','products','team','password-change']){const r=await get('/dealer/'+path);assert([302,303,307].includes(r.status),path);assert(!r.text.includes('dw-body'),'authenticated pages must not leak')}
assert.equal((await get('/api/dealer/erp/unread')).status,401)
console.log('v688 production read-only smoke PASS: release, immutable dealer assets, auth boundaries, previous release retained')
