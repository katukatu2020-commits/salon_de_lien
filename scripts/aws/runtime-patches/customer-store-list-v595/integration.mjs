import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import fs from 'node:fs'
import vm from 'node:vm'
const require=createRequire('/app/package.json')
const { PrismaClient }=require('@prisma/client')
const { availableStores }=require('/app/customer-store-list-v595.js')
const { resolveCustomerSession }=require('/app/customer-session-v591.js')
const { createCustomerLinkService }=require('/app/customer-links-v293.js')
const url=new URL(process.env.TEST_DATABASE_URL)
const schema='store_v595_'+randomUUID().replaceAll('-','')
const admin=new PrismaClient({datasources:{db:{url:url.href}}})
url.searchParams.set('schema',schema)
const db=new PrismaClient({datasources:{db:{url:url.href}}})
const original={version:1,role:'CUSTOMER',userId:'u',subject:'member',customerId:'a',organizationId:'org-a'}
let session={...original}
const code=fs.readFileSync('/app/customer-merge-v385.js','utf8')
const merge=vm.runInNewContext('('+code.slice(code.indexOf('  async function mergeAccounts('),code.indexOf('  async function mergeCustomers(')).trim()+')')
const service=createCustomerLinkService({prisma:db,staffSessionProvider:async()=>null,customerSessionProvider:()=>resolveCustomerSession(db,session),renderCustomerShell:v=>v.body})
async function request(body,route='/api/lien-customer-stores',origin='http://localhost') {
  const req=Readable.from(body?[JSON.stringify(body)]:[]);req.method=body?'POST':'GET';req.headers={host:'localhost',origin}
  const res={statusCode:200,headers:{},body:'',setHeader(k,v){this.headers[k.toLowerCase()]=v},end(v){this.body=v}}
  await service.handle(req,res,new URL('http://localhost'+route));return res
}
const list=()=>availableStores(db,original)
const switchTo=id=>request({action:'switch',organizationId:id})
async function reset() {
  session={...original}
  await db.$executeRawUnsafe('TRUNCATE "CustomerStoreLink","CustomerMergeHistory","CustomerRegistrationInvite","AppUser","Customer","Organization" CASCADE')
  for(const sql of [
    `INSERT INTO "Organization" VALUES ('org-a','A','STORE-A'),('org-b','B','STORE-B'),('org-c','C','STORE-C')`,
    `INSERT INTO "Customer" ("id","organizationId","name") VALUES ('a','org-a','A'),('source','org-b','Source'),('target','org-b','Target'),('other','org-c','Other')`,
    `INSERT INTO "AppUser" VALUES ('u','org-a','a','member','member@example.invalid','CUSTOMER',TRUE,NOW())`,
    `INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ('link-a','u','org-a','a'),('link-b','u','org-b','source')`,
  ]) await db.$executeRawUnsafe(sql)
}
async function markMerged() {
  await db.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" VALUES ('source','target','org-b')`)
  await db.$executeRawUnsafe(`UPDATE "Customer" SET "storeHiddenAt"=NOW() WHERE "id"='source'`)
}
try {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  for(const sql of [
    'CREATE TABLE "Organization" ("id" text PRIMARY KEY,"name" text,"publicCode" text)',
    'CREATE TABLE "Customer" ("id" text PRIMARY KEY,"organizationId" text,"name" text,"deletedAt" timestamp,"storeHiddenAt" timestamp,"createdAt" timestamp DEFAULT NOW())',
    'CREATE TABLE "AppUser" ("id" text PRIMARY KEY,"organizationId" text,"customerId" text,"loginId" text,"email" text,"role" text,"active" boolean,"updatedAt" timestamp)',
    'CREATE TABLE "CustomerStoreLink" ("id" text PRIMARY KEY,"appUserId" text,"organizationId" text,"customerId" text UNIQUE,"createdAt" timestamp DEFAULT NOW(),UNIQUE("appUserId","organizationId"))',
    'CREATE TABLE "CustomerMergeHistory" ("sourceCustomerId" text PRIMARY KEY,"targetCustomerId" text,"organizationId" text)',
    'CREATE TABLE "CustomerRegistrationInvite" ("organizationId" text,"customerId" text,"email" text,"usedAt" timestamp)',
    'CREATE TABLE "CustomerPortalAccess" ("customerId" text,"revokedAt" timestamp,"updatedAt" timestamp)',
    'CREATE TABLE "CustomerWithdrawalRequest" ("customerId" text,"usedAt" timestamp)',
  ]) await db.$executeRawUnsafe(sql)

  await reset()
  const account=await db.$queryRawUnsafe('SELECT * FROM "AppUser"')
  const timestamp=(await db.$queryRawUnsafe(`SELECT "createdAt" FROM "CustomerStoreLink" WHERE "id"='link-b'`))[0].createdAt
  const counts={}
  await db.$transaction(tx=>merge(tx,{id:'source',organizationId:'org-b'},{id:'target',organizationId:'org-b'},counts))
  await markMerged()
  assert.equal((await list()).length,2,'linked-store merge must preserve registration')
  assert.equal((await list()).find(s=>s.organizationId==='org-b').customerId,'target')
  assert.deepEqual(await db.$queryRawUnsafe('SELECT * FROM "AppUser"'),account,'canonical account must stay unchanged')
  assert.equal(counts.storeMembership.appUserId,'u')
  assert.deepEqual((await db.$queryRawUnsafe(`SELECT "createdAt" FROM "CustomerStoreLink" WHERE "id"='link-b'`))[0].createdAt,timestamp)

  for(const org of ['org-b','org-a']) {
    const result=await switchTo(org);assert.equal(result.statusCode,200,result.body)
    const token=decodeURIComponent(result.headers['set-cookie'].split(';')[0].split('=')[1])
    session=JSON.parse(Buffer.from(token.split('.')[0],'base64url').toString())
    assert.equal((await resolveCustomerSession(db,session)).organizationId,org)
    assert.equal((await resolveCustomerSession(db,original)).organizationId,'org-a')
  }
  assert.equal((await switchTo('org-c')).statusCode,404)
  assert.equal((await request({action:'switch',organizationId:'org-b'},undefined,'https://other.invalid')).statusCode,403)

  await reset();await markMerged()
  assert.equal(await resolveCustomerSession(db,{...original,customerId:'source',organizationId:'org-b'}),null)
  const repaired=(await list()).find(s=>s.organizationId==='org-b')
  assert.equal(repaired.customerId,'target');assert.equal(repaired.available,true)
  assert.equal((await switchTo('org-b')).statusCode,200)
  assert.equal((await resolveCustomerSession(db,{...original,customerId:'source',organizationId:'org-b'})).customerId,'target')
  assert.deepEqual(await list(),await list(),'read repair must be idempotent')

  for(const canonical of ['source','target']) {
    await reset()
    await db.$executeRawUnsafe(`UPDATE "AppUser" SET "customerId"=$1,"organizationId"='org-b' WHERE "id"='u'`,canonical)
    await db.$transaction(tx=>merge(tx,{id:'source',organizationId:'org-b'},{id:'target',organizationId:'org-b'},{}))
    await markMerged()
    assert.equal((await list()).find(s=>s.organizationId==='org-b').customerId,'target',canonical)
    assert.equal((await switchTo('org-b')).statusCode,200,canonical)
  }

  await reset();await markMerged()
  await db.$executeRawUnsafe(`INSERT INTO "Customer" ("id","organizationId","name") VALUES ('final','org-b','Final')`)
  await db.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" VALUES ('target','final','org-b')`)
  await db.$executeRawUnsafe(`UPDATE "Customer" SET "storeHiddenAt"=NOW() WHERE "id"='target'`)
  assert.equal((await list()).find(s=>s.organizationId==='org-b').customerId,'final')

  await reset()
  await db.$executeRawUnsafe(`UPDATE "Customer" SET "storeHiddenAt"=NOW() WHERE "id"='source'`)
  let rows=await list()
  assert.equal(rows.length,2);assert.equal(rows.find(s=>s.organizationId==='org-b').available,false)
  let result=await switchTo('org-b');assert.equal(result.statusCode,409);assert.equal(result.headers['set-cookie'],undefined)
  const html=(await request(null,'/u/stores')).body
  assert(html.includes('登録済み（店舗に確認してください）'));assert(html.includes('現在利用できません'))
  assert(!html.includes('data-switch-store="org-b"'))
  assert.equal((await db.$queryRawUnsafe(`SELECT "storeHiddenAt" FROM "Customer" WHERE "id"='source'`))[0].storeHiddenAt instanceof Date,true)
  await db.$executeRawUnsafe(`UPDATE "Customer" SET "deletedAt"=NOW() WHERE "id"='source'`)
  assert.equal((await list()).length,1,'withdrawn customers remain excluded')

  await reset();await markMerged()
  await db.$executeRawUnsafe(`INSERT INTO "AppUser" VALUES ('other-u','org-c','other','other','other@example.invalid','CUSTOMER',TRUE,NOW())`)
  await db.$executeRawUnsafe(`INSERT INTO "CustomerStoreLink" ("id","appUserId","organizationId","customerId") VALUES ('other-link','other-u','org-b','target')`)
  assert.equal((await list()).find(s=>s.organizationId==='org-b').available,false,'another account owner must prevent repair')
  assert.equal((await switchTo('org-b')).statusCode,409)
  await db.$executeRawUnsafe(`DELETE FROM "CustomerStoreLink" WHERE "id"='other-link'`)
  await db.$executeRawUnsafe(`UPDATE "AppUser" SET "customerId"='target',"organizationId"='org-b' WHERE "id"='other-u'`)
  assert.equal((await list()).find(s=>s.organizationId==='org-b').available,false,'canonical owner must also prevent repair')
  const snapshot=await db.$queryRawUnsafe('SELECT * FROM "CustomerStoreLink" ORDER BY "id"')
  await assert.rejects(db.$transaction(tx=>merge(tx,{id:'source',organizationId:'org-b'},{id:'target',organizationId:'org-b'},{})),e=>e.statusCode===409)
  assert.deepEqual(await db.$queryRawUnsafe('SELECT * FROM "CustomerStoreLink" ORDER BY "id"'),snapshot)

  for(const kind of ['cross-store','cycle','hidden-target','deleted-target','long-chain']) {
    await reset();await markMerged()
    if(kind==='cross-store') await db.$executeRawUnsafe(`UPDATE "CustomerMergeHistory" SET "targetCustomerId"='other'`)
    if(kind==='cycle') await db.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" VALUES ('target','source','org-b')`)
    if(kind==='hidden-target') await db.$executeRawUnsafe(`UPDATE "Customer" SET "storeHiddenAt"=NOW() WHERE "id"='target'`)
    if(kind==='deleted-target') await db.$executeRawUnsafe(`UPDATE "Customer" SET "deletedAt"=NOW() WHERE "id"='target'`)
    if(kind==='long-chain') {
      await db.$executeRawUnsafe(`INSERT INTO "Customer" ("id","organizationId","name","storeHiddenAt") SELECT 'depth-'||i,'org-b','Depth',NOW() FROM generate_series(0,16) i`)
      await db.$executeRawUnsafe(`UPDATE "CustomerMergeHistory" SET "targetCustomerId"='depth-0'`)
      await db.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" SELECT 'depth-'||i,CASE WHEN i=16 THEN 'target' ELSE 'depth-'||(i+1) END,'org-b' FROM generate_series(0,16) i`)
    }
    assert.equal((await list()).find(s=>s.organizationId==='org-b').available,false,kind)
    assert.equal((await switchTo('org-b')).statusCode,409,kind)
  }

  await reset();await markMerged()
  await db.$executeRawUnsafe(`DELETE FROM "CustomerStoreLink" WHERE "id"='link-b'`)
  await db.$executeRawUnsafe(`INSERT INTO "CustomerRegistrationInvite" VALUES ('org-b','source','member@example.invalid',NOW())`)
  assert.equal((await list()).length,1,'old hidden invitation must not recreate ownership')
  await db.$executeRawUnsafe(`UPDATE "CustomerRegistrationInvite" SET "customerId"='target'`)
  assert.equal((await list()).length,2,'completed visible registration remains recoverable')
  await db.$executeRawUnsafe(`UPDATE "AppUser" SET "active"=FALSE`)
  assert.equal((await request()).statusCode,401)
  assert.equal((await list()).length,0)
  console.log(JSON.stringify({realPostgres:true,mergeMembershipPreserved:true,staleMergeRepaired:true,unavailableRegistrationVisible:true,invalidSwitchDenied:true,foreignOwnershipDenied:true,withdrawnExcluded:true,hiddenInviteNotRestored:true,canonicalAccountUnchanged:true}))
} finally {
  await db.$disconnect();await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await admin.$disconnect()
}
