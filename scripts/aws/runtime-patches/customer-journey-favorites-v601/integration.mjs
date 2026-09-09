import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {randomBytes} from 'node:crypto'
import {Readable} from 'node:stream'
const require=createRequire('/app/package.json')
const {PrismaClient}=require('@prisma/client')
const {createCustomerFavoritesService}=require('/app/customer-favorites-v601')
const {customerSummaryV601}=require('/app/customer-summary-v601')
if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required')
const schema='customer_journey_'+randomBytes(6).toString('hex')
const url=new URL(process.env.TEST_DATABASE_URL);url.searchParams.set('connection_limit','2')
const bootstrap=new PrismaClient({datasources:{db:{url:url.href}}})
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
url.searchParams.set('schema',schema)
const db=new PrismaClient({datasources:{db:{url:url.href}}})
let session={organizationId:'a',customerId:'alice'}
const bob={organizationId:'a',customerId:'bob'},other={organizationId:'b',customerId:'carol'}
const makeService=()=>createCustomerFavoritesService({prisma:db,sessionProvider:async()=>session})
let service=makeService()
async function api(method,body,headers={origin:'https://salon-de-lien.com'}){
  const req=Object.assign(Readable.from([Buffer.from(typeof body==='string'?body:JSON.stringify(body??{}))]),{method,headers:{host:'salon-de-lien.com',...headers}})
  const res={headers:{},setHeader(k,v){this.headers[k]=v},end(value){this.body=JSON.parse(value)}}
  await service.handle(req,res,new URL('https://salon-de-lien.com/api/customer/product-favorites'))
  return res
}
try{
  for(const sql of [
    'CREATE TABLE "Customer" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"name" TEXT,"deletedAt" TIMESTAMP)',
    'CREATE TABLE "Product" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"active" BOOLEAN DEFAULT true,"salesSuspended" BOOLEAN DEFAULT false,"manufacturerName" TEXT,"name" TEXT,"category" TEXT,"retailPrice" INTEGER,"concernTags" TEXT[],"description" TEXT,"alternativeRecommendation" TEXT,"imageUrl" TEXT)',
    'CREATE TABLE "Visit" ("customerId" TEXT,"visitedAt" TIMESTAMP)',
    'CREATE TABLE "Appointment" ("id" TEXT,"customerId" TEXT,"scheduledAt" TIMESTAMP,"status" TEXT,"menu" TEXT,"staffName" TEXT)',
    'CREATE TABLE "CustomerPointAccount" ("customerId" TEXT,"availablePoints" INTEGER)',
    `INSERT INTO "Customer" VALUES ('alice','a','Alice',NULL),('bob','a','Bob',NULL),('carol','b','Carol',NULL)`,
    `INSERT INTO "Product" ("id","organizationId","name") VALUES ('p1','a','First'),('p2','a','Second'),('p3','b','Private')`,
    `INSERT INTO "Visit" VALUES ('alice','2026-01-01'),('alice','2026-02-02'),('carol','2026-03-03')`,
    `INSERT INTO "Appointment" VALUES ('cancelled','alice',CURRENT_TIMESTAMP+INTERVAL '1 day','キャンセル','Cancelled','Staff'),('next','alice',CURRENT_TIMESTAMP+INTERVAL '2 days','予約済み','Cut','Staff'),('foreign','carol',CURRENT_TIMESTAMP+INTERVAL '1 day','予約済み','Private','Other')`,
    `INSERT INTO "CustomerPointAccount" VALUES ('alice',120),('carol',999)`
  ])await db.$executeRawUnsafe(sql)
  await service.ensureSchema()
  assert.deepEqual((await api('GET')).body.productIds,[])
  assert.equal((await api('PUT',{productId:'p1',favorite:true})).statusCode,200)
  assert.equal((await api('PUT',{productId:'p1',favorite:true})).statusCode,200)
  service=makeService()
  assert.deepEqual((await api('GET')).body.productIds,['p1'],'Durable and idempotent after service recreation')
  assert.deepEqual(await service.listProducts(bob),[])
  assert.deepEqual(await service.listProducts(other),[])
  assert.equal(await service.findProduct(session,'p3'),undefined)
  assert.equal((await api('PUT',{productId:'p3',favorite:true})).statusCode,404)
  await api('PUT',{productId:'p2',favorite:true,customerId:'bob',organizationId:'b'})
  assert.equal((await service.listProducts(session)).length,2)
  assert.deepEqual(await service.listProducts(bob),[],'Body cannot select another customer')
  await db.$executeRawUnsafe(`UPDATE "Product" SET "salesSuspended"=true WHERE "id"='p2'`)
  assert.deepEqual((await api('GET')).body.productIds,['p1'])
  assert.equal((await api('PUT',{productId:'p2',favorite:true})).statusCode,404)
  assert.equal((await api('PUT',{productId:'p2',favorite:false})).statusCode,200)
  await db.$executeRawUnsafe(`UPDATE "Product" SET "active"=false WHERE "id"='p1'`)
  assert.equal((await api('PUT',{productId:'p1',favorite:true})).statusCode,404)
  await db.$executeRawUnsafe(`UPDATE "Product" SET "active"=true WHERE "id"='p1'`)
  for(const input of [null,{},[],{productId:'p1',favorite:'true'},{productId:'x'.repeat(161),favorite:true}])assert.equal((await api('PUT',input)).statusCode,400)
  assert.equal((await api('PUT','{invalid')).statusCode,400)
  assert.equal((await api('PUT','x'.repeat(4097))).statusCode,413)
  assert.equal((await api('DELETE')).statusCode,405)
  for(const headers of [{origin:'https://evil.test'},{origin:'null'},{}])assert.equal((await api('PUT',{productId:'p1',favorite:false},headers)).statusCode,403)
  assert.deepEqual((await api('GET')).body.productIds,['p1'],'CSRF requests cannot remove favorites')
  const summary=await customerSummaryV601(db,session,'MEM-1')
  assert.equal(summary.name,'Alice');assert.equal(summary.visitCount,2);assert.equal(summary.points,120)
  assert.equal(summary.membershipCode,'MEM-1');assert.equal(summary.appointment.id,'next')
  assert.equal(await customerSummaryV601(db,{organizationId:'b',customerId:'alice'},'MEM-X'),null)
  session=null
  assert.equal((await api('GET')).statusCode,401)
  assert.equal((await api('PUT',{productId:'p1',favorite:true})).statusCode,401)
  session={organizationId:'a',customerId:'alice'}
  assert.equal((await api('PUT',{productId:'p1',favorite:false})).statusCode,200)
  assert.deepEqual((await api('GET')).body.productIds,[])
  await api('PUT',{productId:'p1',favorite:true})
  await db.$executeRawUnsafe(`DELETE FROM "Product" WHERE "id"='p1'`)
  assert.deepEqual((await api('GET')).body.productIds,[])
  console.log(JSON.stringify({passed:true,persistence:true,tenantAndCustomerIsolation:true,idempotence:true,csrf:true,validation:true,summary:true,inactiveAndDeletedProducts:true}))
}finally{
  await db.$disconnect()
  await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`)
  await bootstrap.$disconnect()
}
