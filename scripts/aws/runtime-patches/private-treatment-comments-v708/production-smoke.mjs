import assert from 'node:assert/strict'
const base=process.env.ORIMIA_SMOKE_URL||'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready',{cache:'no-store'})
assert.equal(ready.status,200)
assert.equal(ready.headers.get('x-lien-private-treatment-comments'),'v708')
assert.equal(ready.headers.get('x-lien-customer-kana-search'),'v707')
assert.equal(ready.headers.get('x-lien-campaign-coupon-confirm'),'v706')
const client=await fetch(base+'/commercial-admin-v136.js?v=708-private-treatment-comments',{cache:'no-store'})
assert.equal(client.status,200)
const text=await client.text()
assert.match(text,/const section = historySection\(customerId\)/)
assert.match(text,/byId.get\(card.dataset.historyRecordId\)/)
assert.match(text,/スタッフコメント（顧客非公開）/)
for(const method of ['GET','PUT']){
  const response=await fetch(base+'/api/admin/customers/qa-read-only-probe/visit-history'+(method==='PUT'?'/memo':''),{method,headers:{Origin:base,'Content-Type':'application/json'},...(method==='PUT'?{body:JSON.stringify({subjectKey:'VISIT:qa-read-only-probe',body:''})}:{})})
  assert.equal(response.status,401)
}
console.log('v708 production smoke PASS: release, comments client and unauthenticated read/write denial; no production records changed')
