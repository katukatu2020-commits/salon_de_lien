const assert=require('node:assert/strict')
const crypto=require('crypto')
const {PrismaClient}=require('/app/node_modules/@prisma/client')
assert.equal(process.env.ALLOW_LOCAL_SESSION_FIXTURES,'true')
assert(new URL(process.env.DATABASE_URL).pathname==='/orimia_chat_v589','Local seeded database only')
const db=new PrismaClient()
const prefix='qa-v595-browser-'
const ids=['canonical','source','target'].map(x=>prefix+x)
const userId=prefix+'user'
async function cleanup(){
  await db.$executeRawUnsafe('DELETE FROM "CustomerMergeHistory" WHERE "id"=$1',prefix+'merge')
  await db.customerStoreLink.deleteMany({where:{appUserId:userId}})
  await db.appUser.deleteMany({where:{id:userId}})
  await db.customer.deleteMany({where:{id:{in:ids}}})
}
;(async()=>{
  if(process.argv[2]==='cleanup')return cleanup()
  if(process.argv[2]==='merge') {
    await db.$executeRawUnsafe(`INSERT INTO "CustomerMergeHistory" ("id","organizationId","sourceCustomerId","targetCustomerId","actorDisplayName","actorRole","sourceSnapshotJson","targetSnapshotJson","resultJson") VALUES ($1,'org_showcase_yohaku',$2,$3,'QA','ADMIN','{}','{}','{}')`,prefix+'merge',ids[1],ids[2]);return
  }
  await cleanup()
  await db.customer.createMany({data:ids.map((id,i)=>({id,name:id,organizationId:i?'org_showcase_yohaku':'org_salon_de_lien',storeHiddenAt:i===1?new Date():null}))})
  await db.appUser.create({data:{id:userId,customerId:ids[0],organizationId:'org_salon_de_lien',email:prefix+'@example.invalid',role:'CUSTOMER',active:true}})
  await db.customerStoreLink.createMany({data:[{appUserId:userId,organizationId:'org_salon_de_lien',customerId:ids[0]},{appUserId:userId,organizationId:'org_showcase_yohaku',customerId:ids[1]}]})
  const now=Math.floor(Date.now()/1000)
  const payload={version:1,role:'CUSTOMER',userId,customerId:ids[0],organizationId:'org_salon_de_lien',subject:prefix+'@example.invalid',issuedAt:now,expiresAt:now+3600,sessionId:crypto.randomUUID()}
  const data=Buffer.from(JSON.stringify(payload)).toString('base64url')
  console.log(JSON.stringify({token:data+'.'+crypto.createHmac('sha256',process.env.ADMIN_AUTH_SECRET).update(data).digest('base64url')}))
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect())
