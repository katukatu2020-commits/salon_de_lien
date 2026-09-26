import assert from 'node:assert/strict'
export async function verify({db,service,req,ok,a,b,staff}){
 const sql=(s,...p)=>db.$queryRawUnsafe(s,...p),run=(s,...p)=>db.$executeRawUnsafe(s,...p)
 const salonHeaders={'x-fixture-salon':'1'}
 const before=JSON.stringify(await sql('SELECT * FROM "WholesaleDealerContract" ORDER BY id'))
 const invites=await sql('SELECT COUNT(*)::int AS n FROM "WholesaleDealerInvite"')
 for(const role of ['ADMIN','STAFF']){
  await run('UPDATE "AppUser" SET role=$1 WHERE id=\'salon-user\'',role)
  for(const route of ['contracts/code','invites']){
   const r=await req('/api/admin/wholesale/'+route,'',{dealerCode:'ERP-b',email:'blocked@example.test',name:'Blocked',loginId:'blocked'},salonHeaders)
   assert.equal(r.status,403,r.content);assert.match(r.data.error,/ディーラー側/)
  }
 }
 await run('UPDATE "AppUser" SET role=\'ADMIN\' WHERE id=\'salon-user\'')
 assert.equal((await req('/api/admin/wholesale/contracts/code','',{dealerCode:'ERP-b'})).status,401)
 assert.equal((await req('/api/admin/wholesale/contracts/code','',{dealerCode:'ERP-b'},{...salonHeaders,Origin:'https://evil.example'})).status,403)
 await assert.rejects(service.requestDealerConnectionByCode({organizationId:'salon-a',role:'ADMIN'},{dealerCode:'ERP-b'}),e=>e.status===403)
 assert.equal(JSON.stringify(await sql('SELECT * FROM "WholesaleDealerContract" ORDER BY id')),before)
 assert.deepEqual(await sql('SELECT COUNT(*)::int AS n FROM "WholesaleDealerInvite"'),invites)
 await run(`INSERT INTO "Organization" VALUES ('salon-c','新しい美容室','TEST-C')`)
 const registered=await ok('/api/dealer/contracts',a,{salonCode:'TEST-C'})
 assert.equal(registered.contract.status,'ACTIVE');assert.equal(registered.organization.id,'salon-c')
 assert.equal((await req('/api/dealer/contracts','',{salonCode:'TEST-C'})).status,401)
 const linked=await ok('/api/dealer/contracts',b,{salonCode:'TEST-A'})
 assert.equal(linked.contract.status,'ACTIVE')
 await run('ALTER TABLE "Organization" ADD COLUMN "taxRate" INTEGER DEFAULT 10')
 await run('ALTER TABLE "Product" ADD COLUMN "manufacturerName" TEXT, ADD COLUMN "name" TEXT, ADD COLUMN "category" TEXT, ADD COLUMN "retailPrice" INTEGER, ADD COLUMN "stockQuantity" INTEGER, ADD COLUMN "imageUrl" TEXT, ADD COLUMN "organizationId" TEXT, ADD COLUMN "active" BOOLEAN DEFAULT TRUE')
 await run('CREATE TABLE "OrganizationStoreProfile" ("organizationId" TEXT PRIMARY KEY,"phone" TEXT,"postalCode" TEXT,"prefecture" TEXT,"city" TEXT,"addressLine1" TEXT,"addressLine2" TEXT)')
 await run(`INSERT INTO "WholesaleContractProductPrice" (id,"contractId","dealerProductId","discountRate") VALUES ('qa-price-a','contract-a','product-a',20),('qa-price-b',$1,'product-b',10)`,linked.contract.id)
 const boot=await ok('/api/admin/wholesale/bootstrap?dealerId=all','',undefined,salonHeaders)
 assert.equal(boot.organization.publicCode,'TEST-A');assert.equal(boot.catalogProducts.length,2)
 assert.deepEqual(boot.catalogProducts.map(p=>p.unitPrice).sort((a,b)=>a-b),[800,1800])
 assert.deepEqual(new Set(boot.catalogProducts.map(p=>p.dealerId)),new Set(['dealer-a','dealer-b']))
 const result=await ok('/api/admin/wholesale/orders','',{salonNote:'v686 across-page cart',orders:[{dealerId:'dealer-a',lines:[{dealerProductId:'product-a',quantity:2}]},{dealerId:'dealer-b',lines:[{dealerProductId:'product-b',quantity:3}]}]},salonHeaders)
 assert.equal(result.orders.length,2)
 assert.deepEqual(result.orders.map(o=>o.totalYen).sort((a,b)=>a-b),[1760,5940])
 const details=await sql('SELECT "dealerProductId",quantity FROM "WholesaleOrderLine" WHERE "orderId"=ANY($1::text[]) ORDER BY "dealerProductId"',result.orders.map(o=>o.id))
 assert.deepEqual(details,[{dealerProductId:'product-a',quantity:2},{dealerProductId:'product-b',quantity:3}])
 await run('UPDATE "WholesaleDealerContract" SET status=\'SUSPENDED\' WHERE id=$1',linked.contract.id)
 assert.equal((await ok('/api/admin/wholesale/bootstrap?dealerId=all','',undefined,salonHeaders)).catalogProducts.length,1)
 assert.equal((await req('/api/admin/wholesale/orders','',{dealerId:'dealer-b',lines:[{dealerProductId:'product-b',quantity:1}]},salonHeaders)).status,409)
 console.log('v686 integration PASS: salon admin/staff cannot link or invite, dealer registration retained, contracts unchanged, tenant catalog and split-order totals, suspended contract rejection')
}
