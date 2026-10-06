'use strict'
const assert=require('node:assert/strict'),crypto=require('node:crypto')
const {PrismaClient}=require('/app/node_modules/@prisma/client')
const {createCatalog}=require('/app/dealer-product-master-v709/catalog.cjs')
const db=new PrismaClient(),prefix='qa-v709-',password='QaLocalOnly-v709!'
async function guard(){assert.equal(process.env.ORIMIA_ISOLATED_QA,'v680');assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name,'orimia_qa_v680_20260926')}
async function cleanup(){await guard();await db.$executeRawUnsafe('DELETE FROM "WholesaleDealer" WHERE id=ANY($1::text[])',['source','a','b','foreign'].map(s=>prefix+s))}
async function seed(){
  await guard()
  const found=await db.$queryRawUnsafe('SELECT id FROM "WholesaleDealer" WHERE "dealerCode"=$1','DLR-60EA86D040')
  assert.ok(!found.length||found[0].id===prefix+'source','Never replace an existing source dealer')
  await cleanup()
  const salt=crypto.randomBytes(16).toString('hex'),hash=`scrypt$${salt}$${crypto.scryptSync(password,salt,64).toString('hex')}`
  await db.$transaction(async tx=>{
    for(const id of ['source','a','b','foreign'])await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealer" (id,name,"loginId",email,"passwordHash","dealerCode") VALUES ($1,$2,$3,$4,$5,$6)',prefix+id,'QA709 '+id,'qa709.'+id,'qa709.'+id+'@example.invalid',hash,id==='source'?'DLR-60EA86D040':'QA709-'+id)
    await tx.$executeRawUnsafe(`INSERT INTO "WholesaleDealerProduct" (id,"dealerId","manufacturerName",name,category,"productCode","manufacturerProductCode","janCode","wholesalePrice","suggestedRetailPrice","orderUnit",description)
      SELECT 'qa-v709-p'||lpad(n::text,4,'0'),'qa-v709-source',CASE WHEN n%2=0 THEN 'QA709 中野製薬' ELSE 'QA709 ミルボン' END,'検証商品 '||lpad(n::text,4,'0'),CASE WHEN n%2=0 THEN 'スタイリング' ELSE 'GM' END,'QA709-'||lpad(n::text,4,'0'),'M-'||n,'4900000'||lpad(n::text,6,'0'),731,CASE WHEN n=4 THEN NULL ELSE 2000 END,1,'商品説明' FROM generate_series(1,4000) n`)
    await tx.$executeRawUnsafe(`UPDATE "WholesaleDealerProduct" SET name='ｵﾙﾃﾞｨｰﾌﾞ ｱﾃﾞｨｸｼｰ' WHERE id='qa-v709-p3999'`)
    await tx.$executeRawUnsafe(`INSERT INTO "WholesaleDealerProduct" (id,"dealerId","manufacturerName",name,"productCode","wholesalePrice") VALUES ('qa-v709-foreign-product','qa-v709-foreign','他社','他社専用品','QA709-PRIVATE',999)`)
    await tx.$executeRawUnsafe(`INSERT INTO "DealerSalesMember" (id,"dealerId",name,"loginId","passwordHash",role,"mustChangePassword") VALUES ('qa-v709-staff','qa-v709-a','QA709スタッフ','qa709.staff',$1,'STAFF',FALSE)`,hash)
  })
  console.log(JSON.stringify({sourceProducts:4000,loginA:'qa709.a',loginB:'qa709.b'}))
}
async function integration(){
  await guard()
  const service=createCatalog({db}),a={id:prefix+'a',role:'ADMIN'},b={id:prefix+'b',role:'ADMIN'},q=s=>new URLSearchParams(s)
  const all=await service.list(a,q(''))
  assert.equal(all.total,4000);assert.equal(all.products.length,50);assert.equal(all.masterTotal,4000)
  assert.ok(!JSON.stringify(all).includes('731'));assert.ok(!JSON.stringify(all).includes('passwordHash'))
  const filtered=await service.list(a,q('manufacturer=QA709 中野製薬&category=GM'))
  assert.deepEqual(filtered.categories,['スタイリング']);assert.equal(filtered.filters.category,'');assert.equal(filtered.total,2000)
  assert.equal((await service.list(a,q('search=4900000000002'))).total,1)
  assert.equal((await service.list(a,q('search=%'))).total,0)
  assert.equal((await service.list(a,q('page=99999'))).filters.page,80)
  const payload={products:[{id:prefix+'p0002',price:1500},{id:prefix+'p0003',price:1600}]}
  const concurrent=await Promise.all([service.importProducts(a,payload),service.importProducts(a,payload)])
  assert.equal(concurrent.reduce((n,r)=>n+r.registered,0),2)
  assert.equal(concurrent.reduce((n,r)=>n+r.skipped,0),2)
  assert.equal((await service.importProducts(a,{products:[{id:prefix+'p0002',price:1800}]})).skipped,1)
  assert.equal((await db.$queryRawUnsafe('SELECT "wholesalePrice" FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "productCode"=$2',a.id,'QA709-0002'))[0].wholesalePrice,1500)
  assert.equal((await service.importProducts(b,{products:[{id:prefix+'p0002',price:1700}]})).registered,1)
  assert.equal((await db.$queryRawUnsafe('SELECT "wholesalePrice" FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "productCode"=$2',b.id,'QA709-0002'))[0].wholesalePrice,1700)
  assert.equal((await service.list(a,q('unregistered=1'))).total,3998)
  await db.$executeRawUnsafe('UPDATE "WholesaleDealerProduct" SET active=FALSE,name=$3 WHERE "dealerId"=$1 AND "productCode"=$2',a.id,'QA709-0002','自社編集済み')
  assert.equal((await service.importProducts(a,{products:[{id:prefix+'p0002',price:1550}]})).registered,1)
  assert.equal((await db.$queryRawUnsafe('SELECT name FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "productCode"=$2',a.id,'QA709-0002'))[0].name,'自社編集済み')
  await assert.rejects(service.importProducts(a,{products:[{id:prefix+'p0005',price:1000},{id:prefix+'foreign-product',price:1000}]}),e=>e.status===409)
  assert.equal((await db.$queryRawUnsafe('SELECT id FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "productCode"=$2',a.id,'QA709-0005')).length,0)
  await db.$executeRawUnsafe('UPDATE "WholesaleDealerProduct" SET active=FALSE WHERE id=$1',prefix+'p0006')
  await assert.rejects(service.importProducts(a,{products:[{id:prefix+'p0006',price:1000}]}),e=>e.status===409)
  await assert.rejects(service.importProducts({...a,role:'STAFF'},payload),e=>e.status===403)
  const sourceRows=await db.$queryRawUnsafe('SELECT COUNT(*)::int AS count FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 AND "wholesalePrice"=731',prefix+'source');assert.equal(sourceRows[0].count,4000)
  console.log('v709 database PASS: 4000 products, cascading filters, paging/search, concurrent import, duplicate preservation, dealer independence, reactivation, atomic rollback, source isolation and role guards')
}
(async()=>{if(process.argv[2]==='restore')await cleanup();else if(process.argv[2]==='test')await integration();else await seed()})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect())
