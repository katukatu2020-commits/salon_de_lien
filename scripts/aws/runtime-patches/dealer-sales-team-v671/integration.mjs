import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import fs from 'node:fs'
import { createRequire } from 'node:module'

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required')
process.env.DEALER_AUTH_SECRET='dealer-sales-team-v671-test-only-secret-0000000000000000000000'
const require=createRequire('/app/package.json')
const {PrismaClient}=require('@prisma/client')
const {createWholesaleOrderingService}=require('/app/wholesale-ordering-v543.js')
const {monthRange}=require('/app/dealer-sales-team-v671.js')
const schema='dealer_team_'+crypto.randomBytes(6).toString('hex')
const url=new URL(process.env.TEST_DATABASE_URL)
url.searchParams.set('connection_limit','8')
const bootstrap=new PrismaClient({datasources:{db:{url:url.href}}})
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
url.searchParams.set('schema',schema)
const db=new PrismaClient({datasources:{db:{url:url.href}}})
const service=createWholesaleOrderingService({prisma:db,crypto,adminSessionProvider:async()=>null})
const password='IntegrationOnly-v671!'
function hash(pass){const salt=crypto.randomBytes(16).toString('hex');return `scrypt$${salt}$${crypto.scryptSync(pass,salt,64).toString('hex')}`}
const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://localhost')
    if(await service.handle(req,res,u))return
    const assets={'/password-visibility-v627.js':'application/javascript','/password-visibility-v627.css':'text/css','/brand/orimia-icon-192.png':'image/png','/brand/orimia-icon-32.png':'image/png','/mobile-workspaces-v657.css':'text/css','/mobile-workspaces-v657.js':'application/javascript','/dealer-monthly-calendar-v658.css':'text/css'}
    if(assets[u.pathname] && fs.existsSync('/app/public'+u.pathname)){res.setHeader('Content-Type',assets[u.pathname]);res.end(fs.readFileSync('/app/public'+u.pathname));return}
    if(u.pathname==='/favicon.ico'){res.statusCode=204;res.end();return}
    res.statusCode=404;res.end('Not found')
  }catch(error){console.error(error);res.statusCode=500;res.end('Test server error')}
})
let base
async function request(path,cookie='',body){
  const res=await fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json',Origin:base}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const content=await res.text();let data;try{data=JSON.parse(content)}catch{}
  return {status:res.status,headers:res.headers,data,content}
}
async function ok(path,cookie,body){const r=await request(path,cookie,body);assert.ok([200,201].includes(r.status),`${path}: ${r.status} ${r.content}`);return r.data}
async function login(loginId,pass=password){const r=await request('/api/dealer/auth/login','',{loginId,password:pass});assert.equal(r.status,303);return {cookie:(r.headers.get('set-cookie') || '').split(';')[0],location:r.headers.get('location')}}
async function order(id,salon,status,orderedAt,deliveredAt,lines){
  const sum=lines.reduce((n,l)=>n+l.amount,0)
  await db.$executeRawUnsafe('INSERT INTO "WholesaleOrder" ("id","orderNo","dealerId","organizationId","status","orderedByName","subtotalYen","taxYen","totalYen","orderedAt","deliveredAt") VALUES ($1,$1,\'dealer-a\',$2,$3,\'テスト店舗\',$4,$5,$6,$7,$8)',id,salon,status,sum,Math.round(sum*.1),Math.round(sum*1.1),new Date(orderedAt),deliveredAt?new Date(deliveredAt):null)
  for(const [i,l]of lines.entries()) await db.$executeRawUnsafe('INSERT INTO "WholesaleOrderLine" ("id","orderId","manufacturerName","productName","category","unitPrice","quantity","deliveredQuantity","lineTotal") VALUES ($1,$2,\'ミルボン\',\'テスト商品\',$3,$4,1,1,$4)',id+'-'+i,id,l.category,l.amount)
}
try{
  await db.$executeRawUnsafe('CREATE TABLE "Organization" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"publicCode" TEXT)')
  await db.$executeRawUnsafe('CREATE TABLE "Product" ("id" TEXT PRIMARY KEY)')
  await service.ensureSchema()
  await service.ensureSchema()
  for(const id of ['a','b']) await db.$executeRawUnsafe('INSERT INTO "WholesaleDealer" ("id","name","loginId","passwordHash","dealerCode") VALUES ($1,$2,$3,$4,$5)','dealer-'+id,id==='a'?'スーパーヤマモト':'別の会社','test-owner-'+id,hash(password),'DLR-'+id)
  await db.$executeRawUnsafe(`INSERT INTO "Organization" VALUES ('salon-a','サロンドリアン','LIEN'),('salon-b','ヘアサロン ハレルヤ','HALLE'),('salon-c','新規サロン','NEW')`)
  await db.$executeRawUnsafe(`INSERT INTO "WholesaleDealerContract" ("id","dealerId","organizationId","status","customerCode","approvedAt") VALUES ('contract-a','dealer-a','salon-a','ACTIVE','A','2026-09-01T00:00:00+09:00'),('contract-b','dealer-a','salon-b','ACTIVE','B','2026-09-10T00:00:00+09:00')`)
  await new Promise(resolve=>server.listen(Number(process.env.PORT || 3171),'0.0.0.0',resolve))
  base='http://127.0.0.1:'+server.address().port
  process.env.APP_URL=base
  const a=await login('test-owner-a'),b=await login('test-owner-b')
  assert.ok(a.cookie.startsWith('orimia_dealer_session='))
  const aInfo=await ok('/api/dealer/team/data',a.cookie)
  assert.equal(aInfo.viewer.role,'ADMIN')
  const ownerId=aInfo.viewer.memberId
  assert.equal((await request('/api/dealer/team/data')).status,401)
  const branch1=await ok('/api/dealer/team/branch',a.cookie,{name:'岡山営業所'})
  const branch2=await ok('/api/dealer/team/branch',a.cookie,{name:'倉敷営業所'})
  const staff=await ok('/api/dealer/team/member',a.cookie,{name:'山本 営業',loginId:'yamamoto-sales',role:'STAFF',branchId:branch1.id})
  assert.ok(staff.initialPassword.length>=10)
  assert.equal((await request('/api/dealer/team/member',b.cookie,{name:'Duplicate',loginId:'yamamoto-sales',role:'STAFF'})).status,409)
  assert.equal((await request('/api/dealer/team/member',a.cookie,{name:'Duplicate',loginId:'test-owner-b',role:'STAFF'})).status,409)
  assert.equal((await request('/api/dealer/team/member',b.cookie,{name:'Foreign branch',loginId:'foreign-branch',role:'STAFF',branchId:branch1.id})).status,400)
  const initial=await login('yamamoto-sales',staff.initialPassword)
  assert.equal(initial.location,'/dealer/password-change')
  assert.equal((await request('/api/dealer/bootstrap',initial.cookie)).status,428)
  const staffPasswordPage=await request('/dealer/password-change',initial.cookie)
  assert.equal(staffPasswordPage.status,200)
  assert.match(staffPasswordPage.content,/data-dealer-view="staff-password"/)
  assert.doesNotMatch(staffPasswordPage.content,/href="\/dealer\/team"/)
  assert.equal((await request('/api/dealer/staff-password-change',initial.cookie,{currentPassword:'wrong',newPassword:password,newPasswordConfirm:password})).status,400)
  await ok('/api/dealer/staff-password-change',initial.cookie,{currentPassword:staff.initialPassword,newPassword:password,newPasswordConfirm:password})
  assert.equal((await request('/api/dealer/sales',initial.cookie)).status,401)
  const employee=await login('yamamoto-sales')
  assert.equal(employee.location,'/dealer/orders')
  for(const path of ['/api/dealer/team/member','/api/dealer/team/branch','/api/dealer/team/goal','/api/dealer/team/assignment','/api/dealer/profile','/api/dealer/calendar/targets']) assert.equal((await request(path,employee.cookie,{})).status,403,path)
  assert.equal((await request('/api/dealer/team/data',employee.cookie)).status,403)
  assert.equal((await request('/dealer/team',employee.cookie)).status,403)
  assert.equal((await request('/api/dealer/team/member',b.cookie,{id:staff.id,name:'Foreign edit',role:'ADMIN'})).status,404)
  assert.equal((await request('/api/dealer/team/goal',b.cookie,{memberId:staff.id,month:'2026-09',salesTargetYen:100,acquisitionTarget:1})).status,404)
  assert.equal((await request('/api/dealer/team/assignment',b.cookie,{id:'contract-a',memberId:staff.id,closingDay:20})).status,404)
  const origin=await fetch(base+'/api/dealer/team/branch',{method:'POST',headers:{Cookie:a.cookie,Origin:'https://foreign.example','Content-Type':'application/json'},body:JSON.stringify({name:'blocked'})})
  assert.equal(origin.status,403)
  await order('historic','salon-a','DELIVERED','2026-08-25T12:00:00+09:00','2026-09-01T00:00:00+09:00',[{category:'ヘアケア',amount:1000}])
  await ok('/api/dealer/team/assignment',a.cookie,{id:'contract-a',memberId:staff.id,branchId:branch1.id,closingDay:20})
  await ok('/api/dealer/team/assignment',a.cookie,{id:'contract-b',memberId:ownerId,branchId:branch2.id,closingDay:31})
  await order('delivered','salon-a','DELIVERED','2026-09-12T10:00:00+09:00','2026-09-15T10:00:00+09:00',[{category:'ヘアケア',amount:3000},{category:'カラー',amount:2000}])
  await order('forecast','salon-a','SHIPPED','2026-09-20T10:00:00+09:00',null,[{category:'カラー',amount:4000}])
  await order('other','salon-b','DELIVERED','2026-09-20T10:00:00+09:00','2026-09-20T12:00:00+09:00',[{category:'ヘアケア',amount:9000}])
  await order('cancelled','salon-a','CANCELLED','2026-09-20T10:00:00+09:00',null,[{category:'カラー',amount:99000}])
  await order('next-month','salon-a','DELIVERED','2026-10-01T00:00:00+09:00','2026-10-01T00:00:00+09:00',[{category:'カラー',amount:77000}])
  await ok('/api/dealer/team/goal',a.cookie,{memberId:staff.id,month:'2026-09',salesTargetYen:12000,acquisitionTarget:2})
  const full=await ok('/api/dealer/sales?month=2026-09',a.cookie)
  assert.equal(full.summary.actualYen,15000)
  assert.equal(full.summary.forecastYen,18000)
  assert.equal(full.summary.deliveredCount,3)
  assert.equal(full.summary.orderCount,3)
  assert.equal(full.categories.reduce((n,c)=>n+c.actualYen,0),15000)
  const performance=full.progress.find(m=>m.id===staff.id)
  assert.equal(performance.actualYen,6000)
  assert.equal(performance.acquisitionCount,1)
  assert.equal(performance.salesTargetYen,12000)
  for(const filter of ['salon=salon-a','closing=20','member='+staff.id,'branch='+branch1.id]) {
    const report=await ok('/api/dealer/sales?month=2026-09&'+filter,a.cookie)
    assert.equal(report.summary.actualYen,6000,filter)
    assert.equal(report.summary.forecastYen,9000,filter)
  }
  assert.equal((await ok('/api/dealer/sales?month=2026-09&member='+ownerId,employee.cookie)).summary.actualYen,6000)
  assert.equal((await ok('/api/dealer/sales?month=2026-09',employee.cookie)).progress.length,1)
  assert.equal((await ok('/api/dealer/sales?month=2026-09',b.cookie)).summary.actualYen,0)
  assert.equal((await request('/api/dealer/sales?month=2026-13',a.cookie)).status,400)
  assert.equal(monthRange('2026-09').start.toISOString(),'2026-08-31T15:00:00.000Z')
  await ok('/api/dealer/team/assignment',a.cookie,{id:'contract-a',memberId:ownerId,branchId:branch2.id,closingDay:31})
  const preserved=await ok('/api/dealer/sales?month=2026-09&member='+staff.id,a.cookie)
  assert.equal(preserved.summary.actualYen,6000)
  assert.equal(preserved.progress.find(m=>m.id===staff.id).acquisitionCount,1)
  const newContract=await ok('/api/dealer/contracts',employee.cookie,{salonCode:'NEW'})
  const acquired=(await db.$queryRawUnsafe('SELECT * FROM "WholesaleDealerContract" WHERE "id"=$1',newContract.contract.id))[0]
  assert.equal(acquired.acquisitionMemberId,staff.id)
  assert.equal(acquired.salesMemberId,staff.id)
  const reset=await ok('/api/dealer/team/reset-password',a.cookie,{id:staff.id})
  assert.equal((await request('/api/dealer/sales',employee.cookie)).status,401)
  const fresh=await login('yamamoto-sales',reset.initialPassword)
  await ok('/api/dealer/team/member',a.cookie,{id:staff.id,name:'山本 営業',role:'STAFF',branchId:branch1.id,active:false})
  assert.equal((await request('/api/dealer/sales',fresh.cookie)).status,401)
  assert.equal((await request('/api/dealer/team/member',a.cookie,{id:ownerId,name:'Owner',role:'STAFF'})).status,400)
  assert.equal((await login('test-owner-a')).location,'/dealer/orders','Staff password did not modify owner password')
  await ok('/api/dealer/team/member',a.cookie,{id:staff.id,name:'山本 営業',role:'STAFF',branchId:branch1.id,active:true})
  const adminStaff=await ok('/api/dealer/team/member',a.cookie,{name:'管理担当',loginId:'team-manager',role:'ADMIN',branchId:branch2.id})
  const managerLogin=await login('team-manager',adminStaff.initialPassword)
  await ok('/api/dealer/staff-password-change',managerLogin.cookie,{currentPassword:adminStaff.initialPassword,newPassword:password,newPasswordConfirm:password})
  const manager=await login('team-manager')
  assert.equal((await ok('/api/dealer/team/data',manager.cookie)).viewer.role,'ADMIN')
  assert.equal((await request('/api/dealer/team/reset-password',manager.cookie,{id:adminStaff.id})).status,400)
  await ok('/api/dealer/team/member',manager.cookie,{id:adminStaff.id,name:'管理担当',role:'ADMIN',branchId:branch2.id,active:true})
  assert.equal((await ok('/api/dealer/team/data',manager.cookie)).viewer.role,'ADMIN')
  await ok('/api/dealer/team/member',manager.cookie,{name:'追加スタッフ',loginId:'second-member',role:'STAFF'})
  for(const p of ['/dealer/sales','/dealer/targets','/dealer/team','/dealer/calendar','/dealer/products','/dealer/pricing']) assert.equal((await request(p,a.cookie)).status,200,p)
  assert.equal((await request('/dealer-sales-team-v671-client.js')).status,200)
  console.log(JSON.stringify({ok:true,tests:'auth, roles, tenant isolation, CSRF, immutable attribution, category totals, four filters, goals, JST boundaries, password independence, revocation, admin staff, routes'}))
  if(process.env.KEEP_TEST_SERVER==='1') {
    // Browser tests use these non-production fixture accounts only.
    await db.$executeRawUnsafe('UPDATE "DealerSalesMember" SET "passwordHash"=$1,"mustChangePassword"=FALSE,"active"=TRUE WHERE "id"=$2',hash(password),staff.id)
    console.log('V671_BROWSER_READY '+base)
    await new Promise(resolve=>{process.once('SIGTERM',resolve);process.once('SIGINT',resolve)})
  }
}finally{
  await new Promise(resolve=>server.close(resolve))
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
