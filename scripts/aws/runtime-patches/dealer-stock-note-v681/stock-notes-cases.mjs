import assert from 'node:assert/strict'
export async function verify({action,denied,get,sql,a,b,staff}){
  const from=await action('warehouse',a,{name:'備考テスト元',location:'元棚'})
  const to=await action('warehouse',a,{name:'備考テスト先',location:'先棚'})
  const payload={locationId:from.locationId,productId:'product-a',minimum:0}
  const current=async()=> (await get('inventory?location='+from.locationId,a)).rows[0]
  await action('stock',a,{...payload,kind:'RECEIPT',quantity:5})
  await action('stock',a,{...payload,kind:'ISSUE',quantity:1,reason:''})
  await action('stock',a,{...payload,kind:'COUNT',quantity:7,version:(await current()).version,reason:'   '})
  await action('stock',a,{...payload,kind:'TRANSFER',quantity:2,destinationId:to.locationId})
  assert.equal((await current()).onHand,5)
  assert.equal((await get('inventory?location='+to.locationId,a)).rows[0].onHand,2)
  const history=await sql('SELECT e.* FROM "DealerErpStockEvent" e JOIN "DealerErpStock" s ON s."id"=e."stockId" WHERE s."locationId" IN ($1,$2)',from.locationId,to.locationId)
  assert.equal(history.length,5)
  assert.ok(history.every(e=>e.reason===''))
  const note='仕入便の補足\n外箱に傷あり <test>'
  await action('stock',a,{...payload,kind:'RECEIPT',quantity:1,reason:' '+note+' '})
  const recorded=await sql('SELECT * FROM "DealerErpStockEvent" WHERE "stockId"=$1 AND "reason"=$2',(await current()).id,note)
  assert.equal(recorded.length,1)
  await denied('stock',a,{...payload,kind:'RECEIPT',quantity:1,reason:'a'.repeat(1001)},400)
  await denied('stock',a,{...payload,kind:'RECEIPT',quantity:0},400)
  await denied('stock',a,{...payload,kind:'ISSUE',quantity:100},409)
  await denied('stock',staff,{...payload,kind:'RECEIPT',quantity:1},403)
  await denied('stock',b,{...payload,kind:'RECEIPT',quantity:1},403)
  assert.equal((await current()).onHand,6)
  console.log('PASS v681: omitted/empty/whitespace notes, receipt/issue/count/transfer, note persistence, length, quantities and permissions')
}
