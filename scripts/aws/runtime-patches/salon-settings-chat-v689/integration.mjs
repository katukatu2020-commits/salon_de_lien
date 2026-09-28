import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire('/app/package.json'),{PrismaClient}=require('@prisma/client')
const helper=require('/app/salon-settings-chat-v689.js'),inbox=require('/app/admin-chat-inbox-v589.js')
const connection=process.env.TEST_DATABASE_URL
assert.ok(connection,'TEST_DATABASE_URL required')
const schema='test_chat689_'+crypto.randomBytes(6).toString('hex')
const url=new URL(connection);url.searchParams.set('schema',schema)
const root=new PrismaClient({datasources:{db:{url:connection}}}),db=new PrismaClient({datasources:{db:{url:url.href}}})
let kept=false,server
const session=userId=>({organizationId:'org-a',userId,role:userId==='owner'?'ADMIN':'STAFF'})
try{
  await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  for(const sql of [
    'CREATE TABLE "AppUser" ("id" text PRIMARY KEY,"organizationId" text,"displayName" text,"role" text,"active" boolean DEFAULT TRUE,"isSharedStoreAccount" boolean DEFAULT FALSE)',
    'CREATE TABLE "StaffBookingSetting" ("organizationId" text,"staffKey" text,"staffName" text,"userId" text,"active" boolean DEFAULT TRUE,"onLeave" boolean DEFAULT FALSE,"createdAt" timestamp DEFAULT NOW(),UNIQUE("organizationId","staffKey"))',
    'CREATE TABLE "Customer" ("id" text PRIMARY KEY,"organizationId" text,"name" text,"phone" text,"deletedAt" timestamp,"storeHiddenAt" timestamp)',
    'CREATE TABLE "CustomerRealName" ("customerId" text,"organizationId" text,"realName" text)',
    'CREATE TABLE "ChatThread" ("id" text PRIMARY KEY,"organizationId" text,"customerId" text,"staffKey" text,"staffName" text,"status" text DEFAULT \'open\',"staffLastReadAt" timestamp,"customerLastReadAt" timestamp,"updatedAt" timestamp DEFAULT NOW(),UNIQUE("customerId","staffKey"))',
    'CREATE TABLE "ChatMessage" ("id" text PRIMARY KEY,"threadId" text REFERENCES "ChatThread"("id"),"senderType" text,"senderUserId" text,"body" text,"createdAt" timestamp DEFAULT NOW())',
    `INSERT INTO "AppUser" ("id","organizationId","displayName","role","isSharedStoreAccount") VALUES ('owner','org-a','オーナー','ADMIN',FALSE),('shared','org-a','店舗共通','STAFF',TRUE),('kaori','org-a','kaori','STAFF',FALSE),('watanabe','org-a','渡邉 浩明','STAFF',FALSE),('legacy','org-a','高瀬 美月','STAFF',FALSE),('substring','org-a','渡邉','STAFF',FALSE),('foreign','org-b','オーナー','ADMIN',FALSE)`,
    `INSERT INTO "StaffBookingSetting" ("organizationId","staffKey","staffName","userId") VALUES ('org-a','kaori','kaori','kaori'),('org-a','watanabe','渡邊 浩明','watanabe'),('org-a','takase','高瀬 美月',NULL),('org-b','foreign','別店舗','foreign')`,
    `INSERT INTO "Customer" ("id","organizationId","name","phone") VALUES ('c1','org-a','顧客 一','000'),('c2','org-a','顧客 二','001'),('foreign','org-b','別店舗の顧客','002'),('hidden','org-a','非表示','003')`,
    `UPDATE "Customer" SET "storeHiddenAt"=NOW() WHERE "id"='hidden'`,
  ])await db.$executeRawUnsafe(sql)
  const shared=await helper.actorFor(db,session('shared')),owner=await helper.actorFor(db,session('owner')),watanabe=await helper.actorFor(db,session('watanabe'))
  assert.deepEqual(watanabe.chatStaffKeys,['watanabe'])
  assert.deepEqual((await helper.actorFor(db,session('substring'))).chatStaffKeys,[])
  assert.deepEqual((await helper.actorFor(db,session('legacy'))).chatStaffKeys,['takase'])
  await assert.rejects(helper.sendStaff(db,shared,{customerId:'c1',body:'担当者未選択'}),/担当者を選択/)
  const a=await helper.sendStaff(db,shared,{customerId:'c1',staffKey:'watanabe',body:'渡邉さんの会話'})
  const b=await helper.sendStaff(db,shared,{customerId:'c1',staffKey:'kaori',body:'kaoriさんの会話'})
  const c=await helper.sendStaff(db,shared,{customerId:'c2',staffKey:'watanabe',body:'別のお客様'})
  assert.notEqual(a.threadId,b.threadId);assert.notEqual(a.threadId,c.threadId)
  assert.equal((await helper.sendStaff(db,owner,{customerId:'c1',staffKey:'watanabe',body:'同じ会話'})).threadId,a.threadId)
  await helper.sendStaff(db,watanabe,{threadId:a.threadId,body:'自分の会話へ返信'})
  await assert.rejects(helper.sendStaff(db,watanabe,{threadId:b.threadId,body:'別担当には送信不可'}),/この会話には送信/)
  await assert.rejects(helper.sendStaff(db,shared,{threadId:a.threadId,customerId:'c2',body:'不一致'}),/送信先が変更/)
  await assert.rejects(helper.sendStaff(db,shared,{threadId:'foreign',customerId:'c1',staffKey:'watanabe',body:'不正な会話からの自動代替禁止'}),/この会話には/)
  for(const customerId of ['hidden','foreign'])await assert.rejects(helper.sendStaff(db,shared,{customerId,staffKey:'watanabe',body:'対象外'}),/お客様が見つかりません/)
  const ownInbox=await inbox.loadInbox(db,'org-a',{},watanabe)
  assert.equal(ownInbox.total,2);assert.ok(ownInbox.rows.every(t=>t.staffKey==='watanabe'))
  assert.equal(await inbox.findSelectedThread(db,'org-a',{threadId:b.threadId},watanabe),null)
  assert.equal(await inbox.findSelectedThread(db,'org-a',{customerId:'c1'},shared),null)
  assert.equal((await inbox.findSelectedThread(db,'org-a',{threadId:a.threadId},shared)).id,a.threadId)
  const compose=await helper.composer(db,shared,{id:'c1'})
  assert.ok(compose.includes('name="staffKey"'));assert.ok(!compose.includes(' selected'))
  const personal=await helper.composer(db,watanabe,{id:'c1'})
  assert.ok(personal.includes('value="watanabe" selected'));assert.ok(!personal.includes('value="kaori"'))
  console.log('v689 database integration PASS: multiple recipients/staff, no first-staff fallback, legacy identity, shared/staff scopes, hidden/foreign protection')
  if(process.env.KEEP_FIXTURE==='1'){
    const esc=helper.esc
    server=http.createServer(async(req,res)=>{
      try{
        const u=new URL(req.url,'http://localhost'),actor=await helper.actorFor(db,session(req.headers.cookie?.includes('staff=personal')?'watanabe':'shared'))
        if(u.pathname==='/salon-chat-v689.js'){res.setHeader('Content-Type','application/javascript');return res.end(fs.readFileSync('/app/public/salon-chat-v689.js'))}
        if(u.pathname==='/api/lien-chat-form')return helper.handleStaffForm(req,res,db,actor)
        if(u.pathname==='/fixture-data'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(await db.$queryRawUnsafe('SELECT t."customerId",t."staffKey",m."body" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" ORDER BY m."createdAt"')))}
        const thread=u.searchParams.get('threadId')?await inbox.findSelectedThread(db,'org-a',u.searchParams,actor):null
        const customerId=u.searchParams.get('customerId')||'c1'
        const form=thread?`<form action="/api/lien-chat-form" method="post" data-chat-thread="${esc(thread.id)}"><input type="hidden" name="threadId" value="${esc(thread.id)}"><textarea name="body" required></textarea><button type="submit">送信</button></form>`:await helper.composer(db,actor,{id:customerId})
        res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="ja"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:sans-serif;padding:16px;max-width:900px;margin:auto}*{box-sizing:border-box}${fs.readFileSync('/app/public/salon-settings-chat-v689.css','utf8')}</style></head><body><main><h1>${thread?esc(thread.customerName)+' / '+esc(thread.staffName):esc(customerId)}</h1>${form}</main><script src="/salon-chat-v689.js"></script></body></html>`)
      }catch(e){console.error(e);res.statusCode=500;res.end('Fixture error')}
    }).listen(Number(process.env.PORT||3196),'0.0.0.0')
    kept=true
    console.log('Salon chat fixture ready')
    const cleanup=async()=>{server.close();await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);await root.$disconnect();process.exit(0)}
    process.once('SIGTERM',cleanup);process.once('SIGINT',cleanup)
  }
}finally{
  if(!kept){await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await root.$disconnect()}
}
