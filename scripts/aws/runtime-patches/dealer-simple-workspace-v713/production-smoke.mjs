import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready')
assert.equal(ready.status,200)
assert.equal(ready.headers.get('x-lien-dealer-simple'),'v713')
assert.equal(ready.headers.get('x-lien-store-code-settings'),'v712')
for(const [asset,marker] of [['dealer-simple-v713.css','.dw-simple'],['dealer-orders-v713.js','dw-filter-count'],['dealer-catalog-v713.js','dw-salon-link'],['dealer-calendar-v713.js','月間目標を編集'],['dealer-erp-v713-client.js','売上内訳・目標の詳細'],['dealer-readonly-v713.js','dealerRole']]){
  const r=await fetch(base+'/'+asset)
  assert.equal(r.status,200,asset)
  assert((await r.text()).includes(marker),asset)
}
for(const route of ['orders','products','pricing','company','procurement','manufacturer-report','period-sales','password-change']){
  const r=await fetch(base+'/dealer/'+route,{redirect:'manual'})
  assert([302,303].includes(r.status),route)
  assert(r.headers.get('location').startsWith('/dealer/login'),route)
}
console.log('v713 production PASS: versioned assets, health and authenticated routes')
