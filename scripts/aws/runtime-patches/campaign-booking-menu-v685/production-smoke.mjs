import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
async function get(path){const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});return{status:response.status,headers:response.headers,text:await response.text()}}
const health=await get('/api/health/ready');assert.equal(health.status,200)
for(const [name,value]of [['X-Lien-Campaign-Booking-Menu','v685'],['X-Lien-Appointment-Datetime-Recovery','v684'],['X-Lien-Platform-Console','v683'],['X-Lien-Partner-Chat','v682']])assert.equal(health.headers.get(name),value)
const journey=await get('/customer-journey-v685.js?v=685');assert.equal(journey.status,200)
for(const marker of ['campaignBooking.permits','campaignId:current.id','orimia:hydrated-v680'])assert.ok(journey.text.includes(marker))
assert.equal((await get('/campaign-booking-v685.css')).status,200)
assert.equal((await get('/api/customer/campaign-booking?campaign=smoke-no-data')).status,401)
console.log('v685 production read-only smoke PASS: release, assets, customer-only context endpoint')
