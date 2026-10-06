'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict')
const {createCatalog,entries,filters,admin,SOURCE_CODE}=require('./catalog.cjs')
test('source is fixed to the reviewed existing dealer code',()=>assert.equal(SOURCE_CODE,'DLR-60EA86D040'))
test('only dealer admins can manage products',()=>{
  for(const s of [null,{id:'dealer',role:'STAFF'},{id:'dealer',role:'CUSTOMER'},{id:'dealer',role:'DEALER'}])assert.throws(()=>admin(s))
  assert.doesNotThrow(()=>admin({id:'dealer',role:'ADMIN'}))
})
test('batch validation rejects duplicate, malformed, missing, zero and overflowing prices',()=>{
  for(const p of [null,{}, {products:[]},{products:Array.from({length:501},(_,i)=>({id:String(i),price:1}))},{products:[{id:'x',price:0}]},{products:[{id:'x',price:-1}]},{products:[{id:'x',price:1.5}]},{products:[{id:'x',price:'100'}]},{products:[{id:'x',price:null}]},{products:[{id:'x',price:10000001}]},{products:[{id:'x',price:10},{id:'x',price:20}]}])assert.throws(()=>entries(p))
  assert.equal(entries({products:[{id:'x',price:100}]}).length,1)
})
test('pagination and query bounds are validated',()=>{
  for(const q of ['page=-1','page=1e2','pageSize=5000','search='+'x'.repeat(181)])assert.throws(()=>filters(new URLSearchParams(q)))
  assert.equal(filters(new URLSearchParams()).pageSize,50)
})
test('authorization executes before database queries',async()=>{
  const service=createCatalog({db:{$queryRawUnsafe(){throw Error('must not query')},$transaction(){throw Error('must not write')}}})
  await assert.rejects(service.list({id:'d',role:'STAFF'},new URLSearchParams()),e=>e.status===403)
  await assert.rejects(service.importProducts(null,{products:[]}),e=>e.status===401)
})
test('batch is atomic and refuses stale or foreign source products before insert',async()=>{
  let writes=0
  const tx={$executeRawUnsafe:async()=>1,$queryRawUnsafe:async sql=>{if(sql.startsWith('SELECT id FROM "WholesaleDealer"'))return[{id:'source'}];if(sql.includes('FOR SHARE'))return[];writes++;return[]}}
  const service=createCatalog({db:{$transaction:fn=>fn(tx)}})
  await assert.rejects(service.importProducts({id:'target',role:'ADMIN'},{products:[{id:'foreign',price:100}]}),e=>e.status===409)
  assert.equal(writes,0)
})
test('new owner lands on catalog, staff and existing product owners keep orders',async()=>{
  let hasProducts=false
  const service=createCatalog({db:{$queryRawUnsafe:async()=>hasProducts?[{id:'x'}]:[]}})
  assert.equal(await service.landing({id:'new'}),'/dealer/products/master')
  assert.equal(await service.landing({id:'new',staffUserId:'staff'}),'/dealer/orders')
  hasProducts=true;assert.equal(await service.landing({id:'old'}),'/dealer/orders')
})
