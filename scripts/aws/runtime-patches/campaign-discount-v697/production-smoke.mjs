import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const health=await fetch(base+'/api/health/ready');assert.equal(health.status,200)
assert.equal(health.headers.get('x-lien-campaign-discount'),'v697')
assert.equal(health.headers.get('x-lien-dealer-calendar-day'),'v696')
for(const [file,pattern] of [['customer-journey-v697.js',/campaignDiscountRate/],['customer-booking-confirmation-v697.js',/campaign\.discount/],['customer-booking-points-v697.js',/quote\.campaign\.discount/]]){
  const r=await fetch(base+'/'+file+'?v=697');assert.equal(r.status,200);assert.match(await r.text(),pattern)
}
const api=await fetch(base+'/api/customer/campaign-booking?campaign=smoke');assert.equal(api.status,401)
console.log('v697 production read-only PASS: release markers, immutable assets, unauthenticated campaign access denied')
