'use strict'
const assert = require('node:assert/strict')
const { PrismaClient } = require('/app/node_modules/@prisma/client')
const db = new PrismaClient(), prefix = 'qa-v715-', staffId = prefix + 'staff'
const orderIds = ['desktop', 'mobile', 'tracked'].map(key => prefix + key)
async function run() {
  assert.equal(process.env.ORIMIA_ISOLATED_QA, 'v680')
  assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name, 'orimia_qa_v680_20260926')
  const dealer = (await db.$queryRawUnsafe('SELECT id,"passwordHash" FROM "WholesaleDealer" WHERE "loginId"=$1', 'dealer.browser.v584.mtsptddu'))[0]
  assert(dealer)
  if (process.argv[2] === 'snapshot') {
    const orders = await db.$queryRawUnsafe('SELECT * FROM "WholesaleOrder" WHERE id=ANY($1::text[]) ORDER BY id', orderIds)
    const lines = await db.$queryRawUnsafe('SELECT * FROM "WholesaleOrderLine" WHERE "orderId"=ANY($1::text[]) ORDER BY id', orderIds)
    const events = await db.$queryRawUnsafe('SELECT * FROM "WholesaleOrderEvent" WHERE "orderId"=ANY($1::text[]) ORDER BY id', orderIds)
    const stocks = await db.$queryRawUnsafe('SELECT * FROM "DealerErpStock" WHERE "dealerId"=$1 ORDER BY id', dealer.id)
    const charges = await db.$queryRawUnsafe('SELECT * FROM "DealerErpCharge" WHERE "dealerId"=$1 ORDER BY id', dealer.id)
    const products = await db.$queryRawUnsafe('SELECT * FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 ORDER BY id', dealer.id)
    console.log(JSON.stringify({ orders, lines, events, stocks, charges, products }))
    return
  }
  if (process.argv[2] === 'restore') {
    await db.$transaction(async tx => {
      for (const table of ['DealerErpOrderLine', 'DealerErpOrder', 'WholesaleOrderEvent', 'WholesaleOrderLine']) {
        await tx.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "orderId"=ANY($1::text[])`, orderIds)
      }
      await tx.$executeRawUnsafe('DELETE FROM "WholesaleOrder" WHERE id=ANY($1::text[]) AND "dealerId"=$2', orderIds, dealer.id)
      await tx.$executeRawUnsafe('DELETE FROM "DealerSalesMember" WHERE id=$1 AND "loginId"=$2 AND "dealerId"=$3', staffId, 'qa715.staff', dealer.id)
    })
    return
  }
  assert.equal(process.argv[2], 'setup')
  await db.$transaction(async tx => {
    assert.equal((await tx.$queryRawUnsafe('SELECT id FROM "WholesaleOrder" WHERE id=ANY($1::text[])', orderIds)).length, 0)
    const salon = (await tx.$queryRawUnsafe('SELECT "organizationId" FROM "WholesaleDealerContract" WHERE "dealerId"=$1 AND status=\'ACTIVE\' LIMIT 1', dealer.id))[0]
    const products = await tx.$queryRawUnsafe('SELECT id FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 ORDER BY id LIMIT 2', dealer.id)
    assert(salon && products.length === 2)
    await tx.$executeRawUnsafe(`INSERT INTO "DealerSalesMember" (id,"dealerId",name,"loginId","passwordHash",role,"mustChangePassword","canProcure") VALUES ($1,$2,'QA715 Staff','qa715.staff',$3,'STAFF',FALSE,FALSE)`, staffId, dealer.id, dealer.passwordHash)
    for (const orderId of orderIds) {
      await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrder" (id,"orderNo","dealerId","organizationId",status,"orderedByName","dealerNote","subtotalYen","taxYen","totalYen","deliveryNo","orderedAt","acceptedAt","shippedAt") VALUES ($1,$2,$3,$4,'SHIPPED','QA715','QA715 existing memo',3542,354,3896,$5,NOW()-INTERVAL '2 days',NOW()-INTERVAL '1 day',NOW())`, orderId, orderId.toUpperCase(), dealer.id, salon.organizationId, 'DN-' + orderId)
      for (let i = 0; i < 2; i++) {
        const price = [1782, 1760][i]
        await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrderLine" (id,"orderId","dealerProductId","manufacturerName","productName",category,"productCode","janCode","unitPrice",quantity,"deliveredQuantity","lineTotal","listPrice","discountRate") VALUES ($1,$2,$3,'QA715','QA715 delivery item','QA','QA715-00' || $4,'000000000000' || $4,$5,1,1,$5,$6,$7)`, orderId + '-line-' + i, orderId, products[i].id, String(i), price, [1980, 2200][i], [10, 20][i])
      }
      if (orderId.endsWith('tracked')) {
        await tx.$executeRawUnsafe('INSERT INTO "DealerErpOrder" ("orderId","dealerId") VALUES ($1,$2)', orderId, dealer.id)
        await tx.$executeRawUnsafe('INSERT INTO "DealerErpOrderLine" ("lineId","orderId") SELECT id,"orderId" FROM "WholesaleOrderLine" WHERE "orderId"=$1', orderId)
      }
    }
  })
  console.log(JSON.stringify({ orderIds }))
}
run().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => db.$disconnect())
