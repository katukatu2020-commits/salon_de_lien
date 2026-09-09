import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
const require = createRequire('/app/package.json')
const { PrismaClient } = require('@prisma/client')
const inbox = require('/app/admin-chat-inbox-v589')
const url = new URL(process.env.TEST_DATABASE_URL)
const schema = 'chat_v589_' + randomUUID().replaceAll('-','')
const admin = new PrismaClient({datasources:{db:{url:url.toString()}}})
await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
url.searchParams.set('schema',schema)
const db = new PrismaClient({datasources:{db:{url:url.toString()}}})
try {
  for (const sql of [
    'CREATE TABLE "Customer" ("id" text PRIMARY KEY,"organizationId" text,"name" text,"phone" text,"deletedAt" timestamp,"storeHiddenAt" timestamp)',
    'CREATE TABLE "CustomerRealName" ("customerId" text PRIMARY KEY,"organizationId" text,"realName" text)',
    'CREATE TABLE "StaffBookingSetting" ("organizationId" text,"staffKey" text,"staffName" text,UNIQUE("organizationId","staffKey"))',
    'CREATE TABLE "ChatThread" ("id" text PRIMARY KEY,"organizationId" text,"customerId" text,"staffKey" text,"staffName" text,"staffLastReadAt" timestamp,"updatedAt" timestamp)',
    'CREATE TABLE "ChatMessage" ("id" text PRIMARY KEY,"threadId" text,"senderType" text,"body" text,"createdAt" timestamp)',
    `INSERT INTO "Customer" SELECT 'c'||i,'org-a','検索顧客 '||i,'090-'||lpad(i::text,8,'0'),NULL,NULL FROM generate_series(1,1000) i`,
    `INSERT INTO "ChatThread" SELECT 't'||i,'org-a','c'||i,CASE WHEN i%2=0 THEN 'a' ELSE 'b' END,'旧担当',CASE WHEN i%3=0 THEN NOW() ELSE NULL END,NOW()-i*interval '1 minute' FROM generate_series(1,1000) i`,
    `INSERT INTO "ChatMessage" SELECT 'm'||i,'t'||i,'customer','相談内容 '||i,NOW()-i*interval '1 minute' FROM generate_series(1,1000) i`,
    `INSERT INTO "StaffBookingSetting" VALUES ('org-a','a','担当A'),('org-a','b','担当B')`,
    `INSERT INTO "CustomerRealName" VALUES ('c999','org-a','石井　加奈子')`,
    `UPDATE "Customer" SET "name"='テスト%_\\<script>alert(1)</script>',"phone"='０９０－１２３４－５６７８' WHERE "id"='c999'`,
    `INSERT INTO "Customer" VALUES ('other','org-b','別店舗秘密','000',NULL,NULL),('hidden','org-a','非表示','000',NULL,NOW()),('deleted','org-a','削除済','000',NOW(),NULL)`,
    `INSERT INTO "ChatThread" SELECT "id","organizationId","id",'a','担当',NULL,NOW() FROM "Customer" WHERE "id" IN ('other','hidden','deleted')`,
  ]) await db.$executeRawUnsafe(sql)
  await inbox.ensureIndexes(db)
  await inbox.ensureIndexes(db)
  let result = await inbox.loadInbox(db,'org-a',{})
  assert.equal(result.total,1000)
  assert.equal(result.rows.length,25)
  assert.equal(result.pages,40)
  assert.equal(result.rows[0].id,'t1')
  assert.equal(result.stats.unreadCount,667)
  assert.deepEqual(result.staff.map(s=>s.name),['担当A','担当B'])
  result = await inbox.loadInbox(db,'org-a',{page:2})
  assert.equal(result.rows[0].id,'t26')
  result = await inbox.loadInbox(db,'org-a',{page:9999})
  assert.equal(result.params.page,40)
  for (const q of ['石井加奈子','石井 加奈子','０９０１２３４５６７８','090-1234-5678','%_\\']) {
    result = await inbox.loadInbox(db,'org-a',{q})
    assert.equal(result.total,1,q)
    assert.equal(result.rows[0].id,'t999')
  }
  assert.equal((await inbox.loadInbox(db,'org-a',{q:"' OR 1=1 --"})).total,0)
  assert.equal((await inbox.loadInbox(db,'org-a',{unread:true})).total,667)
  assert.equal((await inbox.loadInbox(db,'org-a',{staff:'a'})).total,500)
  assert.equal((await inbox.loadInbox(db,'org-a',{q:'別店舗秘密'})).total,0)
  assert.equal((await inbox.loadInbox(db,'org-b',{})).total,1)
  assert.equal(await inbox.findSelectedThread(db,'org-a',{threadId:'other'}),null)
  assert.equal(await inbox.findSelectedThread(db,'org-a',{threadId:'hidden'}),null)
  assert.equal(await inbox.findSelectedThread(db,'org-a',{threadId:'deleted'}),null)
  assert.equal(await inbox.findSelectedThread(db,'org-a',{}),null)
  assert.equal((await inbox.findSelectedThread(db,'org-a',{threadId:'t999',q:'該当なし',unread:'1'})).customerName,'石井　加奈子')
  assert.equal((await inbox.findSelectedThread(db,'org-a',{customerId:'c999'})).id,'t999')
  result = await inbox.loadInbox(db,'org-a',{q:'%_\\'})
  assert.ok(!inbox.renderInbox(result).includes('<script>alert'))
  assert.ok(inbox.renderInbox(result).includes('&lt;script&gt;'))
  assert.equal(inbox.parameters({page:-1}).page,1)
  assert.equal(inbox.parameters({q:'x'.repeat(300)}).q.length,100)
  assert.ok(inbox.urlFor({q:'a&b',unread:true,page:2,threadId:'t'}).includes('q=a%26b'))
  let session = null
  const service = inbox.createService({prisma:db,staffSession:async()=>session})
  async function request(path,method='GET') {
    const headers = {}, result = {headers}
    const res = {setHeader:(k,v)=>{headers[k]=v},writeHead:(status,h)=>{result.status=status;Object.assign(headers,h)},end:body=>{result.body=body}}
    result.handled = await service.handle({method},res,new URL(path,'http://localhost'))
    return result
  }
  assert.equal((await request('/api/admin/chat/inbox')).status,401)
  session={organizationId:'org-a',role:'CUSTOMER'}
  assert.equal((await request('/api/admin/chat/inbox')).status,401)
  session={organizationId:'org-a',role:'STAFF'}
  const before=await db.$queryRawUnsafe('SELECT "staffLastReadAt" FROM "ChatThread" WHERE "id"=$1','t1')
  const response=await request('/api/admin/chat/inbox?organizationId=org-b&threadId=t1')
  assert.equal(response.status,200)
  assert.equal(JSON.parse(response.body).total,1000)
  assert.equal(response.headers['Cache-Control'],'private, no-store')
  assert.deepEqual(await db.$queryRawUnsafe('SELECT "staffLastReadAt" FROM "ChatThread" WHERE "id"=$1','t1'),before)
  assert.equal((await request('/api/admin/chat/inbox','POST')).status,405)
  assert.equal((await request('/admin-chat-search-v589.css')).status,200)
  assert.equal((await request('/unrelated')).handled,false)
  console.log(JSON.stringify({release:'admin-chat-search-v589',fixtures:1000,pagination:true,unicodeSearch:true,literalSearch:true,tenantIsolation:true,hiddenCustomersExcluded:true,readStateUnchanged:true,authentication:true,xssEscaping:true,indexes:true}))
} finally {
  await db.$disconnect()
  await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await admin.$disconnect()
}
