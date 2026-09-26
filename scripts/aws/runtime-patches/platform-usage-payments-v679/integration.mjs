import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import http from 'node:http'
import {createRequire} from 'node:module'
const require=createRequire('/app/package.json'),{PrismaClient}=require('@prisma/client')
const {createPlatformUsagePayments,paymentState,dueDate,jstToday}=require('/app/platform-usage-payments-v679')
const {createPlatformOperatorService,pageShell,signSession,operatorConfig}=require('/app/platform-operator')
const {createBusinessAccountApprovalService}=require('/app/business-account-approvals-v643')
if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL required')
const schema='usage_fees_'+crypto.randomBytes(8).toString('hex'),url=new URL(process.env.TEST_DATABASE_URL)
url.searchParams.set('connection_limit','8')
const bootstrap=new PrismaClient({datasources:{db:{url:url.href}}})
await bootstrap.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`)
url.searchParams.set('schema',schema)
const db=new PrismaClient({datasources:{db:{url:url.href}}})
process.env.PLATFORM_OPERATOR_EMAIL='operator@example.test'
process.env.PLATFORM_OPERATOR_AUTH_SECRET='v679-fixture-only-secret-000000000000000000000000000'
const salt='01020304050607080900010203040506'
process.env.PLATFORM_OPERATOR_PASSWORD_HASH='scrypt$'+salt+'$'+crypto.scryptSync('Fixture-v679-Only!',salt,64).toString('hex')
const platform=createPlatformOperatorService({prisma:db,crypto})
const service=createPlatformUsagePayments({prisma:db,crypto,operatorSession:platform.session,renderPage:pageShell,now:()=>new Date('2026-09-26T12:00:00+09:00')})
const approvals=createBusinessAccountApprovalService({prisma:db,crypto,operatorSession:platform.session,usageFees:service,baseDashboardProvider:async()=>({}),renderBaseDashboard:()=>pageShell('運営ダッシュボード','<main class="main"><h1>運営ダッシュボード</h1></main>',true)})
let base,keeping=false
const server=http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://local')
    if(await service.handle(req,res,u))return
    if(await approvals.handle(req,res,u))return
    if(await platform.handle(req,res,u))return
    res.statusCode=404;res.end()
  }catch(e){console.error(e);res.statusCode=500;res.end('fixture error')}
})
const cookie='lien_platform_operator_session='+signSession(crypto,operatorConfig())
const params=o=>new URLSearchParams(Object.entries(o).map(([k,v])=>[k,String(v)]))
async function request(path,body,auth=cookie,origin){const r=await fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{Cookie:auth,...(body?{Origin:origin||base,'Content-Type':'application/x-www-form-urlencoded'}:{})},body:body?params(body):undefined});return {status:r.status,headers:r.headers,body:await r.text()}}
async function ok(path,body){const r=await request(path,body);assert.equal(r.status,303,r.body);return r}
const api=(type,id)=>'/api/platform/usage-payments/'+type+'/'+id
const profileInput={version:0,month:'2026-09',firstMonth:'2026-08',lastMonth:'',monthlyAmount:12800,dueDay:'',note:'',debitReady:'on'}
const monthInput={version:0,amount:12800,dueDate:'2026-09-25',status:'UNPAID',paidAmount:'',paidDate:'',actualMethod:'DEBIT',note:'',reason:''}
async function saved(type,id,month){return (await db.$queryRawUnsafe('SELECT * FROM "PlatformFeeMonth" WHERE "accountType"=$1 AND "targetId"=$2 AND "month"=$3',type,id,month))[0]}
async function cleanup(){await new Promise(r=>server.close(r));await db.$disconnect();await bootstrap.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);await bootstrap.$disconnect()}
try{
  const ddl=[
    `CREATE TABLE "Organization" ("id" TEXT PRIMARY KEY,"name" TEXT NOT NULL,"createdAt" TIMESTAMPTZ DEFAULT '2026-08-01')`,
    `CREATE TABLE "AppUser" ("id" TEXT PRIMARY KEY,"organizationId" TEXT,"role" TEXT,"active" BOOLEAN DEFAULT TRUE,"displayName" TEXT,"loginId" TEXT,"email" TEXT,"createdAt" TIMESTAMPTZ DEFAULT NOW())`,
    `CREATE TABLE "BillingPlan" ("planKey" TEXT PRIMARY KEY,"displayName" TEXT,"monthlyAmount" INTEGER)`,
    `CREATE TABLE "OrganizationBilling" ("organizationId" TEXT PRIMARY KEY,"planKey" TEXT,"billingRequiredAt" TIMESTAMPTZ,"subscriptionStatus" TEXT DEFAULT 'active')`,
    `CREATE TABLE "WholesaleDealer" ("id" TEXT PRIMARY KEY,"name" TEXT,"active" BOOLEAN DEFAULT TRUE,"createdAt" TIMESTAMPTZ DEFAULT '2026-08-01',"representativeName" TEXT,"email" TEXT,"loginId" TEXT)`,
    `CREATE TABLE "WholesaleDealerBilling" ("dealerId" TEXT PRIMARY KEY,"displayName" TEXT,"monthlyAmount" INTEGER,"billingRequiredAt" TIMESTAMPTZ,"subscriptionStatus" TEXT DEFAULT 'active')`
  ]
  for(const sql of ddl)await db.$executeRawUnsafe(sql)
  await approvals.ensureSchema();await service.ensureSchema();await service.ensureSchema()
  await db.$executeRawUnsafe(`INSERT INTO "BillingPlan" VALUES ('take','竹プラン',12800)`)
  for(const [id,name,active] of [['salon-a','サロンA',true],['salon-b','同一オーナー2号店',true],['salon-x','停止中サロン',false],['salon-unconfigured','未設定サロン',true]]){
    await db.$executeRawUnsafe('INSERT INTO "Organization" ("id","name") VALUES ($1,$2)',id,name)
    await db.$executeRawUnsafe(`INSERT INTO "AppUser" ("id","organizationId","role","active","displayName","loginId","email") VALUES ($1,$1,'ADMIN',$2,'責任者',$1,'shared@example.test')`,id,active)
    await db.$executeRawUnsafe(`INSERT INTO "OrganizationBilling" ("organizationId","planKey") VALUES ($1,'take')`,id)
  }
  for(const id of ['dealer-a','dealer-b']){
    await db.$executeRawUnsafe('INSERT INTO "WholesaleDealer" ("id","name","email","loginId") VALUES ($1,$1,\'shared@example.test\',$1)',id)
    await db.$executeRawUnsafe(`INSERT INTO "WholesaleDealerBilling" ("dealerId","displayName","monthlyAmount") VALUES ($1,'ディーラープラン',9800)`,id)
  }
  await new Promise(r=>server.listen(Number(process.env.PORT||3186),'0.0.0.0',r));base='http://127.0.0.1:'+server.address().port;process.env.APP_URL=base
  assert.equal((await request('/platform/payments',null,'')).status,302)
  for(const auth of ['','lien_admin_session=salon','orimia_dealer_session=dealer'])assert.equal((await request(api('salon','salon-a')+'/profile',profileInput,auth)).status,401)
  assert.equal((await request(api('salon','salon-a')+'/profile',profileInput,cookie,'https://evil.example')).status,403)
  assert.equal((await request(api('salon','missing')+'/profile',profileInput)).status,404)
  assert.equal((await request('/platform/payments')).status,200)
  assert.equal((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "PlatformFeeMonth"'))[0].n,0,'GET never creates records')
  assert.equal((await service.load('2026-09')).every(a=>a.state==='UNCONFIGURED'),true)
  assert.equal(dueDate('2028-02',0),'2028-02-29');assert.equal(dueDate('2026-02',0),'2026-02-28');assert.equal(dueDate('2026-12',null),'')
  assert.equal(jstToday(new Date('2026-08-31T15:00:00Z')),'2026-09-01')
  assert.equal(dueDate('2026-02',31),'2026-02-28')
  for(const id of ['salon-a','salon-b','salon-x'])await ok(api('salon',id)+'/profile',profileInput)
  await ok(api('dealer','dealer-a')+'/profile',{...profileInput,firstMonth:'2026-09',monthlyAmount:9800,dueDay:27})
  const data=await service.load('2026-09')
  assert.equal(data.find(a=>a.id==='salon-a').method,'DEBIT');assert.equal(data.find(a=>a.id==='dealer-a').method,'TRANSFER')
  assert.equal(data.find(a=>a.id==='salon-a').state,'NOT_RECORDED')
  assert.equal((await request(api('salon','salon-a')+'/month/2026-07',monthInput)).status,400)
  assert.equal((await request(api('dealer','dealer-a')+'/month/2026-09',{...monthInput,status:'FAILED',reason:'不可'})).status,400)
  await ok(api('salon','salon-a')+'/month/2026-08',{...monthInput,dueDate:'2026-08-31',status:'PAID',paidDate:'2026-08-25',actualMethod:'TRANSFER'})
  assert.equal((await saved('SALON','salon-a','2026-08')).method,'TRANSFER')
  assert.equal((await request(api('salon','salon-a')+'/profile',{...profileInput,version:1,firstMonth:'2026-07',reason:'変更'})).status,409)
  assert.equal((await request(api('salon','salon-a')+'/month/2026-09',{...monthInput,status:'PAID',paidDate:'2026-09-27'})).status,400)
  const made=await ok('/api/platform/usage-payments/generate',{month:'2026-09'});assert.ok(made.headers.get('location').includes('generated=3'))
  await ok('/api/platform/usage-payments/generate',{month:'2026-09'})
  assert.equal((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "PlatformFeeMonth" WHERE "month"=\'2026-09\''))[0].n,3)
  assert.equal(await saved('SALON','salon-x','2026-09'),undefined,'suspended accounts excluded from bulk generation')
  assert.equal((await saved('DEALER','dealer-a','2026-09')).amount,9800)
  await ok(api('salon','salon-a')+'/month/2026-09',{...monthInput,version:1,status:'PARTIAL',paidAmount:3000,paidDate:'2026-09-25',reason:'一部入金確認'})
  assert.equal((await saved('SALON','salon-a','2026-09')).paidAmount,3000)
  assert.equal((await request(api('salon','salon-a')+'/month/2026-09',{...monthInput,version:1})).status,409,'stale write rejected')
  const concurrent=await Promise.all([request(api('salon','salon-a')+'/month/2026-09',{...monthInput,version:2,status:'PAID',paidDate:'2026-09-26',reason:'全額確認'}),request(api('salon','salon-a')+'/month/2026-09',{...monthInput,version:2,status:'PAID',paidDate:'2026-09-26',reason:'全額確認'})])
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[303,409])
  let r=await saved('SALON','salon-a','2026-09');assert.equal(r.paidAmount,12800);assert.equal(r.version,3)
  assert.equal((await request(api('salon','salon-a')+'/month/2026-09',{...monthInput,version:3})).status,400,'paid reset requires reason')
  await ok(api('salon','salon-a')+'/month/2026-09',{...monthInput,version:3,status:'FAILED',reason:'誤記訂正・残高不足',note:'残高不足'})
  r=await saved('SALON','salon-a','2026-09');assert.equal(r.paidAmount,0);assert.equal(r.paidDate,null)
  await ok(api('salon','salon-a')+'/month/2026-09',{...monthInput,version:4,status:'PAID',paidDate:'2026-09-26',actualMethod:'TRANSFER',reason:'再振込で入金確認'})
  r=await saved('SALON','salon-a','2026-09');assert.equal(r.method,'DEBIT');assert.equal(r.actualMethod,'TRANSFER')
  assert.equal((await request('/platform/payments?month=2026-09&type=SALON&state=PAID')).body.includes('dealer-a'),false)
  assert.equal((await request('/platform/payments?month=2026-09&type=SALON&state=PAID')).body.includes('12,800円'),true)
  assert.equal(paymentState({}, {...monthInput,dueDate:'2026-09-25'},'2026-09','2026-09-26'),'OVERDUE')
  assert.equal(paymentState({}, {...monthInput,dueDate:'2026-09-27'},'2026-09','2026-09-26'),'SCHEDULED')
  await ok(api('salon','salon-b')+'/month/2026-09',{...monthInput,version:1,status:'EXEMPT',reason:'無料月'})
  await ok(api('dealer','dealer-a')+'/profile',{...profileInput,version:1,firstMonth:'2026-09',monthlyAmount:9900,dueDay:0,lastMonth:'2026-10',reason:'次月より改定',note:'<script>alert(1)</script>'})
  await Promise.all([ok('/api/platform/usage-payments/generate',{month:'2026-10'}),ok('/api/platform/usage-payments/generate',{month:'2026-10'})])
  assert.equal((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "PlatformFeeAudit" WHERE "accountType"=\'DEALER\' AND "targetId"=\'dealer-a\' AND "month"=\'2026-10\''))[0].n,1,'concurrent generation has one audited record')
  assert.equal((await saved('DEALER','dealer-a','2026-09')).amount,9800,'existing monthly snapshot unchanged')
  assert.equal((await saved('DEALER','dealer-a','2026-10')).amount,9900)
  assert.equal((await saved('DEALER','dealer-a','2026-10')).method,'DEBIT')
  await ok('/api/platform/usage-payments/generate',{month:'2026-11'})
  assert.equal(await saved('DEALER','dealer-a','2026-11'),undefined,'ended profile is not generated')
  const detail=await request('/platform/payments/dealer/dealer-a?month=2026-09')
  assert.equal(detail.status,200);assert.ok(detail.body.includes('&lt;script&gt;'));assert.ok(!detail.body.includes('<script>alert'))
  const dashboard=await request('/platform');assert.equal(dashboard.status,200,dashboard.body);assert.ok(dashboard.body.includes('今月の利用料'));assert.ok(dashboard.body.includes('入金済み'))
  assert.ok((await db.$queryRawUnsafe('SELECT COUNT(*)::int AS n FROM "PlatformFeeAudit" WHERE "accountType"=\'SALON\' AND "targetId"=\'salon-a\''))[0].n>=7)
  assert.equal((await db.$queryRawUnsafe('SELECT "subscriptionStatus" FROM "OrganizationBilling" WHERE "organizationId"=\'salon-a\''))[0].subscriptionStatus,'active','payment correction never changes account access')
  assert.equal((await request('/platform/payments?month=invalid')).status,400)
  assert.equal((await request(api('salon','salon-b')+'/month/2026-09',{...monthInput,version:2,status:'PARTIAL',paidAmount:15000,paidDate:'2026-09-20',reason:'invalid'})).status,400)
  await db.$executeRawUnsafe(`INSERT INTO "Organization" ("id","name") SELECT 'pagination-'||n,'ページ検証'||n FROM generate_series(1,21) n`)
  const paged=await request('/platform/payments?month=2026-09&q='+encodeURIComponent('ページ検証')+'&page=2')
  assert.equal(paged.status,200);assert.match(paged.body,/2 \/ 2/)
  assert.equal((paged.body.match(/確認・記録/g)||[]).length,1)
  await db.$executeRawUnsafe(`DELETE FROM "Organization" WHERE "id" LIKE 'pagination-%'`)
  console.log('PASS: monthly transfer/debit, manual payment/partial/failure/correction, immutable monthly amounts, audit, permissions, CSRF, concurrency, month ends, period and dashboard')
  if(process.env.KEEP_FIXTURE==='1'){
    keeping=true
    console.log('Usage-fee fixture ready at '+base)
    const stop=async()=>{await cleanup();process.exit(0)};process.on('SIGTERM',stop);process.on('SIGINT',stop)
  }
}finally{if(!keeping)await cleanup()}
