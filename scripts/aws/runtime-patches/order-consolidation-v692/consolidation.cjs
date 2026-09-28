'use strict'
const fs=require('node:fs'),path=require('node:path'),{cutoffAt}=require('./order-amendments-v687')
const one=async(tx,sql,...p)=>(await tx.$queryRawUnsafe(sql,...p))[0]
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})}
const iso=v=>v==null?null:new Date(v).toISOString()
const jstDate=v=>new Date(new Date(v).getTime()+32400000).toISOString().slice(0,10)
const integer=(v,max)=>{if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v))||Number(v)>max)fail('数値の範囲を確認してください。');return Number(v)}
function period(now,minutes){
 const closesAt=cutoffAt(now,minutes??0)
 return {closesAt,businessDate:minutes==null?jstDate(now):jstDate(closesAt)}
}
function totals(o,subtotal){
 if(o.status==='CANCELLED')subtotal=0
 const fee=o.status!=='CANCELLED'&&subtotal<Number(o.shippingFreeThresholdYen||0)?Number(o.shippingPolicyFeeYen||0):0
 const tax=Math.round((subtotal+fee)*Number(o.taxRate)/100),total=subtotal+fee+tax
 if(![subtotal,fee,tax,total].every(Number.isSafeInteger)||total>2147483647||subtotal<0)fail('1伝票の合計上限を超えています。')
 return {subtotalYen:subtotal,shippingFeeYen:fee,taxYen:tax,totalYen:total}
}
async function reprice(tx,orderId){
 const o=await one(tx,'SELECT * FROM "WholesaleOrder" WHERE id=$1',orderId)
 if(!o?.consolidationClosesAt)return
 const t=totals(o,Number(o.subtotalYen))
 await tx.$executeRawUnsafe('UPDATE "WholesaleOrder" SET "shippingFeeYen"=$2,"taxYen"=$3,"totalYen"=$4,"subtotalYen"=$5 WHERE id=$1',o.id,t.shippingFeeYen,t.taxYen,t.totalYen,t.subtotalYen)
 return t
}
async function assertClosed(tx,o){
 if(!o.consolidationClosesAt)return
 const r=await one(tx,'SELECT clock_timestamp() AS now')
 if(new Date(r.now)<new Date(o.consolidationClosesAt))fail('締切までは追加発注を合算しています。締切後に出荷してください。',409)
}
async function chargeShipping(tx,o,crypto){
 if(!o.consolidationClosesAt||!o.shippingFeeYen)return
 await tx.$executeRawUnsafe(`INSERT INTO "DealerErpCharge" (id,"dealerId","organizationId","orderId","sourceId","productName","productCode",category,quantity,"unitPrice","listPrice","taxRate","salesMemberId","salesBranchId","closingDay") VALUES ($1,$2,$3,$4,$5,'送料','','送料',1,$6,$6,$7,$8,$9,$10) ON CONFLICT ("sourceId") DO NOTHING`,crypto.randomUUID(),o.dealerId,o.organizationId,o.id,'shipping:'+o.id,o.shippingFeeYen,o.taxRate,o.salesMemberId,o.salesBranchId,o.billingClosingDay)
}
async function policy(db,s){
 const row=await one(db,'SELECT * FROM "WholesaleShippingPolicy" WHERE "dealerId"=$1',s.id)
 return {feeYen:row?.feeYen||0,freeThresholdYen:row?.freeThresholdYen||0,updatedAt:iso(row?.updatedAt),canManage:!s.salon&&s.role==='ADMIN',basis:'DISCOUNTED_EX_TAX'}
}
async function savePolicy(tx,s,p){
 if(s.salon||s.role!=='ADMIN')fail('送料はディーラーの管理者のみ設定できます。',403)
 const fee=integer(p.feeYen,1000000),threshold=integer(p.freeThresholdYen,100000000)
 if(fee>0&&threshold===0)fail('送料を設定する場合は送料無料となる金額を入力してください。')
 const before=await policy(tx,s)
 if((p.expectedUpdatedAt??null)!==before.updatedAt)fail('送料設定が更新されています。再読込してください。',409)
 await tx.$executeRawUnsafe('INSERT INTO "WholesaleShippingPolicy" ("dealerId","feeYen","freeThresholdYen","updatedBy") VALUES ($1,$2,$3,$4) ON CONFLICT ("dealerId") DO UPDATE SET "feeYen"=$2,"freeThresholdYen"=$3,"updatedBy"=$4,"updatedAt"=clock_timestamp()',s.id,fee,threshold,s.memberId||s.id)
 return policy(tx,s)
}
function createConsolidation({db,crypto,erp,ErrorClass}){
 let schemaPromise
 async function ensureSchema(){
  if(!schemaPromise)schemaPromise=db.$transaction(async tx=>{
   await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(692026)')
   for(const sql of fs.readFileSync(path.join(__dirname,'order-consolidation-v692.sql'),'utf8').split(';').filter(s=>s.trim()))await tx.$executeRawUnsafe(sql)
  },{timeout:60000}).catch(e=>{schemaPromise=null;throw e})
  return schemaPromise
 }
 const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex')
 function normalize(p){
  const entries=Array.isArray(p.orders)?p.orders:[{dealerId:p.dealerId,lines:p.lines}]
  if(!entries.length||entries.length>50)fail('発注先を1〜50件選択してください。')
  const ids=new Set();let count=0
  const orders=entries.map(e=>{
   const dealerId=String(e?.dealerId||'');if(!dealerId||dealerId.length>180||ids.has(dealerId))fail('発注先を確認してください。');ids.add(dealerId)
   if(!Array.isArray(e.lines)||!e.lines.length||e.lines.length>300)fail('商品を1〜300件選択してください。')
   const quantities=new Map()
   for(const l of e.lines){const id=String(l?.dealerProductId||''),q=integer(l?.quantity,999);if(!id||id.length>180||q<1)fail('商品と数量を確認してください。');quantities.set(id,(quantities.get(id)||0)+q)}
   const lines=[...quantities].sort(([a],[b])=>a.localeCompare(b)).map(([dealerProductId,quantity])=>({dealerProductId,quantity:integer(quantity,999)}))
   count+=lines.length;return {dealerId,lines}
  }).sort((a,b)=>a.dealerId.localeCompare(b.dealerId))
  if(count>300)fail('一度に発注できる商品は合計300件までです。')
  const requestedDeliveryDate=String(p.requestedDeliveryDate||'').trim(),salonNote=String(p.salonNote||'').trim()
  if(salonNote.length>1200)fail('発注メモは1200文字以内にしてください。')
  if(requestedDeliveryDate&&(!/^20\d{2}-\d{2}-\d{2}$/.test(requestedDeliveryDate)||!Number.isFinite(Date.parse(requestedDeliveryDate))||new Date(requestedDeliveryDate).toISOString().slice(0,10)!==requestedDeliveryDate))fail('希望納品日を確認してください。')
  return {orders,requestedDeliveryDate,salonNote}
 }
 async function prepare(tx,s,input){
  // Match the ERP lock order, then read the clock so lock waits cannot cross a deadline silently.
  for(const g of input.orders)await erp.lockOrders(tx,g.dealerId)
  const now=(await one(tx,'SELECT clock_timestamp() AS now')).now
  const org=await one(tx,'SELECT "taxRate" FROM "Organization" WHERE id=$1 FOR SHARE',s.organizationId)
  if(!org)fail('店舗情報を確認できませんでした。',404)
  const prepared=[]
  for(const g of input.orders){
   const c=await one(tx,`SELECT c.id,d.name AS "dealerName",p."cutoffMinutes",COALESCE(f."feeYen",0) AS "feeYen",COALESCE(f."freeThresholdYen",0) AS "freeThresholdYen" FROM "WholesaleDealerContract" c JOIN "WholesaleDealer" d ON d.id=c."dealerId" LEFT JOIN "WholesaleOrderCutoffPolicy" p ON p."dealerId"=d.id LEFT JOIN "WholesaleShippingPolicy" f ON f."dealerId"=d.id WHERE c."organizationId"=$1 AND c."dealerId"=$2 AND c.status='ACTIVE' AND d.active FOR SHARE OF c,d`,s.organizationId,g.dealerId)
   if(!c)fail('有効なディーラー契約を確認できませんでした。',409)
   const window=period(now,c.cutoffMinutes)
   // An open order retains its original cutoff and shipping contract if settings change mid-window.
   const existing=await one(tx,`SELECT * FROM "WholesaleOrder" WHERE "dealerId"=$1 AND "organizationId"=$2 AND "consolidationClosesAt">$3 AND status<>'CANCELLED' ORDER BY "consolidationClosesAt",id LIMIT 1 FOR UPDATE`,g.dealerId,s.organizationId,now)
   if(existing&&!['ORDERED','ACCEPTED'].includes(existing.status))fail('締切前の注文が出荷処理中です。ディーラーへお問い合わせください。',409)
   const snapshot=existing||{taxRate:Number(org.taxRate??10),shippingPolicyFeeYen:c.feeYen,shippingFreeThresholdYen:c.freeThresholdYen}
   const oldLines=existing?await tx.$queryRawUnsafe('SELECT l.*,COALESCE(e.cancelled,0) AS cancelled FROM "WholesaleOrderLine" l LEFT JOIN "DealerErpOrderLine" e ON e."lineId"=l.id WHERE l."orderId"=$1 ORDER BY l.id',existing.id):[]
   const products=await tx.$queryRawUnsafe(`SELECT p.*,COALESCE(p."suggestedRetailPrice",p."wholesalePrice")::int AS "listPrice",a."discountRate" FROM "WholesaleContractProductPrice" a JOIN "WholesaleDealerProduct" p ON p.id=a."dealerProductId" AND p.active WHERE a."contractId"=$1 AND a.active AND p."dealerId"=$2 AND p.id=ANY($3::text[]) FOR SHARE OF a,p`,c.id,g.dealerId,g.lines.map(l=>l.dealerProductId))
   if(products.length!==g.lines.length)fail('現在取扱いのある商品のみ発注できます。商品一覧を更新してください。',409)
   const lines=g.lines.map(l=>{
    const product=products.find(p=>p.id===l.dealerProductId),unit=Number(product.orderUnit||1)
    if(l.quantity%unit!==0)fail(product.name+'は'+unit+'点単位で入力してください。')
    const price=Math.round(Number(product.listPrice)*(100-Number(product.discountRate))/100)
    const old=oldLines.find(x=>x.dealerProductId===product.id&&x.quantity>x.cancelled)
    if(old&&(Number(old.unitPrice)!==price||Number(old.listPrice)!==Number(product.listPrice)))fail('合算先の商品価格が改定されています。ディーラーに注文の確認を依頼してください。',409)
    if(l.quantity+Number(old?.quantity||0)>999)fail(product.name+'の合算後の数量は999点以下にしてください。')
    return {...l,product,unitPrice:price,old}
   })
   if(oldLines.filter(l=>l.quantity>l.cancelled).length+lines.filter(l=>!l.old).length>300)fail('合算後の商品数は300件以内にしてください。')
   const addedSubtotalYen=lines.reduce((n,l)=>n+l.unitPrice*l.quantity,0),existingSubtotalYen=oldLines.reduce((n,l)=>n+(l.quantity-l.cancelled)*Number(l.unitPrice),0)
   const t=totals(snapshot,existingSubtotalYen+addedSubtotalYen)
   prepared.push({dealerId:g.dealerId,dealerName:c.dealerName,existing,lines,snapshot,closesAt:existing?.consolidationClosesAt||window.closesAt,businessDate:existing?String(iso(existing.businessDate)).slice(0,10):window.businessDate,cutoffMinutes:existing?null:c.cutoffMinutes,existingSubtotalYen,addedSubtotalYen,...t})
  }
  return prepared
 }
 function preview(groups){
  const orders=groups.map(g=>({dealerId:g.dealerId,dealerName:g.dealerName,orderId:g.existing?.id||null,orderNo:g.existing?.orderNo||null,businessDate:g.businessDate,closesAt:iso(g.closesAt),existingSubtotalYen:g.existingSubtotalYen,addedSubtotalYen:g.addedSubtotalYen,subtotalYen:g.subtotalYen,shippingFeeYen:g.shippingFeeYen,taxYen:g.taxYen,totalYen:g.totalYen,shippingPolicyFeeYen:g.snapshot.shippingPolicyFeeYen,shippingFreeThresholdYen:g.snapshot.shippingFreeThresholdYen,remainingForFreeYen:Math.max(0,g.snapshot.shippingFreeThresholdYen-g.subtotalYen)}))
  const token=hash(groups.map((g,i)=>({quote:orders[i],updatedAt:iso(g.existing?.updatedAt),lines:g.lines.map(l=>[l.dealerProductId,l.quantity,l.unitPrice])})))
  return {orders,quoteToken:token,totalYen:orders.reduce((n,o)=>n+o.totalYen,0)}
 }
 async function execute(s,p,submit){
  try {
   const input=normalize(p),key=p.key==null?crypto.randomUUID():String(p.key)
   if(!/^[a-zA-Z0-9_-]{16,100}$/.test(key))fail('再送防止キーを確認してください。')
   const payloadHash=hash(input)
   return await db.$transaction(async tx=>{
    if(submit){
     await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended('order-submit:'||$1||':'||$2,0))",s.organizationId,key)
     const previous=await one(tx,'SELECT * FROM "WholesaleOrderSubmission" WHERE "organizationId"=$1 AND key=$2',s.organizationId,key)
     if(previous){if(previous.userId!==s.userId||previous.payloadHash!==payloadHash)fail('同じ送信キーで異なる発注はできません。',409);return previous.result}
    }
    const groups=await prepare(tx,s,input),quote=preview(groups)
    if(!submit)return quote
    if(p.quoteToken&&p.quoteToken!==quote.quoteToken)fail('締切・注文内容・送料条件が更新されました。もう一度発注内容を確認してください。',409)
    const result=[]
    for(const g of groups){
     let o=g.existing
     if(!o){
      const id='order_'+crypto.randomUUID(),orderNo='PO-'+g.businessDate.replaceAll('-','')+'-'+crypto.randomBytes(6).toString('hex').toUpperCase()
      await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrder" (id,"orderNo","dealerId","organizationId","orderedByUserId","orderedByName","taxRate","requestedDeliveryDate","salonNote","consolidationClosesAt","businessDate","shippingPolicyFeeYen","shippingFreeThresholdYen","orderedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8::date,NULLIF($9,''),$10,$11::date,$12,$13,clock_timestamp(),clock_timestamp(),clock_timestamp())`,id,orderNo,g.dealerId,s.organizationId,s.userId,s.displayName,g.snapshot.taxRate,input.requestedDeliveryDate||null,input.salonNote,g.closesAt,g.businessDate,g.snapshot.shippingPolicyFeeYen,g.snapshot.shippingFreeThresholdYen)
      o=await one(tx,'SELECT * FROM "WholesaleOrder" WHERE id=$1',id)
      await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderAmendment" ("orderId","cutoffMinutes","cutoffAt") VALUES ($1,$2,$3)',id,g.cutoffMinutes??0,g.closesAt)
     }
     const tracked=Boolean(await one(tx,'SELECT 1 FROM "DealerErpOrder" WHERE "orderId"=$1',o.id))
     for(const l of g.lines){
      if(l.old)await tx.$executeRawUnsafe('UPDATE "WholesaleOrderLine" SET quantity=quantity+$2,"deliveredQuantity"=CASE WHEN $3 THEN "deliveredQuantity" ELSE quantity+$2 END,"lineTotal"=(quantity+$2-$4)*"unitPrice","updatedAt"=clock_timestamp() WHERE id=$1',l.old.id,l.quantity,tracked,Number(l.old.cancelled))
      else {
       const id='line_'+crypto.randomUUID(),p=l.product
       await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrderLine" (id,"orderId","dealerProductId","manufacturerName","productName",category,"productCode","janCode","listPrice","discountRate","unitPrice",quantity,"deliveredQuantity","lineTotal") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,id,o.id,p.id,p.manufacturerName,p.name,p.category,p.productCode,p.janCode,p.listPrice,p.discountRate,l.unitPrice,l.quantity,tracked?0:l.quantity,l.unitPrice*l.quantity)
       if(tracked)await tx.$executeRawUnsafe('INSERT INTO "DealerErpOrderLine" ("lineId","orderId") VALUES ($1,$2)',id,o.id)
      }
     }
     const memo=g.existing&&input.salonNote?[o.salonNote,input.salonNote].filter(Boolean).join('\n'):o.salonNote
     if((memo||'').length>12000)fail('発注メモが長すぎます。ディーラーへお問い合わせください。')
     const delivery=input.requestedDeliveryDate||o.requestedDeliveryDate
     await tx.$executeRawUnsafe('UPDATE "WholesaleOrder" SET "subtotalYen"=$2,"shippingFeeYen"=$3,"taxYen"=$4,"totalYen"=$5,"requestedDeliveryDate"=$6::date,"salonNote"=$7,"updatedAt"=clock_timestamp() WHERE id=$1',o.id,g.subtotalYen,g.shippingFeeYen,g.taxYen,g.totalYen,delivery||null,memo)
     await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrderEvent" (id,"orderId","eventType","actorType","actorId","actorName","detailJson") VALUES ($1,$2,$3,'SALON',$4,$5,$6::jsonb)`,crypto.randomUUID(),o.id,g.existing?'ORDER_MERGED':'ORDERED',s.userId,s.displayName,JSON.stringify({addedLines:g.lines.map(l=>({dealerProductId:l.dealerProductId,quantity:l.quantity,unitPrice:l.unitPrice})),shippingFeeYen:g.shippingFeeYen,totalYen:g.totalYen,requestedDeliveryDate:input.requestedDeliveryDate,salonNote:input.salonNote,key}))
     result.push({id:o.id,orderNo:o.orderNo,status:o.status,dealerId:g.dealerId,dealerName:g.dealerName,totalYen:g.totalYen,shippingFeeYen:g.shippingFeeYen,merged:Boolean(g.existing),businessDate:g.businessDate,closesAt:iso(g.closesAt)})
    }
    await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderSubmission" ("organizationId",key,"userId","payloadHash",result) VALUES ($1,$2,$3,$4,$5::jsonb)',s.organizationId,key,s.userId,payloadHash,JSON.stringify(result))
    return result
   },{timeout:30000,maxWait:10000})
  }catch(e){if(e.status)throw new ErrorClass(e.message,e.status);throw e}
 }
 async function decorateContracts(contracts){
  if(!contracts.length)return
  const rows=await db.$queryRawUnsafe('SELECT d.id,p."cutoffMinutes",COALESCE(s."feeYen",0) AS "feeYen",COALESCE(s."freeThresholdYen",0) AS "freeThresholdYen" FROM "WholesaleDealer" d LEFT JOIN "WholesaleOrderCutoffPolicy" p ON p."dealerId"=d.id LEFT JOIN "WholesaleShippingPolicy" s ON s."dealerId"=d.id WHERE d.id=ANY($1::text[])',contracts.map(c=>c.dealerId))
  for(const c of contracts)c.shippingPolicy=rows.find(r=>r.id===c.dealerId)
 }
 return {ensureSchema,decorateContracts,quote:(s,p)=>execute(s,p,false),create:(s,p)=>execute(s,p,true)}
}
module.exports={period,totals,reprice,assertClosed,chargeShipping,policy,savePolicy,createConsolidation}
