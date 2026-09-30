'use strict'
const fs=require('node:fs'),path=require('node:path')
const {getExporter}=require('./exporters.cjs')
const one=async(tx,sql,...args)=>(await tx.$queryRawUnsafe(sql,...args))[0]
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})}
const str=(v,max=180)=>String(v??'').trim().slice(0,max)
const integer=(v,min=0,max=10000000)=>{const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)fail('数値の範囲を確認してください。');return n}
const master=s=>{if(s.salon||s.role!=='ADMIN')fail('管理者のみ操作できます。',403)}
const procurement=s=>{if(s.salon||(s.role!=='ADMIN'&&!s.canProcure))fail('仕入発注の権限がありません。',403)}
function redact(value){
 if(Array.isArray(value))return value.map(redact)
 if(value&&typeof value==='object'&&!(value instanceof Date))return Object.fromEntries(Object.entries(value).filter(([key])=>!['discountRate','listPrice','suggestedRetailPrice','discountYen','listYen'].includes(key)).map(([k,v])=>[k,redact(v)]))
 return value
}
function createFlow({db,crypto,h}){
 const id=()=>crypto.randomUUID()
 let ready
 const ensureSchema=()=>ready||(ready=db.$transaction(async tx=>{
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(698026)')
  for(const sql of fs.readFileSync(path.join(__dirname,'migration.sql'),'utf8').split(';').filter(x=>x.trim()))await tx.$executeRawUnsafe(sql)
 },{timeout:60000}).catch(e=>{ready=null;throw e}))
 async function showRates(tx,dealerId,organizationId){
  const c=await one(tx,'SELECT "showDiscountRate" FROM "WholesaleDealerContract" WHERE "dealerId"=$1 AND "organizationId"=$2',dealerId,organizationId)
  return c?.showDiscountRate!==false
 }
 async function salonPrices(s,payload){
  const contracts=await db.$queryRawUnsafe('SELECT "dealerId","showDiscountRate" FROM "WholesaleDealerContract" WHERE "organizationId"=$1',s.organizationId)
  const hidden=new Set(contracts.filter(c=>!c.showDiscountRate).map(c=>c.dealerId))
  return {...payload,catalogProducts:payload.catalogProducts?.map(p=>hidden.has(p.dealerId)?{...redact(p),showDiscountRate:false}:p)}
 }
 async function amendmentView(s,payload){
  return s.salon&&!await showRates(db,s.id,s.organizationId)?redact(payload):payload
 }
 async function suppliers(s){
  const rows=await db.$queryRawUnsafe('SELECT * FROM "DealerSupplier" WHERE "dealerId"=$1 ORDER BY "name","id"',s.id)
  return {rows,canManage:s.role==='ADMIN',canProcure:s.role==='ADMIN'||s.canProcure===true}
 }
 async function saveSupplier(tx,s,p){
  master(s)
  const name=str(p.name),code=str(p.code,80)
  if(!name||!code)fail('仕入先名と管理コードを入力してください。')
  const supplierId=p.id?str(p.id):id()
  if(p.id&&!await one(tx,'SELECT id FROM "DealerSupplier" WHERE id=$1 AND "dealerId"=$2',supplierId,s.id))fail('仕入先が見つかりません。',404)
  await tx.$executeRawUnsafe('INSERT INTO "DealerSupplier" (id,"dealerId",name,code,note,active) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET name=$3,code=$4,note=$5,active=$6,"updatedAt"=clock_timestamp()',supplierId,s.id,name,code,str(p.note,2000),p.active!==false)
  return {id:supplierId}
 }
 async function assignments(s,q){
  const page=integer(q.get('page')||1,1,1000000),query='%'+str(q.get('q')).normalize('NFKC')+'%'
  const params=[s.id,query,q.get('manufacturer')||null]
  const from='FROM "WholesaleDealerProduct" p LEFT JOIN "DealerProductSupplier" a ON a."productId"=p.id AND a."isPrimary" LEFT JOIN "DealerSupplier" v ON v.id=a."supplierId" WHERE p."dealerId"=$1 AND p.active AND normalize(p.name||\' \'||p."productCode"||\' \'||p."manufacturerName",NFKC) ILIKE $2 AND ($3::text IS NULL OR p."manufacturerName"=$3)'
  const total=(await one(db,'SELECT COUNT(*)::int AS n '+from,...params)).n
  const rows=await db.$queryRawUnsafe('SELECT p.id,p.name,p."manufacturerName",p."productCode",p."manufacturerProductCode",a."supplierId",a."supplierProductCode",a."unitCost",v.name AS supplier '+from+' ORDER BY p."manufacturerName",p.name,p.id LIMIT 30 OFFSET $4',...params,(page-1)*30)
  return {rows,total,page,pages:Math.max(1,Math.ceil(total/30)),canManage:s.role==='ADMIN'}
 }
 async function assignSupplier(tx,s,p){
  master(s)
  const product=await h.product(tx,s,p.productId)
  const supplier=await one(tx,'SELECT * FROM "DealerSupplier" WHERE id=$1 AND "dealerId"=$2 AND active',str(p.supplierId),s.id)
  if(!supplier)fail('有効な仕入先を選択してください。')
  await tx.$executeRawUnsafe('UPDATE "DealerProductSupplier" SET "isPrimary"=FALSE,"updatedAt"=clock_timestamp() WHERE "productId"=$1',product.id)
  await tx.$executeRawUnsafe('INSERT INTO "DealerProductSupplier" ("productId","supplierId","supplierProductCode","unitCost","isPrimary") VALUES ($1,$2,$3,$4,TRUE) ON CONFLICT ("productId","supplierId") DO UPDATE SET "supplierProductCode"=$3,"unitCost"=$4,"isPrimary"=TRUE,"updatedAt"=clock_timestamp()',product.id,supplier.id,str(p.supplierProductCode,100),integer(p.unitCost||0))
  await tx.$executeRawUnsafe('UPDATE "WholesaleDealerProduct" SET "manufacturerProductCode"=$2,"updatedAt"=clock_timestamp() WHERE id=$1',product.id,str(p.manufacturerProductCode,100)||null)
  return {id:product.id}
 }
 async function accept(tx,s,p){
  const o=await h.order(tx,s,p.orderId,true)
  if(!['ORDERED','ACCEPTED'].includes(o.status))fail('受注待ちの注文ではありません。',409)
  await h.capture(tx,o.id,s.id)
  await tx.$executeRawUnsafe('UPDATE "WholesaleOrder" SET status=\'ACCEPTED\',"acceptedAt"=COALESCE("acceptedAt",clock_timestamp()),"acceptedByName"=$2,"updatedAt"=clock_timestamp() WHERE id=$1',o.id,s.memberName||s.name)
  await event(tx,s,o.id,'ACCEPTED',{previousStatus:o.status})
  return {id:o.id,status:'ACCEPTED'}
 }
 async function event(tx,s,orderId,type,detail){
  await tx.$executeRawUnsafe('INSERT INTO "WholesaleOrderEvent" (id,"orderId","eventType","actorType","actorId","actorName","detailJson") VALUES ($1,$2,$3,\'DEALER\',$4,$5,$6::jsonb)',id(),orderId,type,s.memberId,s.memberName||s.name||'担当者',JSON.stringify(detail))
 }
 async function demand(tx,s,q){
  procurement(s)
  const rows=await tx.$queryRawUnsafe(`SELECT l.id AS "lineId",l."orderId",l."dealerProductId" AS "productId",l."productName",l."productCode",l."manufacturerName",o."orderNo",o."organizationId",org.name AS salon,c."customerCode" AS "salonCode",o."salonNote" AS note,a."cutoffAt",
   p."manufacturerProductCode",a2."supplierId",a2."supplierProductCode",a2."unitCost",v.name AS supplier,v.active AS "supplierActive",
   (l.quantity-COALESCE(el.cancelled,0)-COALESCE(sh.quantity,0)-COALESCE(committed.quantity,0))::int AS quantity
   FROM "WholesaleOrderLine" l JOIN "WholesaleOrder" o ON o.id=l."orderId"
   JOIN "Organization" org ON org.id=o."organizationId"
   JOIN "WholesaleDealerContract" c ON c."dealerId"=o."dealerId" AND c."organizationId"=o."organizationId"
   JOIN "WholesaleOrderAmendment" a ON a."orderId"=o.id
   LEFT JOIN "DealerErpOrderLine" el ON el."lineId"=l.id
   LEFT JOIN "WholesaleDealerProduct" p ON p.id=l."dealerProductId"
   LEFT JOIN "DealerProductSupplier" a2 ON a2."productId"=p.id AND a2."isPrimary"
   LEFT JOIN "DealerSupplier" v ON v.id=a2."supplierId" AND v."dealerId"=o."dealerId"
   LEFT JOIN LATERAL (SELECT SUM(sl.quantity)::int AS quantity FROM "DealerErpShipmentLine" sl JOIN "DealerErpShipment" sh ON sh.id=sl."shipmentId" WHERE sl."lineId"=l.id AND sh.status<>'REVERSED') sh ON TRUE
   LEFT JOIN LATERAL (SELECT SUM(src.quantity)::int AS quantity FROM "DealerErpPurchaseSource" src JOIN "DealerErpPurchaseLine" pl ON pl.id=src."purchaseLineId" JOIN "DealerErpPurchase" po ON po.id=pl."purchaseId" WHERE src."orderLineId"=l.id AND po.status<>'CANCELLED') committed ON TRUE
   WHERE o."dealerId"=$1 AND o.status='ACCEPTED' AND a."cutoffAt" IS NOT NULL AND a."cutoffAt"<=clock_timestamp()
   AND ($2::text IS NULL OR o.id=$2) AND ($3::text IS NULL OR v.id=$3)
   ORDER BY v.id,l."manufacturerName",o."orderedAt",l.id LIMIT 5001`,s.id,q.get('order')||null,q.get('supplier')||null)
  if(rows.length>5000)fail('対象が多いため、仕入先または受注で絞り込んでください。',409)
  return rows.filter(r=>r.quantity>0)
 }
 const digest=rows=>crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')
 async function preview(s,q){
  return db.$transaction(async tx=>{
   const rows=await demand(tx,s,q)
   return {rows,version:digest(rows),missing:rows.filter(r=>!r.supplierId||!r.supplierActive||!r.productId).length}
  },{isolationLevel:'RepeatableRead'})
 }
 async function generate(tx,s,p){
  procurement(s)
  const rows=await demand(tx,s,new URLSearchParams({...(p.order?{order:p.order}:{}),...(p.supplier?{supplier:p.supplier}:{})}))
  if(!rows.length)fail('締切済み・受注済みの未発注商品がありません。',409)
  if(p.version!==digest(rows))fail('注文または仕入先設定が更新されています。再集計してください。',409)
  if(rows.some(r=>!r.productId||!r.supplierId||!r.supplierActive))fail('すべての商品に有効な仕入先を設定してください。',409)
  const groups=new Map(),purchases=[]
  for(const r of rows){const key=JSON.stringify([r.supplierId,r.manufacturerName]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r)}
  for(const group of groups.values()){
   const first=group[0],purchaseId=id(),documentNo=h.doc('PO')
   await tx.$executeRawUnsafe('INSERT INTO "DealerErpPurchase" (id,"dealerId",supplier,"supplierId","manufacturerName","fromOrders","documentNo","actorId") VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7)',purchaseId,s.id,first.supplier,first.supplierId,first.manufacturerName,documentNo,s.memberId)
   const products=new Map()
   for(const r of group){if(!products.has(r.productId))products.set(r.productId,[]);products.get(r.productId).push(r)}
   for(const productRows of products.values()){
    const firstProduct=productRows[0],lineId=id(),quantity=productRows.reduce((n,r)=>n+r.quantity,0)
    await tx.$executeRawUnsafe('INSERT INTO "DealerErpPurchaseLine" (id,"purchaseId","productId",quantity,"unitCost") VALUES ($1,$2,$3,$4,$5)',lineId,purchaseId,firstProduct.productId,integer(quantity,1,1000000),firstProduct.unitCost)
    for(const r of productRows)await tx.$executeRawUnsafe('INSERT INTO "DealerErpPurchaseSource" ("purchaseLineId","orderLineId",quantity,snapshot) VALUES ($1,$2,$3,$4::jsonb)',lineId,r.lineId,r.quantity,JSON.stringify(r))
   }
   purchases.push({id:purchaseId,documentNo,supplier:first.supplier,manufacturerName:first.manufacturerName})
  }
  for(const oid of new Set(rows.map(r=>r.orderId)))await event(tx,s,oid,'SUPPLIER_DRAFT_CREATED',{purchases})
  return {purchases}
 }
 async function purchaseRecord(tx,s,purchaseId){
  procurement(s)
  const p=await one(tx,'SELECT * FROM "DealerErpPurchase" WHERE id=$1 AND "dealerId"=$2',str(purchaseId),s.id)
  if(!p)fail('発注が見つかりません。',404)
  return p
 }
 async function exportPurchase(s,purchaseId){
  return db.$transaction(async tx=>{
   await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtextextended('dealer-erp:' || $1,0))",s.id)
   const p=await purchaseRecord(tx,s,purchaseId)
   if(p.status==='CANCELLED'||!p.fromOrders)fail('注文から作成した有効な発注を選択してください。',409)
   const sources=await tx.$queryRawUnsafe('SELECT src.* FROM "DealerErpPurchaseSource" src JOIN "DealerErpPurchaseLine" pl ON pl.id=src."purchaseLineId" WHERE pl."purchaseId"=$1 ORDER BY src."orderLineId",src."purchaseLineId"',p.id)
   const result=getExporter(p.exporterKey).export(p,sources)
   await tx.$executeRawUnsafe('UPDATE "DealerErpPurchase" SET "exportedAt"=clock_timestamp() WHERE id=$1',p.id)
   return result
  })
 }
 async function submit(tx,s,p){
  const po=await purchaseRecord(tx,s,p.purchaseId)
  if(!po.fromOrders||po.status!=='OPEN'||po.submittedAt)fail('未発注の発注データを選択してください。',409)
  if(!po.exportedAt||p.confirmed!==true)fail('CSVをダウンロードし、仕入先への送信完了を確認してください。',409)
  await tx.$executeRawUnsafe('UPDATE "DealerErpPurchase" SET "submittedAt"=clock_timestamp() WHERE id=$1',po.id)
  const rows=await tx.$queryRawUnsafe('SELECT DISTINCT l."orderId" FROM "DealerErpPurchaseSource" src JOIN "DealerErpPurchaseLine" pl ON pl.id=src."purchaseLineId" JOIN "WholesaleOrderLine" l ON l.id=src."orderLineId" WHERE pl."purchaseId"=$1',po.id)
  for(const r of rows)await event(tx,s,r.orderId,'SUPPLIER_ORDERED',{purchaseId:po.id,documentNo:po.documentNo})
  return {id:po.id}
 }
 async function ensureEditable(tx,o){
  const found=await one(tx,'SELECT EXISTS(SELECT 1 FROM "DealerErpPurchaseSource" src JOIN "WholesaleOrderLine" l ON l.id=src."orderLineId" JOIN "DealerErpPurchaseLine" pl ON pl.id=src."purchaseLineId" JOIN "DealerErpPurchase" p ON p.id=pl."purchaseId" WHERE l."orderId"=$1 AND p.status<>\'CANCELLED\') AS locked',o.id)
  if(found.locked)fail('仕入発注データ作成後の注文は変更できません。',409)
 }
 async function decorateOrders(tx,rows){
  if(!rows.length)return rows
  const data=await tx.$queryRawUnsafe(`SELECT l."orderId",SUM(l.quantity-COALESCE(el.cancelled,0))::int AS quantity,
   SUM(LEAST(l.quantity-COALESCE(el.cancelled,0),COALESCE(x.sent,0)))::int AS sent,
   SUM(COALESCE(x.draft,0))::int AS draft
   FROM "WholesaleOrderLine" l LEFT JOIN "DealerErpOrderLine" el ON el."lineId"=l.id
   LEFT JOIN LATERAL (SELECT SUM(src.quantity) FILTER(WHERE po."submittedAt" IS NOT NULL)::int AS sent,SUM(src.quantity) FILTER(WHERE po."submittedAt" IS NULL)::int AS draft FROM "DealerErpPurchaseSource" src JOIN "DealerErpPurchaseLine" pl ON pl.id=src."purchaseLineId" JOIN "DealerErpPurchase" po ON po.id=pl."purchaseId" WHERE src."orderLineId"=l.id AND po.status<>'CANCELLED') x ON TRUE
   WHERE l."orderId"=ANY($1::text[]) GROUP BY l."orderId"`,rows.map(r=>r.id))
  const byId=new Map(data.map(r=>[r.orderId,r]))
  return rows.map(r=>{const a=byId.get(r.id)||{sent:0,quantity:0,draft:0};return {...r,procurementStatus:a.quantity&&a.sent>=a.quantity?'ORDERED':a.sent>0?'PARTIAL':'NOT_ORDERED',procurementDraftQuantity:a.draft,procurementQuantity:a.sent}})
 }
 async function setVisibility(tx,s,p){
  master(s);await h.contract(tx,s,p.organizationId)
  if(typeof p.showDiscountRate!=='boolean')fail('割引率の公開設定を確認してください。')
  await tx.$executeRawUnsafe('UPDATE "WholesaleDealerContract" SET "showDiscountRate"=$3,"updatedAt"=clock_timestamp() WHERE "dealerId"=$1 AND "organizationId"=$2',s.id,p.organizationId,p.showDiscountRate)
  return {saved:true}
 }
 async function permission(tx,s,p){
  master(s)
  if(typeof p.canProcure!=='boolean')fail('仕入発注権限を確認してください。')
  const changed=await tx.$executeRawUnsafe('UPDATE "DealerSalesMember" SET "canProcure"=$3 WHERE id=$1 AND "dealerId"=$2',str(p.memberId),s.id,p.canProcure)
  if(changed!==1)fail('担当者が見つかりません。',404)
  return {saved:true}
 }
 async function minStock(tx,s,p){
  master(s)
  const st=await one(tx,'SELECT * FROM "DealerErpStock" WHERE id=$1 AND "dealerId"=$2 FOR UPDATE',str(p.stockId),s.id)
  if(!st)fail('在庫が見つかりません。',404)
  if(st.version!==integer(p.version))fail('在庫が更新されています。再読込してください。',409)
  await tx.$executeRawUnsafe('UPDATE "DealerErpStock" SET minimum=$2,version=version+1 WHERE id=$1',st.id,integer(p.minimum,0,1000000))
  return {saved:true}
 }
 return {ensureSchema,showRates,salonPrices,amendmentView,suppliers,assignments,preview,exportPurchase,decorateOrders,ensureEditable,
  actions:{'supplier-save':saveSupplier,'supplier-assign':assignSupplier,'order-accept':accept,'procurement-generate':generate,'procurement-submit':submit,'discount-visibility':setVisibility,'procurement-permission':permission,'stock-minimum':minStock}}
}
module.exports={createFlow,master,procurement,redact}
