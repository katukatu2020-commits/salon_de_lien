import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const health=await fetch(base+'/api/health/ready')
assert.equal(health.status,200)
for(const [header,version] of [['X-Lien-Salon-Settings-Chat','v689'],['X-Lien-Dealer-Workspace','v688'],['X-Lien-Order-Amendment-Cutoff','v687'],['X-Lien-Partner-Chat','v682']])assert.equal(health.headers.get(header),version)
for(const [url,marker] of [['/salon-chat-v689.js','__salonChatV689'],['/salon-settings-chat-v689.css','settings-readonly'],['/line-settings-client-v689.js','data-salon-settings-readonly-v689']]){
  const res=await fetch(base+url);assert.equal(res.status,200);assert.ok((await res.text()).includes(marker))
}
for(const route of ['/admin/settings','/admin/account','/admin/customers/messages/chat']){
  let next=base+route,reachedLogin=false
  for(let attempt=0;attempt<4;attempt++){
    const res=await fetch(next,{redirect:'manual'})
    assert.ok([302,303,307,308].includes(res.status),route+': '+res.status)
    const destination=new URL(res.headers.get('location'),next)
    assert.equal(destination.origin,new URL(base).origin)
    if(destination.pathname==='/admin/login'){reachedLogin=true;break}
    next=destination.href
  }
  assert.ok(reachedLogin,route)
}
console.log('v689 production read-only smoke PASS: readiness, assets, auth boundaries, previous releases retained')
