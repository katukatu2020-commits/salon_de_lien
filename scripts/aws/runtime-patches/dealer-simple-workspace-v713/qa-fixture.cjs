'use strict'
const assert=require('node:assert/strict')
const {PrismaClient}=require('/app/node_modules/@prisma/client')
const db=new PrismaClient(),id='qa-v713-staff'
async function run(){
  assert.equal(process.env.ORIMIA_ISOLATED_QA,'v680')
  assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name,'orimia_qa_v680_20260926')
  if(process.argv[2]==='restore'){
    await db.$executeRawUnsafe('DELETE FROM "DealerSalesMember" WHERE id=$1 AND "loginId"=$2',id,'qa713.staff')
    return
  }
  if(process.argv[2]==='procure'){
    await db.$executeRawUnsafe('UPDATE "DealerSalesMember" SET "canProcure"=TRUE WHERE id=$1 AND "loginId"=$2',id,'qa713.staff')
    return
  }
  const dealer=(await db.$queryRawUnsafe('SELECT id,"passwordHash" FROM "WholesaleDealer" WHERE "loginId"=$1','dealer.browser.v584.mtsptddu'))[0]
  assert(dealer)
  await db.$executeRawUnsafe(`INSERT INTO "DealerSalesMember" (id,"dealerId",name,"loginId","passwordHash",role,"mustChangePassword","canProcure") VALUES ($1,$2,'QA713 Staff','qa713.staff',$3,'STAFF',FALSE,FALSE)`,id,dealer.id,dealer.passwordHash)
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect())
