'use strict'
const test=require('node:test'),assert=require('node:assert/strict')
const {period,csv}=require('./analytics.cjs')
const {redact,master,procurement}=require('./workflow.cjs')
test('JST month/quarter/year boundaries and previous periods',()=>{
 const month=period(new URLSearchParams({month:'2026-01'}))
 assert.equal(month.start.toISOString(),'2025-12-31T15:00:00.000Z')
 assert.equal(month.previousStart.toISOString(),'2025-11-30T15:00:00.000Z')
 const quarter=period(new URLSearchParams({month:'2026-05',period:'quarter'}))
 assert.equal(quarter.start.toISOString(),'2026-03-31T15:00:00.000Z')
 assert.equal(quarter.end.toISOString(),'2026-06-30T15:00:00.000Z')
 const year=period(new URLSearchParams({month:'2026-09',period:'year'}))
 assert.equal(year.start.toISOString(),'2025-12-31T15:00:00.000Z')
 assert.equal(year.end.toISOString(),'2026-12-31T15:00:00.000Z')
 assert.throws(()=>period(new URLSearchParams({month:'2026-13'})))
})
test('rate redaction keeps selling prices and does not mutate source',()=>{
 const source={lines:[{discountRate:20,listPrice:1000,unitPrice:800}],discountYen:200,totalYen:880}
 assert.deepEqual(redact(source),{lines:[{unitPrice:800}],totalYen:880})
 assert.equal(source.lines[0].listPrice,1000)
})
test('procurement delegation does not grant master access',()=>{
 assert.throws(()=>master({role:'STAFF',canProcure:true}),{status:403})
 assert.throws(()=>procurement({role:'ADMIN',salon:true}),{status:403})
 assert.doesNotThrow(()=>procurement({role:'STAFF',canProcure:true}))
})
test('CSV quotes multiline and shields formula cells',()=>{
 assert.equal(csv([['=danger','a"b','x\ny']]),'\ufeff"\'=danger","a""b","x\ny"\r\n')
 assert.equal(csv([[-2,-800]]),'\ufeff"-2","-800"\r\n')
})
