import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire('/app/package.json'),{PrismaClient,Prisma}=require('@prisma/client')
const {createAppointmentOperationsService}=require('/app/appointment-operations-v267')
if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required')
const schema='appointment_v684_'+crypto.randomBytes(8).toString('hex'),url=new URL(process.env.TEST_DATABASE_URL)
const bootstrap=new PrismaClient({datasources:{db:{url:url.href}}})
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
url.searchParams.set('schema',schema)
const db=new PrismaClient({datasources:{db:{url:url.href}}})
const service=createAppointmentOperationsService({prisma:db,crypto,sessionProvider:async req=>{
  const role=req.headers['x-test-role'];return role?{role,organizationId:req.headers['x-test-org']||'salon-a'}:null
},customerSessionProvider:async()=>null})
const server=http.createServer(async(req,res)=>{if(!await service.handle(req,res,new URL(req.url,'http://local'))){res.statusCode=404;res.end()}})
let base
async function request(id,body,role='ADMIN',org='salon-a',origin){
  const response=await fetch(base+'/api/admin/appointments/'+id+'/schedule',{method:body?'PATCH':'GET',headers:{...(role?{'x-test-role':role}:{}),'x-test-org':org,...(body?{'Content-Type':'application/json',Origin:origin||base}:{})},body:body?JSON.stringify(body):undefined})
  return {status:response.status,data:await response.json()}
}
const data={date:'2026-10-03',startMinutes:810,dateTimeOnly:true}
try{
  // Match the live Prisma scalar shape, while keeping the fixture in a new schema.
  const types={String:'TEXT',Int:'INTEGER',DateTime:'TIMESTAMP(3)',Boolean:'BOOLEAN',Float:'DOUBLE PRECISION',Json:'JSONB'}
  const fields=Prisma.dmmf.datamodel.models.find(m=>m.name==='Appointment').fields.filter(f=>f.kind==='scalar')
  await db.$executeRawUnsafe('CREATE TABLE "Appointment" ('+fields.map(f=>`"${f.name}" ${types[f.type]}${f.name==='id'?' PRIMARY KEY':''}${['createdAt','updatedAt'].includes(f.name)?' DEFAULT CURRENT_TIMESTAMP':''}`).join(',')+')')
  await db.$executeRawUnsafe('CREATE TABLE "Customer" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"deletedAt" TIMESTAMP(3))')
  await db.$executeRawUnsafe('CREATE TABLE "OrganizationStoreProfile" ("organizationId" TEXT,"businessOpenMinutes" INTEGER,"businessCloseMinutes" INTEGER)')
  await db.$executeRawUnsafe('CREATE TABLE "StaffBookingSetting" ("organizationId" TEXT,"staffKey" TEXT,"staffName" TEXT,"maxConcurrentAppointments" INTEGER,"workStartMinutes" INTEGER,"workEndMinutes" INTEGER,"closedWeekdays" TEXT,"active" BOOLEAN,"onLeave" BOOLEAN,"createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP)')
  await db.$executeRawUnsafe('CREATE TABLE "StaffScheduleBreak" ("organizationId" TEXT,"dateKey" TEXT,"staffKey" TEXT,"staffName" TEXT,"startMinutes" INTEGER,"durationMinutes" INTEGER)')
  await db.$executeRawUnsafe(`INSERT INTO "Customer" VALUES ('customer-a','salon-a',NULL),('customer-b','salon-b',NULL),('customer-deleted','salon-a',NOW()),('customer-other','salon-a',NULL)`)
  await db.$executeRawUnsafe(`INSERT INTO "OrganizationStoreProfile" VALUES ('salon-a',480,1200)`)
  await db.$executeRawUnsafe(`INSERT INTO "StaffBookingSetting" VALUES ('salon-a','staff-a','テスト担当',1,480,1200,'',TRUE,FALSE,NOW())`)
  for(const [id,customerId,status]of [['appointment-a','customer-a','予約確定'],['appointment-b','customer-b','予約確定'],['deleted','customer-deleted','予約確定'],['closed','customer-a','会計済み']]){
    await db.appointment.create({data:{id,customerId,status,scheduledAt:new Date('2026-09-01T01:00:00Z'),durationMinutes:75,staffName:'テスト担当',menu:'カット＋カラー',estimatedPrice:12000,note:'keep this note'}})
  }
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port
  for(const role of [null,'CUSTOMER','DEALER'])assert.equal((await request('appointment-a',null,role)).status,401)
  for(const id of ['appointment-b','deleted','missing'])assert.equal((await request(id)).status,404)
  const initial=await request('appointment-a',null,'STAFF');assert.equal(initial.status,200);assert.equal(initial.data.editable,true)
  const original=await db.appointment.findUnique({where:{id:'appointment-a'}}),updatedAt=initial.data.appointment.updatedAt
  const payload={...data,updatedAt}
  assert.equal((await request('appointment-a',payload,'ADMIN','salon-a','https://evil.example')).status,403)
  assert.equal((await request('appointment-a',payload,'ADMIN','salon-b')).status,404)
  assert.equal((await request('appointment-a',{...payload,date:'2026-02-30'})).status,400)
  assert.equal((await request('appointment-a',{...payload,startMinutes:812})).status,400)
  assert.equal((await request('appointment-a',{...payload,startMinutes:1200})).status,400)
  assert.equal((await request('appointment-a',data)).status,409)
  assert.equal((await request('closed')).data.editable,false)
  assert.equal((await request('closed',payload)).status,400)
  const saved=await request('appointment-a',payload,'STAFF');assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.appointment.scheduledAt,'2026-10-03T04:30:00.000Z')
  const after=await db.appointment.findUnique({where:{id:'appointment-a'}})
  for(const key of Object.keys(original).filter(k=>!['scheduledAt','updatedAt'].includes(k)))assert.deepEqual(after[key],original[key],key+' must not change')
  assert.equal((await request('appointment-a',payload)).status,409,'stale writes cannot overwrite another edit')
  await db.appointment.create({data:{id:'collision',customerId:'customer-other',status:'予約確定',scheduledAt:new Date('2026-10-04T04:30:00Z'),durationMinutes:75,staffName:'テスト担当'}})
  assert.equal((await request('appointment-a',{...payload,date:'2026-10-04',updatedAt:saved.data.appointment.updatedAt})).status,400)
  await db.appointment.update({where:{id:'appointment-a'},data:{staffName:null,durationMinutes:null}})
  const legacy=await request('appointment-a')
  assert.equal((await request('appointment-a',{...payload,date:'2026-10-05',updatedAt:legacy.data.appointment.updatedAt})).status,200)
  const preserved=await db.appointment.findUnique({where:{id:'appointment-a'}});assert.equal(preserved.staffName,null);assert.equal(preserved.durationMinutes,null)
  // Existing calendar callers can still change staff/duration explicitly.
  assert.equal((await request('appointment-a',{date:'2026-10-06',startMinutes:600,durationMinutes:90,staffName:'テスト担当'})).status,200)
  assert.equal((await request('appointment-a')).data.appointment.durationMinutes,90)
  console.log('v684 integration PASS: tenant/auth, dates, availability, concurrency, field preservation, legacy calendar contract')
}finally{
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);await bootstrap.$disconnect()
}
