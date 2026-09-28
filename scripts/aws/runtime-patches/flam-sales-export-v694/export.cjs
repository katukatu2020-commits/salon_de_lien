'use strict'
const {PassThrough}=require('node:stream')
const headers=require('./headers.json')
const MAX_ROWS=20000
const day=value=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value))
const codeValid=value=>/^[\x21-\x7e]{1,15}$/.test(value)
const cleanText=value=>String(value??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'')
const SOURCE_SQL=`WITH sales AS (
 SELECT ch.id AS "sourceId",ch."orderId",ch."organizationId",ch."salesMemberId",ch."salesBranchId",ch."closingDay",ch."productName",ch."productCode",ch.quantity,ch."unitPrice",ch."taxRate",(ch.quantity::bigint*ch."unitPrice")::float8 AS amount,ch."occurredAt" AS at,ch."invoiceId"
 FROM "DealerErpCharge" ch WHERE ch."dealerId"=$1
 UNION ALL
 SELECT l.id,o.id,o."organizationId",o."salesMemberId",o."salesBranchId",o."billingClosingDay",l."productName",l."productCode",l.quantity,l."unitPrice",o."taxRate",l."lineTotal"::float8,o."deliveredAt",NULL::text
 FROM "WholesaleOrder" o JOIN "WholesaleOrderLine" l ON l."orderId"=o.id WHERE o."dealerId"=$1 AND o.status='DELIVERED' AND NOT EXISTS(SELECT 1 FROM "DealerErpOrder" e WHERE e."orderId"=o.id)
 ) SELECT f.*,o."orderNo",org.name AS "salonName",c.code AS "customerCode",m.name AS "memberName",b.name AS "branchName",CASE WHEN NOT i.voided THEN i."dueDate"::text END AS "dueDate"
 FROM sales f JOIN "WholesaleOrder" o ON o.id=f."orderId" AND o."dealerId"=$1 JOIN "Organization" org ON org.id=f."organizationId"
 LEFT JOIN "DealerFlamCustomer" c ON c."dealerId"=$1 AND c."organizationId"=f."organizationId"
 LEFT JOIN "DealerSalesMember" m ON m.id=f."salesMemberId" AND m."dealerId"=$1
 LEFT JOIN "DealerSalesBranch" b ON b.id=f."salesBranchId" AND b."dealerId"=$1
 LEFT JOIN "DealerErpInvoice" i ON i.id=f."invoiceId" AND i."dealerId"=$1
 WHERE f.at>=$2 AND f.at<$3 AND ($4::text IS NULL OR f."organizationId"=$4) AND ($5::text IS NULL OR f."salesMemberId"=$5) AND ($6::text IS NULL OR f."salesBranchId"=$6) AND ($7::int IS NULL OR f."closingDay"=$7)
 ORDER BY f.at,f."orderId",f."sourceId" LIMIT ${MAX_ROWS+1}`

function prepare(source,includeProductCodes){
 const errors=[],groups=new Map(),customers=new Map()
 let actualYen=0,returnYen=0
 for(const l of source){
  actualYen+=l.amount;if(l.amount<0)returnYen+=l.amount
  customers.set(l.organizationId,{id:l.organizationId,name:l.salonName,code:l.customerCode||''})
  if(!Number.isSafeInteger(l.amount)||!Number.isSafeInteger(l.quantity)||!Number.isSafeInteger(l.unitPrice)||!l.quantity||l.quantity*l.unitPrice!==l.amount||Math.abs(l.amount)>9999999999||Math.abs(l.quantity)>999999999||Math.abs(l.unitPrice)>9999999999)errors.push(l.orderNo+'：数量・単価・小計の整合性を確認してください。')
  if(![0,8,10].includes(l.taxRate))errors.push(l.orderNo+'：flamの税率設定を確認してください（'+l.taxRate+'%）。')
  if(includeProductCodes&&l.productCode&&!codeValid(l.productCode))errors.push(l.orderNo+'：商品コードは15文字以内の半角英数記号が必要です。')
  if(!cleanText(l.productName)||[...cleanText(l.productName)].length>355)errors.push(l.orderNo+'：商品名・規格を確認してください。')
  const date=day(l.at),key=JSON.stringify([l.orderId,date,Math.sign(l.quantity),l.invoiceId||''])
  if(!groups.has(key))groups.set(key,{date,lines:[]})
  groups.get(key).lines.push(l)
 }
 for(const c of customers.values())if(!codeValid(c.code))errors.push(c.name+'：flam得意先コードを設定してください。')
 if(!Number.isSafeInteger(actualYen))errors.push('売上金額が出力可能な範囲を超えています。')
 const rows=[];let documents=0
 for(const g of groups.values()){
  for(let start=0;start<g.lines.length;start+=5000){
   const lines=g.lines.slice(start,start+5000),n=String(++documents).padStart(8,'0')
   const memo=['ORIMIA受注番号: '+lines[0].orderNo,'売上日: '+g.date,'担当者: '+[...new Set(lines.map(l=>l.memberName||'未設定'))].join('、'),'営業所: '+[...new Set(lines.map(l=>l.branchName||'未設定'))].join('、')].join('\n')
   for(const l of lines){
    const row=Array(headers.length).fill(null),name=[...cleanText(l.productName)]
    row[0]=n;row[1]=g.date;row[2]=l.quantity<0?312:212;row[13]=l.customerCode||''
    // Do not pass ORIMIA identifiers as foreign FLAM master/order identifiers.
    row[29]='ORIMIA '+l.orderNo;row[35]=memo;row[37]=l.quantity<0?3:0
    row[39]=includeProductCodes&&l.productCode?l.productCode:null
    row[42]=name.slice(0,100).join('');row[43]=name.slice(100).join('')||null
    row[46]=l.unitPrice;row[47]=l.quantity;row[54]=l.amount
    row[58]=l.dueDate||null;row[63]='ORIMIA '+l.orderNo
    row[75]=l.taxRate?l.taxRate+'%':null;row[76]=l.taxRate?0:2
    // Returns use their recognition date; do not invent a new delivery date.
    row[95]=l.quantity>0?g.date:null
    rows.push(row)
   }
  }
 }
 return {rows,customers:[...customers.values()],errors:[...new Set(errors)],summary:{documents,lines:rows.length,actualYen,returnYen}}
}

async function workbook(rows){
 const Excel=require('exceljs'),stream=new PassThrough(),chunks=[]
 stream.on('data',chunk=>chunks.push(chunk))
 const book=new Excel.stream.xlsx.WorkbookWriter({stream,useStyles:true,useSharedStrings:false})
 book.creator='ORIMIA'
 const sheet=book.addWorksheet('Sheet1',{views:[{state:'frozen',ySplit:1}]})
 sheet.columns=headers.map(h=>({width:h==='未使用'?10:/商品名|社内メモ|備考|件名/.test(h)?28:18}))
 const first=sheet.addRow(headers);first.font={name:'Arial',size:10,bold:true};first.height=24;first.commit()
 for(const values of rows){
  const row=sheet.addRow(values);row.font={name:'Arial',size:10}
  for(const col of [2,59,96])if(values[col-1]){row.getCell(col).value=new Date(values[col-1]+'T00:00:00Z');row.getCell(col).numFmt='yyyy/mm/dd'}
  for(const col of [1,14,40])row.getCell(col).numFmt='@'
  for(const col of [47,48,55])row.getCell(col).numFmt='0'
  row.commit()
 }
 sheet.commit();await book.commit();return Buffer.concat(chunks)
}

function createFlamExport({db,crypto,monthRange,scope,reportSnapshot,fail}){
 let exporting=0
 async function snapshot(s,q){
  const r=monthRange(q.get('month')),closing=q.get('closing')||null
  if(closing&&(!/^\d+$/.test(closing)||Number(closing)<1||Number(closing)>31))fail('締日を確認してください。')
  const params=[s.id,r.start,r.end,q.get('salon')||null,scope(s)||q.get('member')||null,q.get('branch')||null,closing?Number(closing):null]
  return db.$transaction(async tx=>{
   const source=await tx.$queryRawUnsafe(SOURCE_SQL,...params)
   if(source.length>MAX_ROWS)fail('対象明細が2万件を超えています。サロン・担当者・営業所で絞り込んでください。',413)
   const result=prepare(source,q.get('productCodes')==='1'),report=await reportSnapshot(s,q,tx)
   if(result.summary.actualYen!==report.summary.actualYen)fail('月次売上との照合に失敗しました。出力を中止しました。',409)
   const token=crypto.createHash('sha256').update(JSON.stringify([s.id,scope(s),r.key,result.rows,source.map(l=>l.sourceId)])).digest('hex')
   return {...result,month:r.key,token}
  },{isolationLevel:'RepeatableRead',timeout:30000})
 }
 async function preview(s,q){const {rows,...result}=await snapshot(s,q);return result}
 async function download(s,q){
  if(exporting>=2)fail('他の出力処理が進行中です。少し待って再度お試しください。',429)
  exporting++
  try{
   const result=await snapshot(s,q)
   if(result.errors.length)fail(result.errors[0],422)
   if(!result.rows.length)fail('対象期間に納品売上はありません。',422)
   if(!q.get('token')||q.get('token')!==result.token)fail('売上またはコード設定が更新されています。最新の出力内容を確認してください。',409)
   return {buffer:await workbook(result.rows),filename:'ORIMIA_flam_sales_'+result.month+'.xlsx'}
  }finally{exporting--}
 }
 async function saveCodes(s,p){
  if(s.role!=='ADMIN'||s.salon)fail('得意先コードの設定は管理者のみ操作できます。',403)
  if(!Array.isArray(p.customers)||!p.customers.length||p.customers.length>2000)fail('得意先コードの設定内容を確認してください。')
  const ids=new Set()
  const items=p.customers.map(c=>{
   const id=String(c?.id||''),code=String(c?.code??'').trim()
   if(!id||ids.has(id)||code&&!codeValid(code))fail('得意先コードは15文字以内の半角英数記号で入力してください。')
   ids.add(id);return {id,code}
  })
  await db.$transaction(async tx=>{
   for(const c of items){
    const allowed=await tx.$queryRawUnsafe('SELECT id FROM "WholesaleDealerContract" WHERE "dealerId"=$1 AND "organizationId"=$2',s.id,c.id)
    if(!allowed.length)fail('契約先を確認できませんでした。',404)
    if(c.code)await tx.$executeRawUnsafe('INSERT INTO "DealerFlamCustomer" ("dealerId","organizationId",code) VALUES ($1,$2,$3) ON CONFLICT ("dealerId","organizationId") DO UPDATE SET code=EXCLUDED.code,"updatedAt"=NOW()',s.id,c.id,c.code)
    else await tx.$executeRawUnsafe('DELETE FROM "DealerFlamCustomer" WHERE "dealerId"=$1 AND "organizationId"=$2',s.id,c.id)
   }
  },{timeout:30000})
  return {saved:true}
 }
 return {preview,download,saveCodes}
}
module.exports={createFlamExport,prepare,workbook,headers,codeValid}
