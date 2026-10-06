import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready')
assert.equal(ready.status,200)
assert.equal(ready.headers.get('x-lien-checkout-menu'),'v701')
assert.equal(ready.headers.get('x-lien-checkout-shift'),'v700')
assert.equal(ready.headers.get('x-lien-dealer-order-flow'),'v698')
for (const [url,marker] of [['/appointment-datetime-v684.js','data-checkout-service-item'],['/staff-breaks-checkout-menu-client-v442.js','data-checkout-service-item'],['/checkout-menu-v701.css','checkout-service-row-v701']]) {
 const r=await fetch(base+url);assert.equal(r.status,200);assert.ok((await r.text()).includes(marker))
}
const menus=await fetch(base+'/api/admin/checkout-menus',{redirect:'manual'})
assert.ok([401,403,302,307].includes(menus.status))
const checkout=await fetch(base+'/admin/appointments/v701-smoke',{redirect:'manual'})
assert.ok([302,303,307].includes(checkout.status))
console.log('PASS production read-only v701: health, active editor copies, stylesheet, scoped menu API and checkout authentication')
