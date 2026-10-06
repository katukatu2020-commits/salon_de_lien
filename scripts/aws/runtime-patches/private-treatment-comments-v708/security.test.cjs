'use strict'
const {test}=require('node:test'),assert=require('node:assert/strict'),{Readable}=require('node:stream')
const {createCustomerAppointmentHistoryService}=require('/app/customer-appointment-history-v565.js')
const staff={organizationId:'org-a',userId:'staff-a',role:'STAFF',displayName:'スタッフ確認'}
function fixture(session=staff,{hidden=false,linked=false}={}) {
  const writes=[],queries=[],notes=new Map()
  const prisma={
    async $executeRawUnsafe(sql,...args){writes.push([sql,...args]);if(sql.startsWith('DELETE'))notes.delete(args[1]);return 1},
    async $queryRawUnsafe(sql,...args){
      queries.push([sql,...args])
      if(sql.includes('FROM "Customer" WHERE'))return !hidden&&args[0]==='customer-a'&&args[1]==='org-a'?[{id:'customer-a',name:'テスト顧客'}]:[]
      if(sql.includes('SELECT entity."id"'))return ['appointment-a','visit-a','sale-a'].includes(args[0])&&args[1]==='customer-a'&&args[2]==='org-a'?[{id:args[0]}]:[]
      if(sql.includes('EXISTS(SELECT 1'))return []
      if(sql.includes('FROM "Visit" v'))return [{id:'visit-a',visitedAt:new Date('2026-09-01T01:00:00Z')}]
      if(sql.includes('FROM "ServiceSale" s'))return linked?[{id:'sale-a',appointmentId:'appointment-a',paidAt:new Date('2026-09-01T01:00:00Z')}]:[]
      if(sql.includes('SELECT "subjectKey"'))return [...notes.values()].filter(n=>args[1].includes(n.subjectKey))
      if(sql.includes('INSERT INTO "CustomerHistoryMemo"')){const row={subjectKey:args[1],body:args[2],updatedByName:args[4],updatedAt:new Date()};notes.set(args[1],row);writes.push([sql,...args]);return[row]}
      throw Error('Unexpected SQL')
    }
  }
  const service=createCustomerAppointmentHistoryService({prisma,sessionProvider:async()=>session})
  async function request(method='GET',body,customer='customer-a',origin='https://salon-de-lien.com') {
    const bytes=body===undefined?Buffer.alloc(0):Buffer.from(JSON.stringify(body)), req=Readable.from([bytes.subarray(0,15),bytes.subarray(15)])
    req.method=method;req.headers={host:'salon-de-lien.com','x-forwarded-proto':'https',origin};req.socket={}
    const res={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v},end(v){this.body=v}}
    await service.handle(req,res,new URL('https://salon-de-lien.com/api/admin/customers/'+customer+'/visit-history'+(method==='GET'?'':'/memo')))
    return res
  }
  return{request,writes,queries,notes}
}
for(const role of [null,'CUSTOMER','DEALER','MANUFACTURER']) test('private history rejects '+role,async()=>{
  const f=fixture(role?{...staff,role}:null)
  for(const method of ['GET','PUT'])assert.equal((await f.request(method,{subjectKey:'VISIT:visit-a',body:'秘密'})).statusCode,401)
  assert.equal(f.queries.length,0);assert.equal(f.writes.length,0)
})
test('tenant and hidden-customer guards protect reads and writes',async()=>{
  for(const f of [fixture({...staff,organizationId:'other'}),fixture(staff,{hidden:true})]) {
    assert.equal((await f.request()).statusCode,404)
    assert.equal((await f.request('PUT',{subjectKey:'VISIT:visit-a',body:'秘密'})).statusCode,404)
    assert.ok(!f.writes.some(w=>w[0].startsWith('INSERT')))
  }
})
test('staff and admin can save, edit, read and clear a comment without changing visit or photo data',async()=>{
  for(const role of ['STAFF','ADMIN']) {
    const f=fixture({...staff,role})
    for(const body of ['薬剤の記録\n次回は確認 <script>','変更後のコメント']) {
      const response=await f.request('PUT',{subjectKey:'VISIT:visit-a',body})
      assert.equal(response.statusCode,200);assert.equal(JSON.parse(response.body).memo.body,body)
      const read=await f.request();assert.equal(JSON.parse(read.body).completed[0].memo.body,body)
      assert.equal(read.headers['cache-control'],'private, no-store, max-age=0')
    }
    assert.equal((await f.request('PUT',{subjectKey:'VISIT:visit-a',body:''})).statusCode,200)
    assert.equal(JSON.parse((await f.request()).body).completed[0].memo,null)
    assert.ok(f.writes.every(w=>!/(INSERT INTO|UPDATE) "(Visit|VisitPhoto|VisitCommunityPost|Appointment)"/.test(w[0])))
  }
})
test('cross origin, invalid subjects and other customer history are rejected',async()=>{
  const f=fixture()
  for(const origin of ['https://evil.example',''])assert.equal((await f.request('PUT',{subjectKey:'VISIT:visit-a',body:'秘密'},'customer-a',origin)).statusCode,403)
  for(const subjectKey of ['VISIT:other-visit','APPOINTMENT:other','__proto__:visit-a','OTHER:visit-a',"VISIT:visit-a' OR true --"])assert.equal((await f.request('PUT',{subjectKey,body:'秘密'})).statusCode,404)
  assert.ok(!f.writes.some(w=>w[0].startsWith('INSERT')))
})
test('4000-character limit and structured input validation',async()=>{
  const f=fixture()
  for(const input of [null,{subjectKey:'VISIT:visit-a',body:{}},{subjectKey:'VISIT:visit-a',body:null},{subjectKey:'VISIT:visit-a',body:'a'.repeat(4001)}])assert.equal((await f.request('PUT',input)).statusCode,400)
  assert.equal((await f.request('PUT',{subjectKey:'VISIT:visit-a',body:'あ'.repeat(4000)})).statusCode,200)
  assert.equal((await f.request('PUT',{subjectKey:'VISIT:visit-a',body:'a'.repeat(18000)})).statusCode,413)
})
test('legacy visit memo keeps its original subject when a sale is linked later',async()=>{
  const f=fixture(staff,{linked:true})
  await f.request('PUT',{subjectKey:'VISIT:visit-a',body:'従来の施術メモ'})
  const row=JSON.parse((await f.request()).body).completed[0]
  assert.equal(row.subjectKey,'VISIT:visit-a')
  assert.equal(row.memo.body,'従来の施術メモ')
  await f.request('PUT',{subjectKey:row.subjectKey,body:''})
  assert.equal(JSON.parse((await f.request()).body).completed[0].memo,null)
})
