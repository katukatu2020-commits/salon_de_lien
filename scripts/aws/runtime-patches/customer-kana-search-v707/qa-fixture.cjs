'use strict'
const assert = require('node:assert/strict')
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const db = new PrismaClient(), org = 'org_showcase_yohaku', prefix = 'qa-v707-kana-'
async function main() {
  assert.equal(process.env.ORIMIA_ISOLATED_QA, 'v680')
  const [database] = await db.$queryRawUnsafe('SELECT current_database() AS db')
  assert.equal(database.db, 'orimia_qa_v680_20260926')
  if (process.argv[2] === 'restore') {
    await db.customer.deleteMany({where:{id:{startsWith:prefix}}})
    return console.log('v707 isolated fixtures removed')
  }
  assert.equal(process.argv[2], 'seed')
  assert.equal(await db.customer.count({where:{id:{startsWith:prefix}}}),0)
  const other = await db.organization.findFirst({where:{id:{not:org}},select:{id:true}})
  assert.ok(other)
  const records = [
    {key:'hana',name:'山本 はな',last:'ヤマモト',first:'ハナ',phone:'000-0707-0001'},
    {key:'empty',name:'フリガナ未登録確認',last:null,first:null},
    {key:'hidden',name:'非表示確認',last:'ヤマモト',first:'ハナ',storeHiddenAt:new Date()},
    {key:'deleted',name:'退会確認',last:'ヤマモト',first:'ハナ',deletedAt:new Date()},
    {key:'foreign',name:'他店舗確認',last:'ヤマモト',first:'ハナ',organizationId:other.id},
    ...Array.from({length:52},(_,i)=>({key:'page-'+String(i).padStart(2,'0'),name:'ページ確認 '+i,last:'ページケンサ',first:'イチ'}))
  ]
  await db.$transaction(async tx => {
    for (const row of records) {
      const id = prefix+row.key
      await tx.customer.create({data:{id,name:row.name,phone:row.phone,organizationId:row.organizationId||org,deletedAt:row.deletedAt,storeHiddenAt:row.storeHiddenAt}})
      await tx.$executeRawUnsafe('UPDATE "Customer" SET "lastNameKana"=$2,"firstNameKana"=$3 WHERE "id"=$1',id,row.last,row.first)
    }
  },{timeout:30000})
  const h = require('/app/customer-kana-v707.cjs'), rows = await h.loadCustomerKanaRows(db,org)
  assert.deepEqual(h.matchingCustomerKanaIds(rows,'ヤマモトハナ').filter(id=>id.startsWith(prefix)),[prefix+'hana'])
  console.log('v707 fixture seeded; database tenant, hidden and withdrawn isolation PASS')
}
main().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>db.$disconnect())
