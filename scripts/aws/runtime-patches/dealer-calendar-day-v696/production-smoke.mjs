import assert from 'node:assert/strict'
const base=process.env.SMOKE_BASE_URL||'https://salon-de-lien.com'
const health=await fetch(base+'/api/health/ready');assert.equal(health.status,200)
assert.equal(health.headers.get('x-lien-dealer-calendar-day'),'v696')
assert.equal(health.headers.get('x-lien-dealer-cascading-filters'),'v695')
const asset=await fetch(base+'/dealer-calendar-v696.js?v=696-1');assert.equal(asset.status,200)
assert.match(await asset.text(),/openCalendarDayV696/)
const css=await fetch(base+'/dealer-calendar-day-v696.css?v=696-1');assert.equal(css.status,200)
assert.match(await css.text(),/cd-dialog/)
const api=await fetch(base+'/api/dealer/erp/calendar-day?date=2026-09-29');assert.equal(api.status,401)
console.log('v696 production read-only PASS: markers, calendar JS/CSS, anonymous daily API denied')
