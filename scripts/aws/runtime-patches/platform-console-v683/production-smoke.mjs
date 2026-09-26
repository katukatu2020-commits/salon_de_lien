import assert from 'node:assert/strict'
const base=process.env.VERIFY_BASE_URL||'https://salon-de-lien.com'
const r=await fetch(base+'/api/health/ready')
assert.equal(r.status,200)
for(const [key,value] of [['x-lien-platform-console','v683'],['x-lien-partner-chat','v682'],['x-lien-platform-usage-payments','v679'],['x-lien-three-app-qa','v680']])assert.equal(r.headers.get(key),value)
for(const url of ['/platform','/platform/businesses','/platform/businesses/salon/unknown','/platform/inquiries','/platform/payments','/platform/customers']) {
  const response=await fetch(base+url,{redirect:'manual'})
  assert.equal(response.status,302,url)
  assert.equal(response.headers.get('location'),'/platform/login')
}
const login=await fetch(base+'/platform/login')
assert.equal(login.status,200)
assert.ok((await login.text()).includes('.ops-business-table'))
const logo=await fetch(base+'/brand/orimia-icon-192.png')
assert.equal(logo.status,200)
console.log('PASS v683 production read-only: release markers, protected operator routes, shared console assets')
