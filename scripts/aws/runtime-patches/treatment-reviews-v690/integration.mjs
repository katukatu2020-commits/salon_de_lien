import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire('/app/package.json'),{PrismaClient}=require('@prisma/client')
const {createTreatmentReviews,lockLegacyFeedbackVisit}=require('/app/treatment-reviews-v690.js')
const connection=process.env.TEST_DATABASE_URL
assert.ok(connection,'TEST_DATABASE_URL required')
const schema='test_review690_'+crypto.randomBytes(6).toString('hex'),url=new URL(connection);url.searchParams.set('schema',schema)
const root=new PrismaClient({datasources:{db:{url:connection}}}),db=new PrismaClient({datasources:{db:{url:url.href}}})
let server
try {
  await root.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
  for(const sql of [
    `CREATE TABLE "Organization" ("id" TEXT PRIMARY KEY,"reviewPrizeFirstPoints" int DEFAULT 1000,"reviewPrizeSecondPoints" int DEFAULT 300,"reviewPrizeThirdPoints" int DEFAULT 80)`,
    `CREATE TABLE "Customer" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"deletedAt" timestamp,"storeHiddenAt" timestamp)`,
    `CREATE TABLE "AppUser" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"customerId" TEXT,"displayName" TEXT,"nickname" TEXT,"active" boolean DEFAULT TRUE)`,
    `CREATE TABLE "StaffBookingSetting" ("organizationId" TEXT,"staffKey" TEXT,"staffName" TEXT,"userId" TEXT)`,
    `CREATE TABLE "Appointment" ("id" TEXT PRIMARY KEY,"customerId" TEXT,"scheduledAt" timestamp DEFAULT NOW()-INTERVAL '1 day',"staffName" TEXT DEFAULT '担当 一',"menu" TEXT DEFAULT '似合わせカット',"status" TEXT DEFAULT '来店済み')`,
    `CREATE TABLE "ServiceSale" ("id" TEXT PRIMARY KEY,"customerId" TEXT,"appointmentId" TEXT,"paidAt" timestamp DEFAULT NOW()-INTERVAL '1 hour')`,
    `CREATE TABLE "PointRule" ("key" TEXT PRIMARY KEY,"points" int,"validDays" int,"active" boolean)`,
    `CREATE TABLE "CustomerPointAccount" ("id" TEXT PRIMARY KEY,"customerId" TEXT UNIQUE,"availablePoints" int DEFAULT 0,"pendingPoints" int DEFAULT 0,"lifetimeEarned" int DEFAULT 0,"lifetimeRedeemed" int DEFAULT 0,"lifetimeExpired" int DEFAULT 0,"createdAt" timestamp DEFAULT NOW(),"updatedAt" timestamp DEFAULT NOW())`,
    `CREATE TABLE "PointTransaction" ("id" TEXT PRIMARY KEY,"customerId" TEXT,"accountId" TEXT,"type" TEXT,"amount" int,"balanceAfter" int,"sourceType" TEXT,"sourceId" TEXT,"reason" TEXT,"note" TEXT,"expiresAt" timestamp,"createdByStaffId" TEXT,"createdAt" timestamp DEFAULT NOW())`,
    `CREATE TABLE "PointLot" ("id" TEXT PRIMARY KEY,"customerId" TEXT,"earnTransactionId" TEXT UNIQUE,"originalAmount" int,"remainingAmount" int,"expiresAt" timestamp,"createdAt" timestamp DEFAULT NOW(),"updatedAt" timestamp DEFAULT NOW())`,
    `CREATE TABLE "Product" ("id" TEXT PRIMARY KEY,"name" TEXT,"manufacturerName" TEXT)`,
    `CREATE TABLE "ProductProposal" ("id" TEXT PRIMARY KEY,"customerId" TEXT,"productId" TEXT,"purchased" boolean)`,
    `CREATE TABLE "ProductReviewRequest" ("id" TEXT PRIMARY KEY,"productProposalId" TEXT,"status" TEXT,"expiresAt" timestamp,"requestedAt" timestamp DEFAULT NOW())`,
    `CREATE TABLE "ProductReview" ("id" TEXT,"reviewRequestId" TEXT)`,
    `INSERT INTO "Organization" ("id") VALUES ('oa'),('ob')`,
    `INSERT INTO "Customer" ("id","organizationId") VALUES ('ca','oa'),('cb','oa'),('foreign','ob')`,
    `INSERT INTO "AppUser" ("id","organizationId","customerId","nickname") VALUES ('ua','oa','ca','<script>秘密</script>'),('ub','oa','cb',NULL),('uf','ob','foreign','別店舗')`,
    `INSERT INTO "StaffBookingSetting" VALUES ('oa','one','担当 一',NULL),('oa','two','担当 二',NULL),('ob','one','担当 一',NULL)`,
    `INSERT INTO "PointRule" VALUES ('feedback_submitted',45,60,TRUE)`,
    `INSERT INTO "Appointment" ("id","customerId") VALUES ('v1','ca'),('v2','ca'),('v3','ca'),('v4','ca'),('legacy','ca'),('inactive','ca'),('unknown','ca'),('future','ca'),('unpaid','ca'),('cancel','ca'),('other','cb'),('foreign','foreign')`,
    `UPDATE "Appointment" SET "staffName"='担当 二' WHERE "id"='v2'`,
    `UPDATE "Appointment" SET "staffName"='不明' WHERE "id"='unknown'`,
    `UPDATE "Appointment" SET "scheduledAt"=NOW()+INTERVAL '1 day' WHERE "id"='future'`,
    `UPDATE "Appointment" SET "status"='キャンセル' WHERE "id"='cancel'`,
    `INSERT INTO "ServiceSale" ("id","customerId","appointmentId") SELECT 's-'||"id","customerId","id" FROM "Appointment" WHERE "id"<>'unpaid'`,
    `INSERT INTO "Product" VALUES ('p','テスト商品','メーカー')`,
    `INSERT INTO "ProductProposal" VALUES ('pp','ca','p',TRUE)`,
    `INSERT INTO "ProductReviewRequest" ("id","productProposalId","status","expiresAt") VALUES ('pr','pp','active',NOW()+INTERVAL '3 days')`,
  ])await db.$executeRawUnsafe(sql)
  const session={organizationId:'oa',customerId:'ca',userId:'ua'},other={organizationId:'oa',customerId:'cb',userId:'ub'}
  const staffProvider=async org=>org==='oa'?[{key:'one',name:'担当 一',role:'スタイリスト'},{key:'two',name:'担当 二',role:'スタイリスト'}]:[]
  const service=createTreatmentReviews({prisma:db,sessionProvider:async req=>req.headers.cookie==='auth=other'?other:req.headers.cookie==='auth=user'?session:null,staffProvider,icon:()=>'',renderCustomerShell:({body})=>'<html><head></head><body>'+body+'</body></html>',sendCustomerHtml:(res,html)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)}})
  await service.ensureSchema();await service.ensureSchema()
  const input=id=>({appointmentId:id,rating:1,body:'改善を希望 <img src=x onerror=alert(1)>',publish:true,version:0})
  const first=await Promise.all([service.mutate(session,'POST',input('v1')),service.mutate(session,'POST',input('v1'))])
  assert.equal(first.reduce((sum,x)=>sum+x.awardedPoints,0),45)
  assert.equal((await db.pointLot.count()),1)
  assert.equal((await db.customerPointAccount.findUnique({where:{customerId:'ca'}})).availablePoints,45)
  await Promise.all(['v2','v3'].map(id=>service.mutate(session,'POST',input(id))))
  assert.equal((await db.customerPointAccount.findUnique({where:{customerId:'ca'}})).availablePoints,135)
  for(const id of ['future','unpaid','cancel','unknown','foreign','other'])await assert.rejects(service.mutate(session,'POST',input(id)))
  await assert.rejects(service.mutate(other,'PATCH',{...input('v1'),version:1}))
  await assert.rejects(service.mutate(other,'DELETE',{appointmentId:'v1',version:1}))
  for(const bad of [{rating:0},{rating:6},{rating:1.5},{body:''},{body:'x'.repeat(2001)},{publish:false}])await assert.rejects(service.mutate(session,'POST',{...input('v4'),...bad}))
  let publicHtml=await service.directory(other,new URLSearchParams('staff=one'))
  assert.ok(publicHtml.includes('&lt;script&gt;秘密&lt;/script&gt;'))
  assert.ok(publicHtml.includes('&lt;img src=x onerror=alert(1)&gt;'))
  assert.ok(!publicHtml.includes('onerror=alert(1)>'))
  assert.ok(!publicHtml.includes('/treatment/v1'))
  assert.ok(publicHtml.includes('★☆☆☆☆'))
  assert.ok(!(await service.directory(other,new URLSearchParams('staff=two'))).includes('/treatment/v1'))
  await service.mutate(session,'PATCH',{...input('v1'),rating:5,body:'編集しました',version:1})
  await assert.rejects(service.mutate(session,'PATCH',{...input('v1'),version:1}),/再読み込み/)
  await service.mutate(session,'DELETE',{appointmentId:'v1',version:2})
  publicHtml=await service.directory(other,new URLSearchParams('staff=one'));assert.ok(!publicHtml.includes('編集しました'))
  assert.equal((await service.mutate(session,'POST',{...input('v1'),body:'再投稿',version:3})).awardedPoints,0)
  assert.equal((await db.pointTransaction.count()),3)
  await db.$executeRawUnsafe(`INSERT INTO "ServiceSale" ("id","customerId","appointmentId") VALUES ('s-v1-second','ca','v1')`)
  assert.equal((await db.$transaction(tx=>lockLegacyFeedbackVisit(tx,'ca','service-sale:s-v1-second'))).duplicate,true)
  await db.$executeRawUnsafe(`INSERT INTO "PointTransaction" ("id","customerId","sourceType","sourceId","type","amount") VALUES ('old','ca','feedback','service-sale:s-legacy','earn',30)`)
  assert.equal((await service.mutate(session,'POST',input('legacy'))).awardedPoints,0)
  await db.$executeRawUnsafe(`UPDATE "PointRule" SET "active"=FALSE`)
  assert.equal((await service.mutate(session,'POST',input('inactive'))).awardedPoints,0)
  await db.$executeRawUnsafe(`UPDATE "PointRule" SET "active"=TRUE`)
  assert.equal((await service.mutate(session,'PATCH',{...input('inactive'),version:1})).awardedPoints,0)
  const answered=await service.inbox(session,new URLSearchParams('state=answered'));assert.ok(answered.includes('投稿済み 5件'))
  const productHtml=await service.inbox(session,new URLSearchParams('tab=products'));assert.ok(productHtml.includes('/u/reviews/pr'));assert.ok(productHtml.includes('80〜1,000pt'))
  await db.$executeRawUnsafe(`UPDATE "AppUser" SET "active"=FALSE WHERE "id"='ua'`)
  assert.ok(!(await service.directory(other,new URLSearchParams('staff=one'))).includes('再投稿'))
  await db.$executeRawUnsafe(`UPDATE "AppUser" SET "active"=TRUE WHERE "id"='ua'`)
  await db.$executeRawUnsafe(`DELETE FROM "ServiceSale" WHERE "appointmentId"='v1'`)
  assert.ok(!(await service.directory(other,new URLSearchParams('staff=one'))).includes('再投稿'))
  await service.mutate(session,'DELETE',{appointmentId:'v1',version:4})
  // HTTP-level authentication, CSRF and public-page access remain separate from data helpers.
  server=http.createServer(async(req,res)=>{if(!await service.handle(req,res,new URL(req.url,'http://localhost'))){res.statusCode=404;res.end()}})
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port
  assert.equal((await fetch(origin+'/api/customer/treatment-reviews',{method:'POST'})).status,401)
  assert.equal((await fetch(origin+'/u/staff',{redirect:'manual'})).status,302)
  for(const supplied of ['', 'https://evil.example'])assert.equal((await fetch(origin+'/api/customer/treatment-reviews',{method:'POST',headers:{cookie:'auth=user',...(supplied?{origin:supplied}:{}),'content-type':'application/json'},body:JSON.stringify(input('v4'))})).status,403)
  assert.equal((await fetch(origin+'/api/customer/treatment-reviews',{method:'POST',headers:{cookie:'auth=user',origin,'content-type':'application/json'},body:JSON.stringify(input('v4'))})).status,200)
  assert.equal((await fetch(origin+'/u/staff?staff=one',{headers:{cookie:'auth=other'}})).status,200)
  assert.equal((await fetch(origin+'/u/reviews/treatment/v4',{headers:{cookie:'auth=other'}})).status,404)
  const expired=await db.pointLot.findFirst({orderBy:{createdAt:'desc'}});assert.ok(expired.expiresAt>Date.now()+59*86400000)
  console.log('v690 integration PASS: completed visits, staff association, product inbox preserved, point lots/balance/expiry, concurrent/repeated saves, edit/delete/repost, inactive/legacy rules, tenant/customer authorization, public privacy/XSS, CSRF, withdrawal/void visibility')
}finally {
  if(server)await new Promise(resolve=>server.close(resolve))
  await db.$disconnect();await root.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await root.$disconnect()
}
