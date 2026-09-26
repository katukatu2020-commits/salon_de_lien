import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=process.env.LIEN_RUNTIME_ROOT||'/app',source=path.dirname(fileURLToPath(import.meta.url))
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),write=(f,v)=>fs.writeFileSync(path.join(root,f),v),fragment=f=>fs.readFileSync(path.join(source,f),'utf8')
function replace(v,a,b,count=1){if(v.split(a).length!==count+1)throw Error('Unexpected anchor: '+a);return v.split(a).join(b)}
for(const [from,to] of [['schema.sql','order-amendments-v687.sql'],['order-amendments.cjs','order-amendments-v687.js'],['order-amendments-client.js','public/order-amendments-v687.js'],['order-amendments.css','public/order-amendments-v687.css']])write(to,fragment(from))
const assets='<link rel="stylesheet" href="/order-amendments-v687.css?v=687-1"><script src="/order-amendments-v687.js?v=687-1" defer></script>'
let erp=read('dealer-erp-v678.js')
erp=replace(erp,'  let schemaPromise',"  const amendments = require('./order-amendments-v687').createOrderAmendments({db,crypto,fail,num,text,actor,lines,release,adopt:order})\n  let schemaPromise")
erp=replace(erp,'    return schemaPromise','    await schemaPromise\n    await amendments.ensureSchema()')
erp=replace(erp,"    const reason = text(p.reason, '変更理由', 1000)","    await amendments.assertDeadline(tx, o)\n    const reason = text(p.reason, '変更理由', 1000)")
erp=replace(erp,"  const actions = { 'chat-send':", "  const actions = { 'order-cutoff': amendments.savePolicy, 'order-amend': amendments.amend, 'order-cancel': amendments.cancel, 'chat-send':")
erp=replace(erp,"!['thread', 'message', 'read', 'chat-send', 'chat-read'].includes(action)","!['order-amend', 'order-cancel', 'thread', 'message', 'read', 'chat-send', 'chat-read'].includes(action)")
erp=replace(erp,"!['options', 'threads', 'messages', 'unread', 'chat-partners', 'chat-messages'].includes(name)","!['order-amendment', 'options', 'threads', 'messages', 'unread', 'chat-partners', 'chat-messages'].includes(name)")
erp=replace(erp,"        const getters = { 'chat-partners':", "        const getters = { 'order-amendment': amendments.view, 'order-cutoff': amendments.policy, 'chat-partners':")
erp=replace(erp,'      return clean({ order: o, lines: items, shipments, allocations })','      const deadline = await amendments.deadline(tx, o)\n      return clean({ order: o, lines: items, shipments, allocations, cutoffAt: deadline.cutoffAt, cutoffOpen: !deadline.cutoffAt || new Date(deadline.now) < new Date(deadline.cutoffAt) })')
erp=replace(erp,"    if (o.tracked || target === 'SHIPPED')", "    if (target === 'CANCELLED') await amendments.assertDeadline(tx, o)\n    if (o.tracked || target === 'SHIPPED')")
erp=replace(erp,'  return { ensureSchema, command, handle, report, legacyGuard, orderDetail }','  return { ensureSchema, command, handle, report, legacyGuard, orderDetail, orderDeadline: amendments.deadline, captureOrder: amendments.capture, lockOrders: amendments.lock, assertOrderDeadline: amendments.assertDeadline }')
erp=replace(erp,"'/dealer-erp-v678-client.stock-note-v681.js?v=681-1'","'/dealer-erp-v678-client.order-cutoff-v687.js?v=687-1'")
erp=replace(erp,"    const assets = {", "    const assets = { '/dealer-erp-v678-client.order-cutoff-v687.js': 'application/javascript',")
write('dealer-erp-v678.js',erp)
let service=read('wholesale-ordering-v543.js')
for(const dealer of ['dealerId','normalized.dealerId']){
 const tail='orderId, orderNo, '+dealer+', session.organizationId, requestedDeliveryDate, salonNote, session.userId, session.displayName, taxRate, subtotalYen, taxYen, totalYen)'
 service=replace(service,tail,tail+'\n      await dealerErpV678.captureOrder(tx, orderId, '+dealer+')')
}
// Acquire the same dealer lock before recording the order time and its cutoff.
service=replace(service,'await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrder"', 'await dealerErpV678.lockOrders(tx, '+ 'DEALER_V687'+')\n      await tx.$executeRawUnsafe(`INSERT INTO "WholesaleOrder"',2)
service=service.replace('DEALER_V687','dealerId').replace('DEALER_V687','normalized.dealerId')
service=replace(service,'$12,NOW(),NOW(),NOW())`, orderId, orderNo,','$12,clock_timestamp(),clock_timestamp(),clock_timestamp())`, orderId, orderNo,',2)
service=replace(service,'        const lineTotal = unitPrice * deliveredQuantity','        if (unitPrice !== Number(current.unitPrice) || deliveredQuantity !== Number(current.deliveredQuantity) || productCode !== (current.productCode || \'\') || janCode !== (current.janCode || \'\')) { try { await dealerErpV678.assertOrderDeadline(tx, order) } catch (error) { throw new WholesaleError(error.message, error.status || 500) } }\n        const lineTotal = unitPrice * deliveredQuantity')
service=replace(service,'    return { order: { ...orders[0], taxRate:',`    const deadline = await dealerErpV678.orderDeadline(prisma, orders[0])
    const tracked = (await prisma.$queryRawUnsafe('SELECT EXISTS(SELECT 1 FROM "DealerErpOrder" WHERE "orderId"=$1) AS tracked', orderId))[0].tracked
    return { cutoffAt: deadline.cutoffAt, cutoffOpen: !deadline.cutoffAt || new Date(deadline.now) < new Date(deadline.cutoffAt), tracked, order: { ...orders[0], taxRate:`)
const oldCounts='COUNT(l."id")::int AS "lineCount",COALESCE(SUM(l."quantity"),0)::int AS "totalQuantity"'
service=replace(service,oldCounts,'COUNT(l."id") FILTER (WHERE l.quantity>COALESCE(el.cancelled,0))::int AS "lineCount",COALESCE(SUM(l."quantity"-COALESCE(el.cancelled,0)),0)::int AS "totalQuantity",o."dealerId",(SELECT a."cutoffAt" FROM "WholesaleOrderAmendment" a WHERE a."orderId"=o.id) AS "cutoffAt"',2)
// Only the two aggregate history queries receive the extra relation.
service=replace(service,'LEFT JOIN "WholesaleOrderLine" l ON l."orderId"=o."id"\n      WHERE o."organizationId"=$1 GROUP BY', 'LEFT JOIN "WholesaleOrderLine" l ON l."orderId"=o."id" LEFT JOIN "DealerErpOrderLine" el ON el."lineId"=l.id\n      WHERE o."organizationId"=$1 GROUP BY')
service=replace(service,'LEFT JOIN "WholesaleOrderLine" l ON l."orderId"=o."id" WHERE o."dealerId"=$1 AND ($2::text IS NULL OR o."salesMemberId"=$2) GROUP BY','LEFT JOIN "WholesaleOrderLine" l ON l."orderId"=o."id" LEFT JOIN "DealerErpOrderLine" el ON el."lineId"=l.id WHERE o."dealerId"=$1 AND ($2::text IS NULL OR o."salesMemberId"=$2) GROUP BY')
service=replace(service,'<script src="/wholesale-ordering-client-v543.js?v=678-erp1" defer></script>',assets+'<script src="${initialView === \'orders\' ? \'/dealer-order-entry-v687.js?v=687-1\' : \'/wholesale-ordering-client-v543.js?v=678-erp1\'}" defer></script>')
write('wholesale-ordering-v543.js',service)
const historyButton="'<button type=\"button\" class=\"wo-button oa-history-button\" data-order-edit-v687=\"' + esc(order.id) + '\" data-dealer=\"' + esc(order.dealerId) + '\">編集・詳細</button>'"
let salon=read('public/salon-order-entry-v686.js')
salon=replace(salon,"+ statusBadge(order.status) + '</div></article>'", "+ statusBadge(order.status) + "+historyButton+" + '</div></article>'")
salon=replace(salon,"+ date(order.orderedAt, true) + '</small></div><div><span class=\"wo-mobile-label\">発注先", "+ date(order.orderedAt, true) + '</small>' + (order.cutoffAt ? '<small>変更締切 ' + date(order.cutoffAt, true) + '</small>' : '') + '</div><div><span class=\"wo-mobile-label\">発注先")
salon=replace(salon,'  start()','  window.addEventListener(\'orimia:order-amended-v687\', () => { if (page === \'salon\') reloadSalon().catch(e => notify(e.message, \'error\')) })\n  start()')
salon=replace(salon,"(Number(order.totalYen) > 0 ? yen(order.totalYen) : 'ディーラー確認中')","(Number(order.totalYen) > 0 || order.status === 'CANCELLED' ? yen(order.totalYen) : 'ディーラー確認中')")
write('public/salon-order-entry-v687.js',salon)
let dealer=read('wholesale-ordering-client-v543.js')
dealer=replace(dealer,"    return dealerStats() + '<section class=\"wo-workspace wo-order-management-v641\">","    return '<section class=\"oa-cutoff\" data-order-cutoff-v687></section>' + dealerStats() + '<section class=\"wo-workspace wo-order-management-v641\">")
dealer=replace(dealer,"+ orderDocumentActions(order) + '</article>'", "+ '<div class=\"oa-order-actions\">' + "+historyButton+" + orderDocumentActions(order) + '</div></article>'")
dealer=replace(dealer,"+ date(order.orderedAt, true) + '</small></span><span><small class=\"wo-mobile-label\">美容室", "+ date(order.orderedAt, true) + '</small>' + (order.cutoffAt ? '<small>変更締切 ' + date(order.cutoffAt, true) + '</small>' : '') + '</span><span><small class=\"wo-mobile-label\">美容室")
const renderEnd="<dialog id=\"wo-manage-dialog\" class=\"wo-dialog wo-manage-dialog\"></dialog>'"
dealer=replace(dealer,renderEnd,renderEnd+'\n    window.OrimiaOrderAmendmentsV687?.mountSettings(root)')
dealer=replace(dealer,'  start()','  window.addEventListener(\'orimia:order-amended-v687\', () => { if (page === \'dealer\') reloadDealer().catch(e => notify(e.message, \'error\')) })\n  start()')
dealer=replace(dealer,"(Number(order.totalYen) ? yen(order.totalYen) : '未確定')","(Number(order.totalYen) || order.status === 'CANCELLED' ? yen(order.totalYen) : '未確定')")
dealer=replace(dealer,"    const editable = order.status === 'ORDERED' || order.status === 'ACCEPTED'","    const editable = detail.cutoffOpen && (order.status === 'ORDERED' || order.status === 'ACCEPTED')")
dealer=replace(dealer,'data-status="CANCELLED">注文を取消','data-status="CANCELLED" \' + (detail.cutoffOpen ? \'\' : \'disabled\') + \'>注文を取消',2)
dealer=replace(dealer,"      dialog.innerHTML = orderDetailDialog()","      if (dealer.detail.tracked) { location.href = '/dealer/fulfillment?order=' + encodeURIComponent(id); return }\n      dialog.innerHTML = orderDetailDialog()")
write('public/dealer-order-entry-v687.js',dealer)
let fulfillment=read('dealer-erp-v678-client.stock-note-v681.js')
fulfillment=replace(fulfillment,"${!l.shipped&&!l.cancelled ? button('明細変更'", "${detail.cutoffOpen&&!l.shipped&&!l.cancelled ? button('明細変更'")
fulfillment=replace(fulfillment,"+button('未出荷分を取消','data-cancel-remainder','Undo2')", "+(detail.cutoffOpen ? button('未出荷分を取消','data-cancel-remainder','Undo2') : '')")
fulfillment=replace(fulfillment,'<h3>${esc(o.orderNo)} ${badge(o.status)}</h3>', '<h3>${esc(o.orderNo)} ${badge(o.status)}</h3>${detail.cutoffAt ? `<p>変更締切 ${stamp(detail.cutoffAt)} ${detail.cutoffOpen ? \'\' : \'（締切済み）\'}</p>` : \'\'}')
write('dealer-erp-v678-client.order-cutoff-v687.js',fulfillment)
write('public/inventory-orders-common-layout-v572.salon-orders-v687.js',replace(read('public/inventory-orders-common-layout-v572.salon-orders-v686.js'),'/salon-order-entry-v686.js?v=686-1','/salon-order-entry-v687.js?v=687-1'))
let server=read('server.js')
server=replace(server,'/inventory-orders-common-layout-v572.salon-orders-v686.js?v=686-1','/inventory-orders-common-layout-v572.salon-orders-v687.js?v=687-1')
server=replace(server,'<script id=\\"orimia-inventory-orders-common-script-v572\\"',assets.replaceAll('"','\\"')+'<script id=\\"orimia-inventory-orders-common-script-v572\\"')
const marker="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Order-Entry','v686')"
server=replace(server,marker,marker+"\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Order-Amendment-Cutoff','v687')")
write('server.js',server)
console.log('v687 installed: order amendments and immutable JST cutoff snapshots')
