import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require=createRequire('/app/package.json')
const { PrismaClient }=require('@prisma/client')
const url=new URL(process.env.DATABASE_URL)
assert.equal(url.pathname,'/orimia_chat_v589','Only the isolated local test database may be seeded')
const db=new PrismaClient()
try {
  const owner=await db.appUser.findFirst({where:{loginId:'demo.owner'}})
  assert.ok(owner?.organizationId)
  const [staff]=await db.$queryRawUnsafe('SELECT "staffKey","staffName" FROM "ChatThread" WHERE "organizationId"=$1 LIMIT 1',owner.organizationId)
  for(let i=1;i<=60;i++) {
    const id='inbox-v589-local-'+i
    await db.customer.upsert({where:{id},create:{id,organizationId:owner.organizationId,name:'検索確認 '+String(i).padStart(3,'0'),phone:'000-5890-'+String(i).padStart(4,'0')},update:{}})
    await db.$executeRawUnsafe('INSERT INTO "ChatThread" ("id","organizationId","customerId","staffKey","staffName","updatedAt") VALUES ($1,$2,$1,$3,$4,CURRENT_TIMESTAMP - $5 * interval \'1 minute\') ON CONFLICT DO NOTHING',id,owner.organizationId,staff.staffKey,staff.staffName,i)
    await db.$executeRawUnsafe('INSERT INTO "ChatMessage" ("id","threadId","senderType","body","createdAt") VALUES ($1,$1,\'customer\',$2,CURRENT_TIMESTAMP - $3 * interval \'1 minute\') ON CONFLICT DO NOTHING',id,'次回の予約について相談したいです。 '+i,i)
  }
  console.log(JSON.stringify({localFixtures:60}))
} finally {await db.$disconnect()}
