import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready')
assert.equal(ready.status,200)
assert.equal(ready.headers.get('x-lien-dealer-salon-picker'),'v714')
assert.equal(ready.headers.get('x-lien-dealer-simple'),'v713')
for(const [asset,marker] of [['dealer-salon-picker-v714.css','.dsp-dialog'],['dealer-salon-picker-v714.js','契約美容室を選択'],['dealer-catalog-v714.js','data-dealer-salon-picker'],['dealer-erp-v714-client.js','data-dealer-salon-picker'],['dealer-sales-team-v714-client.js','data-dealer-salon-picker']]){
  const r=await fetch(base+'/'+asset)
  assert.equal(r.status,200,asset);assert((await r.text()).includes(marker),asset)
}
for(const route of ['operations','fulfillment','receivables','sales','targets','pricing','activities']){
  const r=await fetch(base+'/dealer/'+route,{redirect:'manual'})
  assert([302,303].includes(r.status),route);assert(r.headers.get('location').startsWith('/dealer/login'))
}
console.log('v714 production PASS: versioned assets, health and protected dealer routes')
