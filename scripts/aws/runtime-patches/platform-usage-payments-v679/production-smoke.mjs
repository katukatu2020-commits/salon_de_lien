import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const r=await fetch(base+'/api/health/ready');assert.equal(r.status,200)
for(const [header,value] of [['X-Lien-Platform-Usage-Payments','v679'],['X-Lien-Dealer-Erp','v678'],['X-Lien-Branch-Shared-Contact','v677']])assert.equal(r.headers.get(header),value,header)
for(const route of ['/platform/payments','/platform/payments/generate','/platform/payments/salon/read-only-smoke']){
  const page=await fetch(base+route,{redirect:'manual'});assert.equal(page.status,302);assert.equal(page.headers.get('location'),'/platform/login')
}
for(const route of ['/api/platform/usage-payments/generate','/api/platform/usage-payments/salon/read-only-smoke/profile'])assert.equal((await fetch(base+route,{redirect:'manual'})).status,401)
console.log('PASS: v679 readiness and operator-only payment routes; no live payment records changed')
