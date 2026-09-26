import assert from 'node:assert/strict'
const base=process.env.VERIFY_BASE_URL||'https://salon-de-lien.com'
const ready=await fetch(base+'/api/health/ready')
assert.equal(ready.status,200)
assert.equal(ready.headers.get('x-lien-three-app-qa'),'v680')
assert.equal(ready.headers.get('x-lien-platform-usage-payments'),'v679')
assert.equal(ready.headers.get('x-lien-dealer-erp'),'v678')
for(const route of ['/u/login','/u/register','/admin/login','/dealer/login','/business']){
  const res=await fetch(base+route),html=await res.text()
  assert.equal(res.status,200,route)
  assert.ok(!html.includes('Application error:'),route)
  console.log(route+' OK')
}
for(const asset of ['/shell-consistency-v680.js?v=680','/customer-journey-v680.js?v=680','/content-edit-delete-client-v680.js?v=680','/coupon-email-delivery-v613.hydration-v680.js','/style-community-controls-v610.hydration-v680.js','/customer-registration-resend-v347.hydration-v680.js','/password-visibility-v627.hydration-v680.js','/inventory-orders-common-layout-v572.hydration-v680.js','/broadcast-recipient-modal.hydration-v680.js']){
  const res=await fetch(base+asset)
  assert.equal(res.status,200,asset)
  assert.ok((await res.text()).includes('orimia:hydrated-v680'),asset)
}
console.log('v680 production read-only smoke passed')
