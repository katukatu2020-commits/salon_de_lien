'use strict'
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})}
const one=async(tx,sql,...args)=>(await tx.$queryRawUnsafe(sql,...args))[0]
function period(q){
 const now=new Date(Date.now()+9*3600000).toISOString().slice(0,7),key=q.get('month')||now
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(key))fail('対象月を確認してください。')
 const [year,month]=key.split('-').map(Number),kind=q.get('period')||'month'
 if(year<2000||year>2199||!['month','quarter','year'].includes(kind))fail('集計期間を確認してください。')
 const length={month:1,quarter:3,year:12}[kind],first=kind==='year'?0:kind==='quarter'?Math.floor((month-1)/3)*3:month-1
 const date=m=>new Date(Date.UTC(year,m,1)-9*3600000)
 return {key,kind,start:date(first),end:date(first+length),previousStart:date(first-length),label:kind==='year'?year+'年':kind==='quarter'?year+'年 第'+(first/3+1)+'四半期':key}
}
function csv(rows){return '\ufeff'+rows.map(row=>row.map(v=>'"'+(typeof v==='number'?String(v):String(v??'').replace(/^[=+@\-\t\r]/,"'$&")).replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n'}
function createAnalytics({db,h}){
 function params(s,q,r){if(s.salon)fail('許可されていません。',403);return [s.id,r.start,r.end,q.get('salon')||null,h.scope(s)||q.get('member')||null,q.get('branch')||null,null]}
 async function analysis(s,q){
  const r=period(q),p=params(s,q,r),cte=h.factsSql(),sum='COALESCE(SUM(amount),0)::float8 AS amount'
  return db.$transaction(async tx=>{
   const current=await one(tx,cte+`SELECT ${sum},COUNT(DISTINCT "orderId")::int AS orders FROM filtered WHERE kind='actual'`,...p)
   const previous=await one(tx,cte+`SELECT ${sum} FROM filtered WHERE kind='actual'`,...params(s,q,{start:r.previousStart,end:r.start}))
   const groups=async(column,table)=>tx.$queryRawUnsafe(cte+`SELECT f."${column}" AS id,COALESCE(g.name,'未割当') AS name,${sum} FROM filtered f LEFT JOIN "${table}" g ON g.id=f."${column}" WHERE kind='actual' GROUP BY 1,2 ORDER BY amount DESC,name`,...p)
   const branches=await groups('salesBranchId','DealerSalesBranch'),members=await groups('salesMemberId','DealerSalesMember')
   const months=await tx.$queryRawUnsafe(cte+`SELECT TO_CHAR(at+INTERVAL '9 hours','YYYY-MM') AS month,${sum} FROM filtered WHERE kind='actual' GROUP BY 1 ORDER BY 1`,...p)
   return {period:r,summary:{actualYen:current.amount,previousYen:previous.amount,changePercent:previous.amount>0?(current.amount-previous.amount)/previous.amount*100:null,orders:current.orders},branches,members,months}
  },{isolationLevel:'RepeatableRead',timeout:30000})
 }
 async function manufacturer(s,q){
  const r=period(new URLSearchParams({month:q.get('month')||''})),p=params(s,q,r)
  const cte=h.factsSql()+`, named AS (SELECT f.*,COALESCE(NULLIF(l."manufacturerName",''),NULLIF(p."manufacturerName",''),'未分類') AS manufacturer FROM filtered f LEFT JOIN "WholesaleDealerProduct" p ON p.id=f."productId" LEFT JOIN LATERAL (SELECT ol."manufacturerName" FROM "WholesaleOrderLine" ol WHERE ol."orderId"=f."orderId" AND ol."dealerProductId"=f."productId" ORDER BY ol."createdAt",ol.id LIMIT 1) l ON TRUE WHERE f.kind='actual' AND f."productId" IS NOT NULL) `
  const rows=await db.$queryRawUnsafe(cte+`SELECT manufacturer,"productId","productName","productCode",n."organizationId",o.name AS salon,SUM(quantity)::float8 AS quantity,SUM(amount)::float8 AS amount FROM named n JOIN "Organization" o ON o.id=n."organizationId" WHERE ($8::text IS NULL OR manufacturer=$8) AND ($9::text IS NULL OR "productId"=$9) GROUP BY 1,2,3,4,5,6 ORDER BY 1,3,6 LIMIT 10001`,...p,q.get('manufacturer')||null,q.get('product')||null)
  if(rows.length>10000)fail('明細が多いためメーカーを絞り込んでください。',422)
  return {month:r.key,rows,totalQuantity:rows.reduce((n,r)=>n+r.quantity,0),totalYen:rows.reduce((n,r)=>n+r.amount,0)}
 }
 async function stock(s,q){
  if(s.salon)fail('許可されていません。',403)
  const p=[s.id,s.role==='ADMIN',s.branchId||null,'%'+String(q.get('q')||'').normalize('NFKC').slice(0,160)+'%',q.get('manufacturer')||null]
  const from=`FROM "DealerErpStock" st JOIN "WholesaleDealerProduct" p ON p.id=st."productId" JOIN "DealerErpLocation" l ON l.id=st."locationId" JOIN "DealerErpWarehouse" w ON w.id=l."warehouseId" WHERE st."dealerId"=$1 AND ($2::boolean OR w."branchId" IS NULL OR w."branchId"=$3) AND normalize(p.name||' '||p."productCode"||' '||p."manufacturerName",NFKC) ILIKE $4 AND ($5::text IS NULL OR p."manufacturerName"=$5)`
  return db.$transaction(async tx=>{
   const {total}=await one(tx,'SELECT COUNT(*)::int AS total '+from,...p),pages=Math.max(1,Math.ceil(total/30)),page=Math.min(pages,Math.max(1,parseInt(q.get('page'))||1))
   const rows=await tx.$queryRawUnsafe('SELECT st.*,p.name,p."manufacturerName",p."productCode",w.name AS warehouse,l.name AS location '+from+' ORDER BY p."manufacturerName",p.name,st.id LIMIT 30 OFFSET $6',...p,(page-1)*30)
   const manufacturers=await tx.$queryRawUnsafe('SELECT DISTINCT "manufacturerName" AS name FROM "WholesaleDealerProduct" WHERE "dealerId"=$1 ORDER BY 1',s.id)
   return {rows,total,pages,page,manufacturers}
  },{isolationLevel:'RepeatableRead'})
 }
 async function exportMonthly(s,q){const data=await manufacturer(s,q);return {filename:'manufacturer-sales-'+data.month+'.csv',body:csv([['対象月','メーカー','商品コード','商品名','サロン','数量','売上金額（税抜）'],...data.rows.map(r=>[data.month,r.manufacturer,r.productCode,r.productName,r.salon,r.quantity,r.amount])])}}
 return {analysis,manufacturer,stock,exportMonthly}
}
module.exports={createAnalytics,period,csv}
