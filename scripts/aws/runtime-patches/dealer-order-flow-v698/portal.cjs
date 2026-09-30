'use strict'
const fs=require('node:fs'),path=require('node:path')
const {master,redact}=require('./workflow.cjs')
const {passwordHash,verifyPassword}=require('../business-account-approvals-v643')
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})}
const one=async(tx,sql,...args)=>(await tx.$queryRawUnsafe(sql,...args))[0]
const num=v=>Number(v).toLocaleString('ja-JP')
const field=(v,n,max=200)=>{const s=String(v??'').trim();if(!s||s.length>max)fail(n+'を確認してください。');return s}
const page=(title,body,extra='')=>`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | ORIMIA</title><link rel="stylesheet" href="/wholesale-ordering-v543.css?v=698"><link rel="stylesheet" href="/dealer-order-flow-v698/style.css"></head><body class="wo-body flow-body">${body}${extra}</body></html>`
function createPortal({db,crypto,flow,analytics,h}){
 const sendJson=h.json
 h={...h,json:(res,status,value)=>sendJson(res,status,JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?Number(v):v)))}
 async function createSalon(tx,s,p){
  master(s)
  const name=field(p.name,'サロン名'),contact=field(p.contact,'担当者名'),email=field(p.email,'メールアドレス'),phone=field(p.phone,'電話番号',30)
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/[0-9]{2}/.test(phone))fail('連絡先を確認してください。')
  const loginId=field(p.loginId,'ログインID',80).toLowerCase(),password=String(p.password||'')
  if(!/^[a-z0-9][a-z0-9._-]{3,79}$/.test(loginId)||password.length<12||password.length>128)fail('IDは半角4文字以上、初期パスワードは12文字以上にしてください。')
  // Shares the same global issuance lock as operator-issued business accounts.
  await tx.$queryRawUnsafe("SELECT 1::int FROM (SELECT pg_advisory_xact_lock(hashtext('business_account_approval_v643'))) guard")
  const exists=await one(tx,`SELECT EXISTS(SELECT 1 FROM "AppUser" WHERE LOWER(COALESCE("loginId",''))=$1 OR LOWER(email)=$1 UNION ALL SELECT 1 FROM "WholesaleDealer" WHERE LOWER("loginId")=$1 UNION ALL SELECT 1 FROM "DealerSalesMember" WHERE LOWER("loginId")=$1) AS found`,loginId)
  if(exists.found)fail('このログインIDは使用されています。',409)
  if(await one(tx,'SELECT id FROM "AppUser" WHERE LOWER(email)=LOWER($1) LIMIT 1',email))fail('このメールアドレスは登録済みです。既存サロンとの連携を利用してください。',409)
  const organizationId=crypto.randomUUID(),userId=crypto.randomUUID(),contractId=crypto.randomUUID(),code='ORD-'+crypto.randomBytes(6).toString('hex').toUpperCase()
  const memberId=String(p.memberId||s.memberId)
  const member=await one(tx,'SELECT id,"branchId" FROM "DealerSalesMember" WHERE id=$1 AND "dealerId"=$2 AND active',memberId,s.id)
  if(!member)fail('担当者を選択してください。')
  await tx.$executeRawUnsafe('INSERT INTO "Organization" (id,slug,name,"publicCode","serviceMode","createdAt","updatedAt") VALUES ($1,$2,$3,$4,\'ORDER_ONLY\',NOW(),NOW())',organizationId,'ordering-'+organizationId,name,code)
  await tx.$executeRawUnsafe('INSERT INTO "OrganizationStoreProfile" ("organizationId","ownerName",phone,"orimiaPublished") VALUES ($1,$2,$3,FALSE)',organizationId,contact,phone)
  await tx.$executeRawUnsafe('INSERT INTO "AppUser" (id,"organizationId",email,"loginId","displayName","passwordHash",role,active,"orderOnlyPasswordChangeRequired","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,\'STAFF\',TRUE,TRUE,NOW(),NOW())',userId,organizationId,email.toLowerCase(),loginId,contact,passwordHash(crypto,password))
  await tx.$executeRawUnsafe('INSERT INTO "WholesaleDealerContract" (id,"dealerId","organizationId",status,"customerCode","salesMemberId","salesBranchId","approvedAt","showDiscountRate") VALUES ($1,$2,$3,\'ACTIVE\',$4,$5,$6,NOW(),FALSE)',contractId,s.id,organizationId,code,member.id,member.branchId)
  await tx.$executeRawUnsafe('INSERT INTO "DealerErpSalonTerms" ("contractId",note) VALUES ($1,$2)',contractId,'担当者: '+contact+' / '+phone+' / '+email)
  return {id:organizationId,loginId,publicCode:code,loginUrl:'/admin/login'}
 }
 async function salon(s,orgId){
  const c=await one(db,`SELECT c.*,o.name,o."serviceMode" FROM "WholesaleDealerContract" c JOIN "Organization" o ON o.id=c."organizationId" WHERE c."dealerId"=$1 AND c."organizationId"=$2 AND ($3::text IS NULL OR c."salesMemberId"=$3)`,s.id,orgId,s.role==='ADMIN'?null:s.memberId)
  if(!c)fail('サロンが見つかりません。',404)
  const orders=await db.$queryRawUnsafe('SELECT id,"orderNo",status,"totalYen","orderedAt","deliveryNo" FROM "WholesaleOrder" WHERE "dealerId"=$1 AND "organizationId"=$2 ORDER BY "orderedAt" DESC LIMIT 100',s.id,orgId)
  const shipments=await db.$queryRawUnsafe('SELECT sh.id,sh."documentNo",sh.status,sh."shippedAt",sh."deliveredAt",sh."orderId" FROM "DealerErpShipment" sh JOIN "WholesaleOrder" o ON o.id=sh."orderId" WHERE sh."dealerId"=$1 AND o."organizationId"=$2 ORDER BY sh."shippedAt" DESC LIMIT 100',s.id,orgId)
  const invoices=await db.$queryRawUnsafe('SELECT id,"documentNo","closingDate","dueDate","totalYen",voided FROM "DealerErpInvoice" WHERE "dealerId"=$1 AND "organizationId"=$2 ORDER BY "createdAt" DESC LIMIT 100',s.id,orgId)
  return {contract:c,orders:await flow.decorateOrders(db,orders),shipments,invoices}
 }
 async function salonDocuments(session){
  const invoices=await db.$queryRawUnsafe(`SELECT i.id,i."dealerId",i."documentNo",i."closingDate",i."dueDate",i."totalYen",i.voided,d.name AS dealer FROM "DealerErpInvoice" i JOIN "WholesaleDealerContract" c ON c."organizationId"=i."organizationId" AND c."dealerId"=i."dealerId" JOIN "WholesaleDealer" d ON d.id=i."dealerId" WHERE i."organizationId"=$1 AND c.status='ACTIVE' AND d.active ORDER BY i."createdAt" DESC LIMIT 200`,session.organizationId)
  const orders=await db.$queryRawUnsafe(`SELECT o.id,o."dealerId",o."orderNo",o.status,o."totalYen",o."deliveryNo",o."orderedAt",d.name AS dealer FROM "WholesaleOrder" o JOIN "WholesaleDealerContract" c ON c."organizationId"=o."organizationId" AND c."dealerId"=o."dealerId" JOIN "WholesaleDealer" d ON d.id=o."dealerId" WHERE o."organizationId"=$1 AND c.status='ACTIVE' AND d.active ORDER BY o."orderedAt" DESC LIMIT 200`,session.organizationId)
  return {invoices,orders}
 }
 async function document(s,kind,id,salonSide){
  let orgId,issuer,salonInfo,rows,total,tax,number,dateText,watermark='',hidden,taxDetails=''
  if(kind==='invoice'){
   const inv=await one(db,'SELECT * FROM "DealerErpInvoice" WHERE id=$1 AND "dealerId"=$2',id,s.id)
   if(!inv)fail('請求書が見つかりません。',404)
   orgId=inv.organizationId
   if(salonSide&&orgId!==s.organizationId)fail('請求書が見つかりません。',404)
   if(!salonSide)await salon(s,orgId)
   issuer=inv.snapshot.issuer;salonInfo=inv.snapshot.salon;rows=inv.snapshot.lines;total=Number(inv.totalYen);tax=Number(inv.taxYen);number=inv.documentNo
   taxDetails=(inv.snapshot.taxes||[]).map(t=>'<div><dt>消費税 '+esc(t.rate)+'%（対象 '+num(t.subtotal)+'円）</dt><dd>'+num(t.tax)+'円</dd></div>').join('')
   dateText='締日 '+new Date(inv.closingDate).toISOString().slice(0,10)+' / 支払期日 '+new Date(inv.dueDate).toISOString().slice(0,10);watermark=inv.voided?'取消済み':''
  }else{
   const o=await one(db,'SELECT * FROM "WholesaleOrder" WHERE id=$1 AND "dealerId"=$2',id,s.id)
   if(!o)fail('納品書が見つかりません。',404)
   orgId=o.organizationId
   if(salonSide&&orgId!==s.organizationId)fail('納品書が見つかりません。',404)
   if(!salonSide)await salon(s,orgId)
   const tracked=await one(db,'SELECT "orderId" FROM "DealerErpOrder" WHERE "orderId"=$1',id)
   if(tracked){
    rows=await db.$queryRawUnsafe(`SELECT l."productName",l."productCode",l."unitPrice",l."listPrice",SUM(l.quantity-l.returned)::int AS quantity FROM "DealerErpShipmentLine" l JOIN "DealerErpShipment" sh ON sh.id=l."shipmentId" WHERE sh."orderId"=$1 AND sh.status<>'REVERSED' GROUP BY l."lineId",l."productName",l."productCode",l."unitPrice",l."listPrice" HAVING SUM(l.quantity-l.returned)>0 ORDER BY l."productName"`,id)
   }else{
    if(!['SHIPPED','DELIVERED'].includes(o.status))fail('出荷済みの注文のみ納品書を確認できます。',409)
    rows=await db.$queryRawUnsafe('SELECT * FROM "WholesaleOrderLine" WHERE "orderId"=$1 ORDER BY "createdAt",id',id)
   }
   if(!rows.length)fail('出荷明細がありません。',409)
   number=o.deliveryNo||'DN-'+o.orderNo;dateText='受注番号 '+o.orderNo
   issuer=await one(db,'SELECT name,address,phone,"invoiceRegistrationNumber" FROM "WholesaleDealer" WHERE id=$1',s.id)
   salonInfo=await one(db,'SELECT name FROM "Organization" WHERE id=$1',orgId)
   if(!await flow.showRates(db,s.id,orgId)&&o.shippingFeeYen>0)rows.push({productName:'送料',productCode:'',unitPrice:o.shippingFeeYen,listPrice:o.shippingFeeYen,quantity:1})
   total=rows.reduce((n,l)=>n+l.quantity*l.unitPrice,0);tax=Math.round(total*o.taxRate/100);total+=tax
  }
  const c=await one(db,'SELECT status,"showDiscountRate" FROM "WholesaleDealerContract" WHERE "dealerId"=$1 AND "organizationId"=$2',s.id,orgId)
  if(!c||salonSide&&c.status!=='ACTIVE')fail('取引先を確認してください。',403)
  hidden=c.showDiscountRate===false
  const title=kind==='invoice'?'請求書':'納品書',listTotal=rows.reduce((n,l)=>n+l.quantity*Number(l.listPrice??l.unitPrice),0),subtotal=total-tax
  const back=salonSide?'/admin/ordering/documents':'/dealer/salons/'+encodeURIComponent(orgId)
  const html=page(title,`<main class="flow-document"><nav class="no-print"><a href="${back}">戻る</a><button onclick="window.print()">印刷</button></nav><header><div><h1>${title}</h1><p>${esc(number)}</p><p>${esc(dateText)}</p><strong>${watermark}</strong></div><div><strong>${esc(issuer.name)}</strong><p>${esc(issuer.address)}</p><p>${esc(issuer.phone)}</p><p>${esc(issuer.invoiceRegistrationNumber)}</p></div></header><h2>${esc(salonInfo.name)} 御中</h2><table><thead><tr><th>商品 / コード</th><th>数量</th><th>${hidden?'販売単価':'定価'}（税抜）</th><th>金額（税抜）</th></tr></thead><tbody>${rows.map(l=>`<tr><td>${esc(l.productName)}<small>${esc(l.productCode)}</small></td><td>${num(l.quantity)}</td><td>${num(hidden?l.unitPrice:l.listPrice??l.unitPrice)}円</td><td>${num(l.quantity*(hidden?l.unitPrice:l.listPrice??l.unitPrice))}円</td></tr>`).join('')}</tbody></table><dl>${!hidden&&kind==='invoice'?'<div><dt>定価合計</dt><dd>'+num(listTotal)+'円</dd></div><div><dt>合計値引額</dt><dd>'+num(subtotal-listTotal)+'円</dd></div>':''}${hidden||kind==='invoice'?'<div><dt>税抜小計</dt><dd>'+num(subtotal)+'円</dd></div><div><dt>消費税</dt><dd>'+num(tax)+'円</dd></div><div><dt>合計</dt><dd>'+num(total)+'円</dd></div>':'<div><dt>定価合計（税抜）</dt><dd>'+num(listTotal)+'円</dd></div>'}</dl></main>`)
  return taxDetails?html.replace('<div><dt>消費税</dt><dd>'+num(tax)+'円</dd></div>',taxDetails):html
 }
 const shell=(title,mode)=>page(title,`<header class="flow-head"><a href="/admin/ordering">ORIMIA 発注専用</a><nav><a href="/admin/ordering">商品・発注</a><a href="/admin/ordering/documents">注文・納品・請求</a><a href="/admin/ordering/password">パスワード</a><form method="post" action="/api/auth/logout"><button>ログアウト</button></form></nav></header><main class="flow-main"><h1>${esc(title)}</h1><div id="flow-app" data-mode="${mode}"></div></main>`,'<link rel="stylesheet" href="/order-amendments-v687.css?v=687-1"><script src="/order-amendments-v692.js?v=692-1" defer></script><script src="/dealer-order-flow-v698/client.js" defer></script>')
 async function gate(req,res,url){
  const p=url.pathname.replace(/\/$/,'')||'/'
  if(p.startsWith('/dealer-order-flow-v698/')){
   const asset=p.split('/').pop(),type={'client.js':'application/javascript','style.css':'text/css','addon.js':'application/javascript'}[asset]
   if(!type)return false
   if(req.method!=='GET'&&req.method!=='HEAD')fail('許可されていません。',405)
   res.setHeader('Content-Type',type+'; charset=utf-8');res.setHeader('Cache-Control','public,max-age=31536000,immutable');res.end(fs.readFileSync(path.join(__dirname,asset)));return true
  }
  const session=await h.adminSession(req)
  if(!session)return false
  const account=await one(db,'SELECT o."serviceMode",u."orderOnlyPasswordChangeRequired" AS required,u."passwordHash" FROM "Organization" o JOIN "AppUser" u ON u."organizationId"=o.id WHERE u.id=$1 AND o.id=$2 AND u.active',session.userId,session.organizationId)
  if(!account)return false
  const limited=account.serviceMode==='ORDER_ONLY'
  const renderShell=(title,mode)=>{const html=shell(title,mode);return limited?html:html.replace('<nav>','<nav><a href="/admin/products/orders">在庫管理へ戻る</a>').replace('ORIMIA 発注専用','ORIMIA 発注管理')}
  const ownRoute=p.startsWith('/admin/ordering')||p.startsWith('/api/admin/ordering/')
  if(!limited&&!ownRoute)return false
  try{
   if(p==='/api/auth/logout')return false
   if(req.method==='GET'&&(['/wholesale-ordering-v543.css','/order-amendments-v687.css','/order-amendments-v692.js'].includes(p)||/^\/_next\/static\//.test(p)||/^\/brand\//.test(p)))return false
   if(limited&&account.required&&p!=='/admin/ordering/password'&&p!=='/api/admin/ordering/password'){
    if(req.method==='GET'&&!p.startsWith('/api/')){h.redirect(res,'/admin/ordering/password',302);return true}
    fail('初期パスワードを変更してください。',428)
   }
   if(p==='/admin/ordering/password'&&req.method==='GET'){h.html(res,200,renderShell('パスワード変更','password'));return true}
   if(p==='/api/admin/ordering/password'&&req.method==='POST'){
    if(!h.sameOrigin(req))fail('送信元を確認できません。',403)
    const data=await h.readPayload(req),password=String(data.password||'')
    if(!verifyPassword(crypto,String(data.currentPassword||''),account.passwordHash)||password.length<12||password.length>128||password===data.currentPassword)fail('現在のパスワードと、新しい12文字以上のパスワードを確認してください。')
    const hash=passwordHash(crypto,password)
    const changed=await db.$executeRawUnsafe('UPDATE "AppUser" SET "passwordHash"=$2,"orderOnlyPasswordChangeRequired"=FALSE,"updatedAt"=NOW() WHERE id=$1 AND "passwordHash"=$3',session.userId,hash,account.passwordHash)
    if(changed!==1)fail('パスワードが更新されています。ログインし直してください。',409)
    h.json(res,200,{ok:true});return true
   }
   if(['/admin/ordering','/admin/ordering/documents'].includes(p)&&req.method==='GET'){h.html(res,200,renderShell(p.endsWith('documents')?'注文・納品・請求':'商品・発注',p.endsWith('documents')?'documents':'catalog'));return true}
   if(p==='/api/admin/ordering/documents'&&req.method==='GET'){h.json(res,200,{ok:true,...await salonDocuments(session)});return true}
   const docMatch=p.match(/^\/admin\/ordering\/(invoice|delivery)\/([^/]+)$/)
   if(docMatch&&req.method==='GET'){
    const table=docMatch[1]==='invoice'?'DealerErpInvoice':'WholesaleOrder'
    const row=await one(db,'SELECT "dealerId" FROM "'+table+'" WHERE id=$1 AND "organizationId"=$2',decodeURIComponent(docMatch[2]),session.organizationId)
    if(!row)fail('帳票が見つかりません。',404)
    h.html(res,200,await document({...session,id:row.dealerId},docMatch[1],decodeURIComponent(docMatch[2]),true));return true
   }
   if(!limited)return false
   const permitted=(req.method==='GET'&&['/api/admin/wholesale/bootstrap','/api/admin/wholesale/erp/order-amendment'].includes(p))||(req.method==='POST'&&['/api/admin/wholesale/order-quote','/api/admin/wholesale/orders','/api/admin/wholesale/erp/order-amend','/api/admin/wholesale/erp/order-cancel'].includes(p))
   if(permitted)return false
   // Deny by default, including Next Server Actions, alternate admin APIs and tenant switching.
   if(req.method==='GET'&&!p.startsWith('/api/')&&!p.startsWith('/_next/')){h.redirect(res,'/admin/ordering',302);return true}
   if(req.method==='GET'&&(/^\/_next\/static\//.test(p)||/^\/brand\//.test(p)||p==='/wholesale-ordering-v543.css'))return false
   fail('このアカウントは商品・発注・帳票のみ利用できます。',403)
  }catch(e){h.json(res,e.status||500,{ok:false,error:e.status?e.message:'処理できませんでした。'});return true}
 }
 async function handle(req,res,url){
  const p=url.pathname.replace(/\/$/,'')
  const match=p.match(/^\/dealer\/salons\/([^/]+)$/)
  const reportMode={'/dealer/manufacturer-report':'stock-report','/dealer/period-sales':'sales-report'}[p]
  if(!match&&!reportMode&&p!=='/dealer/procurement'&&!p.startsWith('/api/dealer/flow/')&&!/^\/dealer\/flow\/(invoice|delivery)\//.test(p))return false
  try{
   const s=await h.session(req)
   if(!s){if(p.startsWith('/api/'))fail('ログインし直してください。',401);h.redirect(res,'/dealer/login',302);return true}
   if(s.mustChangePassword){if(p.startsWith('/api/'))fail('初期パスワードを変更してください。',428);h.redirect(res,'/dealer/password-change',302);return true}
   if(req.method==='GET'&&(match||reportMode||p==='/dealer/procurement')){
    const mode=reportMode||(match?'salon':'procurement')
    if(match)await salon(s,decodeURIComponent(match[1]))
    else if(!reportMode&&s.role!=='ADMIN'&&!s.canProcure)fail('仕入発注の権限がありません。',403)
    const html=h.portal(s,match?'salons':reportMode==='sales-report'?'sales':'inventory',{scripts:'<script src="/dealer-order-flow-v698/client.js" defer></script>'}).replace('id="wholesale-app"','id="flow-app" data-mode="'+mode+'"').replace('</head>','<link rel="stylesheet" href="/dealer-order-flow-v698/style.css"></head>').replace('<h1>倉庫・在庫</h1>','<h1>メーカー・仕入発注</h1>')
    h.html(res,200,reportMode?html.replace(/<h1>[^<]*<\/h1>/,'<h1>'+(reportMode==='stock-report'?'メーカー別在庫・月次報告':'期間別売上')+'</h1>'):html);return true
   }
   const doc=p.match(/^\/dealer\/flow\/(invoice|delivery)\/([^/]+)$/)
   if(doc&&req.method==='GET'){h.html(res,200,await document(s,doc[1],decodeURIComponent(doc[2]),false));return true}
   const name=p.split('/').pop()
   if(req.method==='GET'){
    if(name==='manufacturer.csv'){const file=await analytics.exportMonthly(s,url.searchParams);res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Cache-Control','private,no-store');res.setHeader('Content-Disposition','attachment; filename="'+file.filename+'"');res.end(file.body);return true}
    if(name==='purchase.csv'){const file=await flow.exportPurchase(s,url.searchParams.get('id'));res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Cache-Control','private,no-store');res.setHeader('Content-Disposition','attachment; filename="'+file.filename+'"');res.end(file.body);return true}
    if(name==='salon'){h.json(res,200,{ok:true,...await salon(s,url.searchParams.get('id'))});return true}
   }
   fail('ページが見つかりません。',404)
  }catch(e){if(!e.status)console.error('[dealer-flow]',e.message);h.json(res,e.status||500,{ok:false,error:e.status?e.message:'処理できませんでした。'});return true}
 }
 return {createSalon,salon,document,gate,handle}
}
module.exports={createPortal,esc}
