'use strict'
const fs=require('node:fs'),path=require('node:path')
const iso=value=>value==null?null:new Date(value).toISOString()
function cutoffAt(orderedAt,minutes){
 if(minutes==null)return null
 if(!Number.isInteger(minutes)||minutes<0||minutes>1439)throw Error('Invalid cutoff minutes')
 const timestamp=new Date(orderedAt).getTime(),day=86400000,jst=9*3600000
 if(!Number.isFinite(timestamp))throw Error('Invalid order timestamp')
 let cutoff=Math.floor((timestamp+jst)/day)*day+minutes*60000-jst
 if(timestamp>=cutoff)cutoff+=day
 return new Date(cutoff)
}
const timeText=minutes=>minutes==null?null:String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0')
function createOrderAmendments({db,crypto,fail,num,text,actor,lines,release,adopt}){
 const one=async(tx,sql,...p)=>(await tx.$queryRawUnsafe(sql,...p))[0]
 let schemaPromise
 async function ensureSchema(){
  if(!schemaPromise)schemaPromise=db.$transaction(async tx=>{
   await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(687026)')
   for(const sql of fs.readFileSync(path.join(__dirname,'order-amendments-v687.sql'),'utf8').split(';').filter(s=>s.trim()))await tx.$executeRawUnsafe(sql)
  }).catch(e=>{schemaPromise=null;throw e})
  return schemaPromise
 }
 async function lock(tx,dealerId){await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended('dealer-erp:' || $1,0))",dealerId)}
 async function capture(tx,orderId,dealerId){
  await lock(tx,dealerId)
  const row=await one(tx,'SELECT o."orderedAt",p."cutoffMinutes" FROM "WholesaleOrder" o LEFT JOIN "WholesaleOrderCutoffPolicy" p ON p."dealerId"=o."dealerId" WHERE o.id=$1 AND o."dealerId"=$2',orderId,dealerId)
  if(!row)fail('発注が見つかりません。',404)
  await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderAmendment" ("orderId","cutoffMinutes","cutoffAt") VALUES ($1,$2,$3) ON CONFLICT ("orderId") DO NOTHING',orderId,row.cutoffMinutes??null,cutoffAt(row.orderedAt,row.cutoffMinutes??null))
 }
 async function policy(s){
  const p=await one(db,'SELECT "cutoffMinutes","updatedAt" FROM "WholesaleOrderCutoffPolicy" WHERE "dealerId"=$1',s.id)
  return {cutoffTime:timeText(p?.cutoffMinutes),configured:Boolean(p),updatedAt:iso(p?.updatedAt),canManage:!s.salon&&s.role==='ADMIN',timeZone:'Asia/Tokyo'}
 }
 async function savePolicy(tx,s,p){
  if(s.salon||s.role!=='ADMIN')fail('締切時刻はディーラーの管理者のみ設定できます。',403)
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(p.cutoffTime||'')))fail('締切時刻を入力してください。')
  const [hour,minute]=p.cutoffTime.split(':').map(Number),minutes=hour*60+minute
  const previous=await one(tx,'SELECT * FROM "WholesaleOrderCutoffPolicy" WHERE "dealerId"=$1 FOR UPDATE',s.id)
  if((p.expectedUpdatedAt??null)!==iso(previous?.updatedAt))fail('締切設定が更新されています。再読込してください。',409)
  await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderCutoffPolicy" ("dealerId","cutoffMinutes","updatedBy") VALUES ($1,$2,$3) ON CONFLICT ("dealerId") DO UPDATE SET "cutoffMinutes"=$2,"updatedBy"=$3,"updatedAt"=clock_timestamp()',s.id,minutes,actor(s))
  if(!previous){
   // Initial activation covers existing orders; later settings never reopen them.
   await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrderAmendment" ("orderId","cutoffMinutes","cutoffAt")
    SELECT o.id,$2,(date_trunc('day',o."orderedAt" AT TIME ZONE 'Asia/Tokyo') + $2*INTERVAL '1 minute'
     + CASE WHEN EXTRACT(HOUR FROM o."orderedAt" AT TIME ZONE 'Asia/Tokyo')*60+EXTRACT(MINUTE FROM o."orderedAt" AT TIME ZONE 'Asia/Tokyo') >= $2 THEN INTERVAL '1 day' ELSE INTERVAL '0 day' END) AT TIME ZONE 'Asia/Tokyo'
    FROM "WholesaleOrder" o WHERE o."dealerId"=$1
    ON CONFLICT ("orderId") DO UPDATE SET "cutoffMinutes"=EXCLUDED."cutoffMinutes","cutoffAt"=EXCLUDED."cutoffAt" WHERE "WholesaleOrderAmendment"."cutoffAt" IS NULL`,s.id,minutes)
  }
  return {cutoffTime:p.cutoffTime,configured:true,updatedAt:iso((await one(tx,'SELECT "updatedAt" FROM "WholesaleOrderCutoffPolicy" WHERE "dealerId"=$1',s.id)).updatedAt),canManage:true,timeZone:'Asia/Tokyo'}
 }
 async function deadline(tx,o){
  const r=await one(tx,'SELECT a."cutoffAt",a."orderId",p."cutoffMinutes",clock_timestamp() AS now FROM "WholesaleDealer" d LEFT JOIN "WholesaleOrderCutoffPolicy" p ON p."dealerId"=d.id LEFT JOIN "WholesaleOrderAmendment" a ON a."orderId"=$1 WHERE d.id=$2',o.id,o.dealerId)
  return {cutoffAt:r?.orderId?r.cutoffAt:cutoffAt(o.orderedAt,r?.cutoffMinutes??null),now:r?.now||new Date()}
 }
 async function assertDeadline(tx,o){
  const d=await deadline(tx,o)
  if(d.cutoffAt&&new Date(d.now)>=new Date(d.cutoffAt))fail('発注の締切時刻を過ぎているため、編集・キャンセルはできません。',409)
  return d
 }
 async function scopedOrder(tx,s,id,write=false){
  const o=await one(tx,`SELECT o.*,e."orderId" IS NOT NULL AS tracked FROM "WholesaleOrder" o LEFT JOIN "DealerErpOrder" e ON e."orderId"=o.id WHERE o.id=$1 AND o."dealerId"=$2 AND ($3::text IS NULL OR o."organizationId"=$3) AND ($4::text IS NULL OR o."salesMemberId"=$4)${write?' FOR UPDATE OF o':''}`,String(id||''),s.id,s.salon?s.organizationId:null,!s.salon&&s.role!=='ADMIN'?s.memberId:null)
  if(!o)fail('発注が見つかりません。',404)
  return o
 }
 function version(o,list,d){return crypto.createHash('sha256').update(JSON.stringify({updatedAt:iso(o.updatedAt),status:o.status,requestedDeliveryDate:iso(o.requestedDeliveryDate),salonNote:o.salonNote,dealerNote:o.dealerNote,cutoffAt:iso(d.cutoffAt),lines:list.map(l=>[l.id,l.quantity,l.cancelled,l.reserved,l.shipped,l.returned,l.unitPrice,l.dealerProductId])})).digest('hex')}
 async function catalog(tx,o){
  const products=await tx.$queryRawUnsafe(`SELECT p.id,p.name,p."manufacturerName",p.category,p."productCode",p."orderUnit",p."janCode",COALESCE(p."suggestedRetailPrice",p."wholesalePrice")::int AS "listPrice",a."discountRate" FROM "WholesaleDealerContract" c JOIN "WholesaleDealer" d ON d.id=c."dealerId" AND d.active JOIN "WholesaleContractProductPrice" a ON a."contractId"=c.id AND a.active JOIN "WholesaleDealerProduct" p ON p.id=a."dealerProductId" AND p."dealerId"=c."dealerId" AND p.active WHERE c."dealerId"=$1 AND c."organizationId"=$2 AND c.status='ACTIVE' ORDER BY p."manufacturerName",p.name,p.id`,o.dealerId,o.organizationId)
  return products.map(p=>({...p,discountRate:Number(p.discountRate),unitPrice:Math.round(Number(p.listPrice)*(100-Number(p.discountRate))/100)}))
 }
 function blocked(o,list){return !['ORDERED','ACCEPTED'].includes(o.status)||list.some(l=>l.shipped>0||l.delivered>0||l.returned>0)}
 async function view(s,q){
  return db.$transaction(async tx=>{
   const o=await scopedOrder(tx,s,q.get('id')),list=await lines(tx,o.id),d=await deadline(tx,o),closed=d.cutoffAt&&new Date(d.now)>=new Date(d.cutoffAt)
   const charges=await one(tx,'SELECT EXISTS(SELECT 1 FROM "DealerErpCharge" WHERE "orderId"=$1) AS charged',o.id)
   const mutable=!blocked(o,list)&&!charges.charged&&!closed
   return {order:o,lines:list.map(l=>({...l,editableQuantity:Math.max(0,l.quantity-l.cancelled)})),products:mutable?await catalog(tx,o):[],cutoffAt:iso(d.cutoffAt),serverNow:iso(d.now),canEdit:mutable,canCancel:mutable,reason:closed?'締切済み':blocked(o,list)||charges.charged?'出荷・納品済み、または取消済み':'',version:version(o,list,d),salon:Boolean(s.salon)}
  },{isolationLevel:'RepeatableRead'})
 }
 async function prepare(tx,s,p){
  const o=await scopedOrder(tx,s,p.orderId,true),list=await lines(tx,o.id),d=await assertDeadline(tx,o)
  if(blocked(o,list)||(await one(tx,'SELECT EXISTS(SELECT 1 FROM "DealerErpCharge" WHERE "orderId"=$1) AS charged',o.id)).charged)fail('出荷・納品済み、または取消済みの発注は変更できません。',409)
  if(p.version!==version(o,list,d))fail('発注内容が更新されています。画面を開き直して確認してください。',409)
  await capture(tx,o.id,o.dealerId)
  return {o,list,d}
 }
 async function apply(tx,s,p,cancel=false){
  const {o,list}=await prepare(tx,s,p),before={order:o,lines:list}
  const candidates=cancel?[]:p.lines
  if(!Array.isArray(candidates)||candidates.length>300)fail('発注する商品は300件以内で選択してください。')
  const products=await catalog(tx,o),byProduct=new Map(products.map(p=>[p.id,p])),byLine=new Map(list.map(l=>[l.id,l])),seen=new Set(),activeProducts=new Set(),changes=[]
  for(const item of candidates){
   if(!item||typeof item!=='object'||Array.isArray(item))fail('注文明細を確認してください。')
   const quantity=num(item.quantity,0,999),old=item.lineId?byLine.get(item.lineId):null
   if(item.lineId&&!old)fail('注文明細を確認してください。',409)
   const key=old?'line:'+old.id:'product:'+String(item.dealerProductId||'')
   if(seen.has(key))fail('同じ商品が重複しています。');seen.add(key)
   if(!quantity){if(old)changes.push({old,quantity});continue}
   const productId=old?old.dealerProductId:item.dealerProductId
   if(productId&&activeProducts.has(productId))fail('同じ商品が重複しています。');if(productId)activeProducts.add(productId)
   const product=byProduct.get(old?old.dealerProductId:item.dealerProductId)
   if(old?.cancelled)fail('取消済みの商品は追加し直してください。',409)
   if(!product&&(!old||quantity>old.quantity))fail('現在取扱いのある商品のみ追加・増量できます。',409)
   if(product&&quantity%Math.max(1,Number(product.orderUnit||1))!==0&&(!old||quantity!==old.quantity))fail(product.name+'は'+product.orderUnit+'点単位で入力してください。')
   if(quantity*Number(old?old.unitPrice:product.unitPrice)>2147483647)fail('明細の金額上限を超えています。')
   changes.push({old,product,quantity})
  }
  if(!cancel&&!changes.some(c=>c.quantity>0))fail('商品を1つ以上選択してください。全件取り消す場合はキャンセルを使用してください。')
  for(const old of list)if(!seen.has('line:'+old.id))changes.push({old,quantity:0})
  let delivery=o.requestedDeliveryDate,note=o.salonNote
  if(!cancel){
   note=text(p.salonNote??o.salonNote??'','発注メモ',1200,true)
   const value=String(p.requestedDeliveryDate||'')
   if(value&&(!/^20\d{2}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))fail('希望納品日を確認してください。')
   delivery=value?new Date(value+'T00:00:00Z'):null
  }
  await adopt(tx,{...s,role:'ADMIN'},o.id,true)
  for(const change of changes){
   const {old,product,quantity}=change
   if(old){
    if(quantity===old.quantity&&!old.cancelled)continue
    await release(tx,s,old.id,cancel?'発注キャンセル':'発注内容変更')
    if(!quantity){await tx.$executeRawUnsafe('UPDATE "DealerErpOrderLine" SET cancelled=$2 WHERE "lineId"=$1',old.id,old.quantity);await tx.$executeRawUnsafe('UPDATE "WholesaleOrderLine" SET "deliveredQuantity"=0,"lineTotal"=0,"updatedAt"=clock_timestamp() WHERE id=$1',old.id)}
    else await tx.$executeRawUnsafe('UPDATE "WholesaleOrderLine" SET quantity=$2,"lineTotal"=$2*"unitPrice","updatedAt"=clock_timestamp() WHERE id=$1',old.id,quantity)
   }else{
    const id='line_'+crypto.randomUUID()
    await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrderLine" (id,"orderId","dealerProductId","manufacturerName","productName",category,"productCode","janCode","listPrice","discountRate","unitPrice",quantity,"deliveredQuantity","lineTotal") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,0,$13)`,id,o.id,product.id,product.manufacturerName,product.name,product.category,product.productCode,product.janCode,product.listPrice,product.discountRate,product.unitPrice,quantity,product.unitPrice*quantity)
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpOrderLine" ("lineId","orderId") VALUES ($1,$2)',id,o.id)
   }
  }
  const after=await lines(tx,o.id),subtotal=after.reduce((n,l)=>n+(l.quantity-l.cancelled)*l.unitPrice,0),tax=Math.round(subtotal*Number(o.taxRate)/100),total=subtotal+tax
  if(!Number.isSafeInteger(total)||total>2147483647)fail('1伝票の合計上限を超えています。')
  await tx.$executeRawUnsafe(`UPDATE "WholesaleOrder" SET status=$2,"subtotalYen"=$3,"taxYen"=$4,"totalYen"=$5,"requestedDeliveryDate"=$6,"salonNote"=$7,"cancelledAt"=CASE WHEN $2='CANCELLED' THEN clock_timestamp() ELSE "cancelledAt" END,"updatedAt"=clock_timestamp() WHERE id=$1`,o.id,cancel?'CANCELLED':o.status,subtotal,tax,total,delivery,note)
  await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderEvent" (id,"orderId","eventType","actorType","actorId","actorName","detailJson") VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)','event_'+crypto.randomUUID(),o.id,cancel?'ORDER_CANCELLED':'ORDER_AMENDED',s.salon?'SALON':'DEALER',actor(s),s.displayName||s.memberName||s.name,JSON.stringify({before,after:{lines:after,requestedDeliveryDate:delivery,salonNote:note,totalYen:total}}))
  return {id:o.id,totalYen:total}
 }
 return {ensureSchema,lock,capture,policy,savePolicy,view,assertDeadline,deadline,amend:(tx,s,p)=>apply(tx,s,p),cancel:(tx,s,p)=>apply(tx,s,p,true)}
}
module.exports={cutoffAt,createOrderAmendments}
