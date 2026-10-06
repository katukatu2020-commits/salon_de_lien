import assert from 'node:assert/strict'
const base=process.env.ORIMIA_SMOKE_URL||'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready',{cache:'no-store'})
assert.equal(ready.status,200);assert.equal(ready.headers.get('x-lien-dealer-product-master'),'v709');assert.equal(ready.headers.get('x-lien-private-treatment-comments'),'v708')
const asset=await fetch(base+'/dealer-product-master-v709.js',{cache:'no-store'})
assert.equal(asset.status,200);assert.match(await asset.text(),/\/api\/dealer\/product-master/)
for(const method of ['GET','POST']){
  const r=await fetch(base+'/api/dealer/product-master',{method,headers:{Origin:base,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify({products:[]})}:{})});assert.equal(r.status,401)
}
const page=await fetch(base+'/dealer/products/master',{redirect:'manual'});assert.equal(page.status,302);assert.match(page.headers.get('location'),/^\/dealer\/login/)
console.log('v709 production smoke PASS: release, assets, login redirect and unauthenticated read/write denial; no production products modified')
