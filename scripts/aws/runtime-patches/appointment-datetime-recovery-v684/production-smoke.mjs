import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
async function get(path){const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});return{status:response.status,headers:response.headers,text:await response.text()}}
const health=await get('/api/health/ready')
assert.equal(health.status,200)
for(const [name,value]of [['X-Lien-Appointment-Datetime-Recovery','v684'],['X-Lien-Platform-Console','v683'],['X-Lien-Partner-Chat','v682'],['X-Lien-Three-App-QA','v680']])assert.equal(health.headers.get(name),value)
const script=await get('/appointment-datetime-v684.js?v=684-1')
assert.equal(script.status,200);assert.ok(script.text.includes('__orimiaAppointmentDatetimeV684'));assert.ok(script.text.includes('dateTimeOnly:true'));assert.ok(!script.text.includes('__orimiaAppointmentDatetimeEditorV663'))
const loader=await get('/ui-workflows-v294.js');assert.ok(loader.text.includes('/appointment-datetime-v684.js?v=684-1'))
assert.equal((await get('/api/admin/appointments/smoke-no-data/schedule')).status,401)
console.log('v684 production read-only smoke PASS: readiness, versioned editor, loader, unauthenticated API protection')
