'use strict'
const fs=require('node:fs'),path=require('node:path')
const root=process.env.ORIMIA_RUNTIME_ROOT||'/app',target=path.join(root,'dealer-order-flow-v698')
fs.mkdirSync(target,{recursive:true})
for(const file of ['workflow.cjs','exporters.cjs','analytics.cjs','portal.cjs','client.js','style.css','addon.js','migration.sql'])fs.copyFileSync(path.join(__dirname,file),path.join(target,file))
function edit(file,fn){const p=path.join(root,file);const before=fs.readFileSync(p,'utf8');const after=fn(before);if(after===before)throw Error('No changes: '+file);fs.writeFileSync(p,after)}
function once(s,a,b){if(s.split(a).length!==2)throw Error('Anchor mismatch: '+a.slice(0,130));return s.replace(a,b)}
edit('dealer-sales-team-v671.js',s=>once(s,'memberName: m.name, branchId: m.branchId,','memberName: m.name, canProcure: m.canProcure === true, branchId: m.branchId,'))
edit('dealer-erp-v678.js',s=>{
 s=once(s,"  const amendments = require(", "  const flow = require('./dealer-order-flow-v698/workflow.cjs').createFlow({db,crypto,h:{product,order,contract,doc}})\n  const analytics = require('./dealer-order-flow-v698/analytics.cjs').createAnalytics({db,h:{factsSql,scope}})\n  const flowPortal = require('./dealer-order-flow-v698/portal.cjs').createPortal({db,crypto,flow,analytics,h})\n  const logisticsScope = s => s.role === 'ADMIN' || s.canProcure ? null : s.memberId\n  const amendments = require(")
 s=once(s,'actor,lines,release,adopt:order})','actor,lines,release,adopt:order,ensureEditable:flow.ensureEditable})')
 s=once(s,'h:{product,order,contract,doc}', 'h:{product,order,contract,doc,capture:(...args)=>amendments.capture(...args)}')
 s=once(s,'    await amendments.ensureSchema()','    await amendments.ensureSchema()\n    await flow.ensureSchema()')
 s=once(s,"String(orderId || ''), s.id, scope(s))","String(orderId || ''), s.id, logisticsScope(s))")
 s=once(s,'  const actions = {','  const actions = { ...flow.actions, \'salon-issue\':flowPortal.createSalon,')
 s=once(s,'  async function receivePurchase(tx, s, p) {\n    admin(s)','  async function receivePurchase(tx, s, p) {\n    require(\'./dealer-order-flow-v698/workflow.cjs\').procurement(s)')
 s=once(s,"    if (p.cancel === true) {\n      await tx.$executeRawUnsafe('UPDATE \"DealerErpPurchase\"", "    if (p.cancel === true) {\n      if(await one(tx,'SELECT id FROM \"DealerErpPurchaseLine\" WHERE \"purchaseId\"=$1 AND received>0 LIMIT 1',po.id))fail('入荷済みの発注は取消できません。',409)\n      if(po.submittedAt)fail('仕入先へ発注済みのため取消できません。',409)\n      await tx.$executeRawUnsafe('UPDATE \"DealerErpPurchase\"")
 s=once(s,"    const l = await one(tx, 'SELECT * FROM \"DealerErpPurchaseLine\"", "    if(po.fromOrders&&!po.submittedAt)fail('仕入先への発注確定後に入荷してください。',409)\n    const l = await one(tx, 'SELECT * FROM \"DealerErpPurchaseLine\"")
 s=once(s,'  async function purchases(s, q) {\n    admin(s)','  async function purchases(s, q) {\n    require(\'./dealer-order-flow-v698/workflow.cjs\').procurement(s)')
 s=once(s,'viewer: { role: s.role, memberId: s.memberId, name: s.memberName }','viewer: { role: s.role, canProcure:s.role===\'ADMIN\'||s.canProcure===true, memberId: s.memberId, name: s.memberName }')
 s=once(s,'SELECT "id","name","branchId","active" FROM "DealerSalesMember"', 'SELECT "id","name","branchId","active","role","canProcure" FROM "DealerSalesMember"')
 s=once(s,'  async function orders(s, q) {\n    return paged','  async function orders(s, q) {\n    const result=await paged')
 s=once(s,'[s.id, scope(s) || q.get(\'member\') || null, q.get(\'salon\')','[s.id, logisticsScope(s) || q.get(\'member\') || null, q.get(\'salon\')')
 // Insert derived procurement state without changing legacy fulfillment enum values.
 s=once(s,"q, 'ORDER BY o.\"orderedAt\" DESC,o.\"id\"')\n  }","q, 'ORDER BY o.\"orderedAt\" DESC,o.\"id\"')\n    return {...result,rows:await flow.decorateOrders(db,result.rows)}\n  }")
 s=once(s,'order: o, lines: items, shipments, allocations,','order: (await flow.decorateOrders(tx,[o]))[0], lines: items, shipments, allocations,')
 s=once(s,"const getters = { 'calendar-day':","const getters = { 'period-sales':analytics.analysis, 'manufacturer-sales':analytics.manufacturer, 'manufacturer-stock':analytics.stock, suppliers:flow.suppliers, 'product-suppliers':flow.assignments, 'procurement-preview':flow.preview, 'calendar-day':")
 s=once(s,'    return { ...sales, finance:',"    const actualComparison=await analytics.analysis(s,new URLSearchParams({...Object.fromEntries(q),period:'month'}))\n    return { ...sales, actualComparison:actualComparison.summary, finance:")
 s=once(s,"'order-amendment': amendments.view","'order-amendment': async(s,q)=>flow.amendmentView(s,await amendments.view(s,q))")
 s=once(s,'  return { ensureSchema, command, handle, report,','  return { flow, flowPortal, ensureSchema, command, handle, report,')
 s=once(s,"      if (oldDocument) {","      if (oldDocument && oldDocument[2]==='delivery-note') {h.html(res,200,await flowPortal.document(s,'delivery',decodeURIComponent(oldDocument[1]),false));return true}\n      if (oldDocument) {")
 s=once(s,"if (document && req.method === 'GET') { h.html(res, 200, document[1] === 'invoice' ? await printInvoice", "if (document && req.method === 'GET' && document[1]==='invoice') {h.html(res,200,await flowPortal.document(s,'invoice',decodeURIComponent(document[2]),false));return true}\n      if (document && req.method === 'GET') { h.html(res, 200, document[1] === 'invoice' ? await printInvoice")
 s=once(s,"    const { sh, o, items } = await shipment(db, s, sid)","    const { sh, o, items } = await shipment(db, s, sid)\n    if(!await flow.showRates(db,s.id,o.organizationId))return flowPortal.document(s,'delivery',o.id,false)")
 s=once(s,'  async function printConsolidatedOrder(s,orderId){','  async function printConsolidatedOrder(s,orderId){\n    return flowPortal.document(s,\'delivery\',orderId,false)\n')
 return s
})
edit('order-amendments-v687.js',s=>{
 s=once(s,'actor,lines,release,adopt})','actor,lines,release,adopt,ensureEditable=async()=>{}})')
 s=once(s,' async function assertDeadline(tx,o){',' async function assertDeadline(tx,o){\n  await ensureEditable(tx,o)')
 return s
})
edit('wholesale-ordering-v543.js',s=>{
 for(const a of ['async function createDealerProduct(session, payload) {','async function updateDealerProduct(session, productId, payload) {','async function removeDealerProduct(session, productId, payload) {','async function updateContractProductPricing(session, contractId, payload) {']){
  s=once(s,a,a+"\n    if(session.role!=='ADMIN')throw new WholesaleError('商品・契約価格は管理者のみ変更できます。',403)")
 }
 s=once(s,"        if (unitPrice !== Number(current.unitPrice)","        if(session.role!=='ADMIN'&&(unitPrice!==Number(current.unitPrice)||productCode!==(current.productCode||'')||janCode!==(current.janCode||'')))throw new WholesaleError('価格・商品コードは管理者のみ変更できます。',403)\n        if (unitPrice !== Number(current.unitPrice)")
 s=once(s,'        if (current.productId) {',"        if (current.productId && session.role==='ADMIN') {")
 s=once(s,'        } else if (current.dealerProductId) {',"        } else if (current.dealerProductId && session.role==='ADMIN') {")
 s=once(s,'    if (await salesTeamV671.handle(req, res, url)) return true','    if (await dealerErpV678.flowPortal.handle(req, res, url)) return true\n    if (await salesTeamV671.handle(req, res, url)) return true')
 s=once(s,'  return { ensureSchema, handle, adminSession,','  return { flowGate:dealerErpV678.flowPortal.gate, ensureSchema, handle, adminSession,')
 return s
})
edit('server.js',s=>{
 s=once(s,'      installOrimiaHtmlBrandingV500(req, res)','      if(await wholesaleOrdering.flowGate(req,res,url))return\n      installOrimiaHtmlBrandingV500(req, res)')
 s=once(s,"   if(url.pathname === '/api/health/ready')res.setHeader('X-Lien-Campaign-Discount','v697')", "   if(url.pathname === '/api/health/ready')res.setHeader('X-Lien-Dealer-Order-Flow','v698')\n   if(url.pathname === '/api/health/ready')res.setHeader('X-Lien-Campaign-Discount','v697')")
 return s
})
edit('wholesale-ordering-v543.js',s=>{
 s=once(s,'<script src="/dealer-erp-v678-nav.partner-chat-v682.js?v=682-1" defer></script></head>','<script src="/dealer-erp-v678-nav.partner-chat-v682.js?v=682-1" defer></script><script src="/dealer-order-flow-v698/addon.js" defer></script><link rel="stylesheet" href="/dealer-order-flow-v698/style.css"></head>')
 const start=s.indexOf('  async function salonBootstrap('),end=s.indexOf('  async function createDealerInvite(',start)
 let body=s.slice(start,end)
 body=once(body,'    return {\n      organization:','    return dealerErpV678.flow.salonPrices(session,{\n      organization:')
 body=once(body,'    }\n  }','    })\n  }')
 return s.slice(0,start)+body+s.slice(end)
})
const salonPath='public/salon-order-entry-v693.js'
const priceOld=`'<div class="wo-contract-price"><small class="wo-mobile-label">契約価格（税抜）</small><div><strong>' + yen(product.unitPrice) + '</strong><span class="wo-discount-rate">' + rate(product.discountRate) + ' OFF</span></div><span class="wo-list-price">定価 ' + yen(product.listPrice) + '</span></div>'`
const priceNew=`'<div class="wo-contract-price"><small class="wo-mobile-label">契約価格（税抜）</small><div><strong>' + yen(product.unitPrice) + '</strong>' + (product.showDiscountRate===false ? '' : '<span class="wo-discount-rate">' + rate(product.discountRate) + ' OFF</span>') + '</div>' + (product.showDiscountRate===false ? '' : '<span class="wo-list-price">定価 ' + yen(product.listPrice) + '</span>') + '</div>'`
let salonUpdated=once(fs.readFileSync(path.join(root,salonPath),'utf8'),priceOld,priceNew)
salonUpdated=once(salonUpdated,'<h2>発注履歴</h2>', '<h2>発注履歴</h2><a class="wo-button" href="/admin/ordering/documents">納品書・請求書</a>')
fs.writeFileSync(path.join(root,'public/salon-order-entry-v698.js'),salonUpdated)
fs.writeFileSync(path.join(root,'public/inventory-orders-common-layout-v698.js'),once(fs.readFileSync(path.join(root,'public/inventory-orders-common-layout-v572.salon-orders-v693.js'),'utf8'),'/salon-order-entry-v693.js?v=693-1','/salon-order-entry-v698.js?v=698-1'))
edit('server.js',s=>once(s,'/inventory-orders-common-layout-v572.salon-orders-v693.js?v=693-1','/inventory-orders-common-layout-v698.js?v=698-1'))
console.log('dealer-order-flow-v698 runtime patched')
for(const file of ['orimia-store-directory-v670.js','salon-directory-ranking-v673.js']){
 const p=path.join(root,file),source=fs.readFileSync(p,'utf8')
 const needle='COALESCE(p."orimiaPublished",TRUE)=TRUE'
 if(source.includes(needle))fs.writeFileSync(p,source.replaceAll(needle,needle+' AND o."serviceMode"<>\'ORDER_ONLY\''))
}
const erpClient=fs.readFileSync(path.join(root,'dealer-erp-v678-client.order-cutoff-v687.js'),'utf8')
let erpUpdated=once(erpClient,"    async function update() {\n      try {\n        detail = await api('order'","    async function update() {\n      detail=null\n      el.querySelector('.erp-dialog-content').innerHTML='<p role=\"status\">読み込み中</p>'\n      try {\n        detail = await api('order'")
erpUpdated=once(erpUpdated,"badge(o.status),o.tracked ?", "badge(o.status)+'<small>'+({NOT_ORDERED:'メーカー未発注',PARTIAL:'一部メーカー発注済み',ORDERED:'メーカー発注済み'}[o.procurementStatus]||'')+'</small>',o.tracked ?")
erpUpdated=once(erpUpdated,"${metric('納品売上（税抜）',yen(d.summary.actualYen))}${metric('受注見込み（税抜）',yen(d.summary.forecastYen),'/dealer/fulfillment')}","${metric('今月売上（選択月・税抜）',yen(d.summary.actualYen))}${metric('先月売上（税抜）',yen(d.actualComparison.previousYen))}${metric('前月比',d.actualComparison.changePercent===null?'比較対象なし':d.actualComparison.changePercent.toFixed(1)+'%')}")
fs.writeFileSync(path.join(root,'dealer-erp-v698-client.js'),erpUpdated)
edit('dealer-erp-v678.js',s=>s.replaceAll('/dealer-erp-v678-client.order-cutoff-v687.js','/dealer-erp-v698-client.js').replaceAll('?v=687-1', '?v=698-1'))
// Earlier checks keep their assertions, but must follow the new cache-busted entry URL.
for(const f of ['verify-runtime.mjs','verify-compat.mjs']){
 const p=path.join(root,'../tmp/lien-v693',f),s=fs.readFileSync(p,'utf8')
 fs.writeFileSync(p,s.replaceAll('inventory-orders-common-layout-v572.salon-orders-v693.js?v=693-1','inventory-orders-common-layout-v698.js?v=698-1'))
}
