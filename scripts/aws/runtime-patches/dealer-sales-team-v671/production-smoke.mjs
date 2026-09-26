import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL || 'https://salon-de-lien.com'
const health=await fetch(base+'/api/health/ready')
assert.equal(health.status,200)
assert.equal(health.headers.get('x-lien-dealer-sales-team'),'v671')
assert.equal(health.headers.get('x-lien-orimia-store-directory'),'v670')
assert.equal(health.headers.get('x-lien-admin-chat-reply'),'v669')
for(const path of ['/dealer/sales','/dealer/team','/dealer/targets']){
  const res=await fetch(base+path,{redirect:'manual'});assert.ok([302,303].includes(res.status));assert.match(res.headers.get('location'),/^\/dealer\/login/)
}
for(const path of ['/api/dealer/sales','/api/dealer/team/data','/api/dealer/team/options']) assert.equal((await fetch(base+path,{redirect:'manual'})).status,401)
for(const path of ['/dealer-sales-team-v671-client.js?v=671-2','/dealer-sales-team-v671.css?v=671-1']) assert.equal((await fetch(base+path)).status,200)
const client=await fetch(base+'/dealer-sales-team-v671-client.js?v=671-2')
assert.match(await client.text(),/button\.dataset\.passwordReset === state\.options\.viewer\.memberId/)
const login=await fetch(base+'/dealer/login')
assert.match(await login.text(),/所属先の管理者/)
console.log(JSON.stringify({ok:true,release:'dealer-sales-team-v671',productionHealth:true,publicAssets:true,protectedRoutes:true}))
