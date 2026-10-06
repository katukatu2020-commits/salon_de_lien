'use strict'
const assert=require('node:assert/strict'),{PrismaClient}=require('/app/node_modules/@prisma/client')
const db=new PrismaClient(),customerId='showcase-yohaku-customer-001',prefix='qa-v708-comment-'
async function main(){
  assert.equal(process.env.ORIMIA_ISOLATED_QA,'v680')
  assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS db'))[0].db,'orimia_qa_v680_20260926')
  if(process.argv[2]==='restore'){
    await db.$transaction(async tx=>{
      await tx.$executeRawUnsafe('DELETE FROM "CustomerHistoryMemo" WHERE "subjectKey" = ANY($1::text[])',['VISIT:'+prefix+'a','VISIT:'+prefix+'b','SALE:'+prefix+'sale'])
      await tx.visit.deleteMany({where:{id:{in:[prefix+'a',prefix+'b']},customerId}})
      await tx.serviceSale.deleteMany({where:{id:prefix+'sale',customerId}})
    })
    return console.log('v708 isolated fixtures removed')
  }
  assert.equal(process.argv[2],'seed')
  assert.equal(await db.visit.count({where:{id:{startsWith:prefix}}}),0)
  const customer=await db.customer.findUnique({where:{id:customerId},select:{organizationId:true}})
  assert.equal(customer.organizationId,'org_showcase_yohaku')
  await db.$transaction(async tx=>{
    for(const [key,time] of [['a','01'],['b','04']])await tx.visit.create({data:{id:prefix+key,customerId,visitedAt:new Date('2026-06-15T'+time+':00:00Z'),performedStyle:'QA708 履歴 '+key,stylistName:'雨宮 透'}})
    await tx.serviceSale.create({data:{id:prefix+'sale',customerId,title:'QA708 会計履歴',amount:100,paidAt:new Date('2026-06-16T01:00:00Z')}})
  })
  const foreign=await db.customer.findFirst({where:{organizationId:{not:customer.organizationId},deletedAt:null,storeHiddenAt:null},select:{id:true}})
  const other=await db.visit.findFirst({where:{customerId:{not:customerId},customer:{organizationId:customer.organizationId,deletedAt:null}},select:{id:true}})
  console.log(JSON.stringify({customerId,foreignCustomerId:foreign.id,otherVisitId:other.id}))
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect())
