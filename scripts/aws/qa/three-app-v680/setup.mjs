import crypto from 'node:crypto'
import {createRequire} from 'node:module'
const require=createRequire('/app/package.json'),{PrismaClient}=require('@prisma/client')
if(!process.env.DATABASE_URL?.includes('/orimia_qa_v680_20260926?')||process.env.ORIMIA_ISOLATED_QA!=='v680')throw Error('Isolated database required')
const db=new PrismaClient()
const password='QaLocalOnly-v680!'
function hash(){const s=crypto.randomBytes(16).toString('hex');return 'scrypt$'+s+'$'+crypto.scryptSync(password,s,64).toString('hex')}
try{
  const users=await db.$queryRawUnsafe(`SELECT "id","loginId","role"::text,"organizationId","customerId","active" FROM "AppUser" WHERE "loginId" IN ('demo.hana','demo.owner','master')`)
  for(const u of users)await db.$executeRawUnsafe('UPDATE "AppUser" SET "passwordHash"=$2,"active"=TRUE WHERE "id"=$1',u.id,hash())
  console.log('Fixture users',JSON.stringify(users))
  const dealers=await db.$queryRawUnsafe('SELECT "id","loginId","name","active" FROM "WholesaleDealer" ORDER BY "createdAt"')
  console.log('Fixture dealers',JSON.stringify(dealers))
  const members=await db.$queryRawUnsafe('SELECT "id","dealerId","loginId","role","active" FROM "DealerSalesMember" ORDER BY "createdAt"')
  console.log('Fixture members',JSON.stringify(members))
  for(const d of dealers)await db.$executeRawUnsafe('UPDATE "WholesaleDealer" SET "passwordHash"=$2,"active"=TRUE WHERE "id"=$1',d.id,hash())
  for(const m of members)await db.$executeRawUnsafe('UPDATE "DealerSalesMember" SET "passwordHash"=$2 WHERE "id"=$1',m.id,hash())
}finally{await db.$disconnect()}
