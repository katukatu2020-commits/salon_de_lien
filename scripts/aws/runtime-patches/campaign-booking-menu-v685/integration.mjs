import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire('/app/package.json'),{PrismaClient}=require('@prisma/client')
const {bookingContext,assertCampaignMenu,createCampaignBookingService,menuMatches}=require('/app/campaign-booking-v685.cjs')
if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required')
const schema='campaign_booking_'+crypto.randomBytes(8).toString('hex'),url=new URL(process.env.TEST_DATABASE_URL)
const bootstrap=new PrismaClient({datasources:{db:{url:url.href}}})
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);url.searchParams.set('schema',schema)
const db=new PrismaClient({datasources:{db:{url:url.href}}}),session={organizationId:'salon-a',customerId:'customer-a'}
const service=createCampaignBookingService({prisma:db,customerSession:async req=>req.headers['x-test-role']==='CUSTOMER'?session:null,ensureTables:async()=>{},json:(res,status,body)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body))}})
const server=http.createServer(async(req,res)=>{if(!await service.handle(req,res,new URL(req.url,'http://local'))){res.statusCode=404;res.end()}})
try{
  await db.$executeRawUnsafe('CREATE TABLE "CustomerCampaign" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"title" TEXT,"targetMenu" TEXT,"startsAt" TIMESTAMPTZ,"endsAt" TIMESTAMPTZ,"status" TEXT)')
  await db.$executeRawUnsafe('CREATE TABLE "SalonMenu" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"name" TEXT,"active" BOOLEAN,"source" TEXT,"sortOrder" INTEGER)')
  for(const [id,name,org,active,source]of [['cut','カット','salon-a',true,'manual'],['combo','カット + カラー','salon-a',true,'manual'],['color','カラー','salon-a',true,'manual'],['width','ﾍｯﾄﾞｽﾊﾟ','salon-a',true,'manual'],['inactive','停止メニュー','salon-a',false,'manual'],['foreign','カット','salon-b',true,'manual'],['external','外部メニュー','salon-a',true,'kanzashi']])await db.$executeRawUnsafe('INSERT INTO "SalonMenu" VALUES ($1,$2,$3,$4,$5,0)',id,org,name,active,source)
  for(const [id,target,org,status,start,end]of [['one','カット','salon-a','published',-1,30],['all',null,'salon-a','published',-1,30],['width','ヘッドスパ','salon-a','published',-1,30],['none','停止メニュー','salon-a','published',-1,30],['external','外部メニュー','salon-a','published',-1,30],['expired','カット','salon-a','published',-30,-1],['future','カット','salon-a','published',1,30],['deleted','カット','salon-a','deleted',-1,30],['foreign','カット','salon-b','published',-1,30]])await db.$executeRawUnsafe('INSERT INTO "CustomerCampaign" VALUES ($1,$2,$1,$3,NOW()+($5::int)*INTERVAL \'1 day\',NOW()+($6::int)*INTERVAL \'1 day\',$4)',id,org,target,status,start,end)
  assert.equal(menuMatches('カット','カット＋カラー'),false)
  assert.equal(menuMatches(' ヘッド スパ ','ﾍｯﾄﾞｽﾊﾟ'),true)
  assert.deepEqual((await bookingContext(db,session,'one')).menuIds,['cut'])
  assert.deepEqual((await bookingContext(db,session,'width')).menuIds,['width'])
  assert.deepEqual(new Set((await bookingContext(db,session,'all')).menuIds),new Set(['cut','combo','color','width']))
  for(const id of ['expired','future','deleted','foreign','missing'])await assert.rejects(()=>bookingContext(db,session,id),e=>e.status===404)
  for(const id of ['none','external'])await assert.rejects(()=>bookingContext(db,session,id),e=>e.status===409)
  await assert.rejects(()=>bookingContext(db,null,'one'),e=>e.status===401)
  await assert.rejects(()=>bookingContext(db,session,{}),e=>e.status===400)
  assert.equal(await assertCampaignMenu(db,session,undefined,'color'),null,'ordinary booking unaffected')
  await db.$transaction(async tx=>{assert.equal((await assertCampaignMenu(tx,session,'one','cut')).id,'one')})
  await assert.rejects(()=>db.$transaction(tx=>assertCampaignMenu(tx,session,'one','combo')),/対象メニュー/)
  await assert.rejects(()=>db.$transaction(tx=>assertCampaignMenu(tx,session,'one','foreign')),/対象メニュー/)
  // Re-evaluate current data at commit, not the menu ids supplied by a browser.
  await db.$executeRawUnsafe('UPDATE "CustomerCampaign" SET "targetMenu"=$1 WHERE "id"=$2','カラー','one')
  await assert.rejects(()=>db.$transaction(tx=>assertCampaignMenu(tx,session,'one','cut')),/対象メニュー/)
  await db.$executeRawUnsafe('UPDATE "SalonMenu" SET "active"=FALSE WHERE "id"=$1','color')
  await assert.rejects(()=>db.$transaction(tx=>assertCampaignMenu(tx,session,'one','color')),e=>e.status===409)
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port
  for(const role of ['','ADMIN','DEALER','CUSTOMER']){
    const response=await fetch(base+'/api/customer/campaign-booking?campaign=width',{headers:{'x-test-role':role}})
    assert.equal(response.status,role==='CUSTOMER'?200:401);assert.equal(response.headers.get('cache-control'),'private, no-store');await response.text()
  }
  const response=await fetch(base+'/api/customer/campaign-booking?campaign=foreign',{headers:{'x-test-role':'CUSTOMER'}});assert.equal(response.status,404);await response.text()
  console.log('v685 integration PASS: exact targets, width normalization, all menus, expiry/deletion/inactive/tenant isolation, transactional revalidation, auth')
}finally{
  server.closeAllConnections();await new Promise(r=>server.close(r));await db.$disconnect();await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);await bootstrap.$disconnect()
}
