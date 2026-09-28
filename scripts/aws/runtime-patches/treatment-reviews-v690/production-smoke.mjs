import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const health=await fetch(base+'/api/health/ready')
assert.equal(health.status,200)
for(const [header,version] of [['X-Lien-Treatment-Reviews','v690'],['X-Lien-Salon-Settings-Chat','v689'],['X-Lien-Dealer-Workspace','v688'],['X-Lien-Order-Amendment-Cutoff','v687'],['X-Lien-Partner-Chat','v682']])assert.equal(health.headers.get(header),version)
for(const [url,marker] of [['/treatment-reviews-v690.js','treatment-review-form'],['/treatment-reviews-v690.css','tr-staff-grid'],['/customer-experience-v503.js?v=690-treatment-reviews1',"['/u/staff', 'スタッフ紹介', 'profile']"],['/salon-chat-v689.js','__salonChatV689']]){
  const res=await fetch(base+url);assert.equal(res.status,200);assert.ok((await res.text()).includes(marker))
}
for(const route of ['/u/reviews','/u/staff','/u/reviews/treatment/unknown']){
  const res=await fetch(base+route,{redirect:'manual'});assert.equal(res.status,302);assert.equal(new URL(res.headers.get('location'),base).pathname,'/u/login')
}
for(const method of ['POST','PATCH','DELETE'])assert.equal((await fetch(base+'/api/customer/treatment-reviews',{method,headers:{'content-type':'application/json'},body:'{}'})).status,401)
console.log('v690 production read-only smoke PASS: readiness, new assets/navigation, customer authentication, previous releases retained')
