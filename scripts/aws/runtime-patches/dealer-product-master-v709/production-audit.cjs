'use strict'
const assert=require('node:assert/strict'),{PrismaClient}=require('/app/node_modules/@prisma/client')
const {createCatalog,SOURCE_CODE}=require('/app/dealer-product-master-v709/catalog.cjs')
const db=new PrismaClient()
;(async()=>{
  const result=await db.$transaction(async tx=>{
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    const rows=await tx.$queryRawUnsafe('SELECT id,name,"dealerCode" FROM "WholesaleDealer" WHERE "dealerCode"=$1 AND active=TRUE',SOURCE_CODE)
    assert.equal(rows.length,1,'Reviewed source dealer must exist and be active')
    const expected=Number((await tx.$queryRawUnsafe('SELECT COUNT(*)::int AS total FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND active=TRUE',rows[0].id))[0].total)
    assert.ok(expected>0,'Source catalog must not be empty')
    const catalog=await createCatalog({db:tx,sourceCode:SOURCE_CODE}).list({id:'v709-read-only-source-audit',role:'ADMIN'},new URLSearchParams())
    assert.equal(catalog.masterTotal,expected);assert.equal(catalog.total,expected)
    assert.ok(catalog.products.length>0)
    for(const p of catalog.products){assert.equal(p.ownPrice,null);assert.equal(p.ownProductId,null);assert.equal(p.wholesalePrice,undefined);assert.equal(p.dealerId,undefined)}
    return {sourceName:rows[0].name,sourceCode:rows[0].dealerCode,products:expected,readOnly:true,verified:true}
  },{timeout:30000})
  console.log(JSON.stringify(result))
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect())
