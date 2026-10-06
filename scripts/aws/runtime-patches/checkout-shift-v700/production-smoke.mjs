import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready')
assert.equal(ready.status,200)
assert.equal(ready.headers.get('x-lien-checkout-shift'),'v700')
assert.equal(ready.headers.get('x-lien-dealer-order-flow'),'v698')
for(const [p,pattern] of [['/checkout-shift-v700.js',/history.replaceState/],['/receipt-pos-direct-v700.js',/Print job was not acknowledged/],['/_next/static/chunks/app/admin/appointments/page-checkout-shift-v700.js',/data-checkout-state/]]){
 const response=await fetch(base+p);assert.equal(response.status,200);assert.match(await response.text(),pattern)
}
const receipt=await fetch(base+'/admin/appointments/v700-smoke/receipt?autoPrint=1',{redirect:'manual'})
assert.ok([302,303,307].includes(receipt.status),'Receipt must still require login')
console.log('PASS production read-only: v700 health/assets, retained v698, receipt authentication')
