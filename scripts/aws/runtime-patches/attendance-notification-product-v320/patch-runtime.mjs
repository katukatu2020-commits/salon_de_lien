import fs from 'node:fs'

const replaceOnce = (source, search, replacement, label) => {
  const count = source.split(search).length - 1
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`)
  return source.replace(search, replacement)
}
const replaceBetween = (source, start, end, replacement, label) => {
  const first = source.indexOf(start)
  if (first < 0) throw new Error(`${label}: start not found`)
  const last = source.indexOf(end, first + start.length)
  if (last < 0) throw new Error(`${label}: end not found`)
  return source.slice(0, first) + replacement + source.slice(last)
}

const serverFile = '/app/server.js'
let server = fs.readFileSync(serverFile, 'utf8')
server = replaceOnce(server,
  `const { createSalesLedgerAccountsService } = require('./sales-ledger-accounts-v318') /* sales-ledger-accounts-v318 */`,
  `const { createSalesLedgerAccountsService } = require('./sales-ledger-accounts-v318') /* sales-ledger-accounts-v318 */
const { createAttendanceNotificationProductService } = require('./attendance-notification-product-v320') /* attendance-notification-product-v320 */`,
  'service import')
server = replaceOnce(server,
  `const appointmentOperations = createAppointmentOperationsService({`,
  `const attendanceNotificationProduct = createAttendanceNotificationProductService({
  prisma,
  crypto,
  sessionProvider: req => chatSession(req, 'staff'),
}) /* attendance-notification-product-v320-service */
const appointmentOperations = createAppointmentOperationsService({`,
  'service instance')
server = replaceOnce(server,
  `  await salesLedgerAccounts.ensureSchema() /* sales-ledger-accounts-v318-schema */`,
  `  await salesLedgerAccounts.ensureSchema() /* sales-ledger-accounts-v318-schema */
  await attendanceNotificationProduct.ensureSchema() /* attendance-notification-product-v320-schema */`,
  'service schema')
server = replaceOnce(server,
  `      if (await salesLedgerAccounts.handle(req, res, url)) return /* sales-ledger-accounts-v318-route */`,
  `      if (await salesLedgerAccounts.handle(req, res, url)) return /* sales-ledger-accounts-v318-route */
      if (await attendanceNotificationProduct.handle(req, res, url)) return /* attendance-notification-product-v320-route */`,
  'service route')
server = replaceOnce(server,
  `      if (url.pathname === '/api/lien-staff-notifications' && req.method === 'GET') return await staffNotifications(req, res, { history: url.searchParams.get('history') === '1' })`,
  `      if (url.pathname === '/api/lien-staff-notifications' && req.method === 'GET') return await staffNotifications(req, res, { history: url.searchParams.get('history') === '1' })
      if (url.pathname === '/api/lien-customer-notifications/read' && req.method === 'POST') return await markCustomerNotificationsRead(req, res)`,
  'customer notification route')
server = replaceOnce(server,
  `      if (req.method === 'GET' && acceptsAdminHtml && url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return tenantSetup.renderNext(req, res, url, handle) /* tenant-bootstrap-v93-ui-lifecycle */`,
  `      if (req.method === 'GET' && acceptsAdminHtml && url.pathname === '/admin/attendance') {
        const attendanceSession = await chatSession(req, 'staff')
        if (!attendanceSession) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
        res.statusCode = 302
        res.setHeader('Location', '/admin/account?panel=attendance')
        return res.end()
      }
      if (req.method === 'GET' && acceptsAdminHtml && url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return tenantSetup.renderNext(req, res, url, handle) /* tenant-bootstrap-v93-ui-lifecycle */`,
  'attendance page rewrite')

server = replaceOnce(server,
  `SELECT m."id",m."createdAt",LEFT(m."body",180) AS "body",t."id" AS "threadId",t."staffLastReadAt",c."id" AS "customerId",c."name" AS "customerName"`,
  `SELECT m."id",m."createdAt",LEFT(m."body",180) AS "body",t."id" AS "threadId",t."staffName",t."staffLastReadAt",c."id" AS "customerId",c."name" AS "customerName"`,
  'staff notification message scope fields')
server = replaceOnce(server,
  `  const messageCount = await unreadChatCount(req, 'staff')
  const appointmentItems = appointments.map(item => ({ ...item, isUnread: !readKeys.has('appointment:' + item.id) }))
  const messageItems = messages.map(item => ({ ...item, isUnread: !item.staffLastReadAt || new Date(item.createdAt).getTime() > new Date(item.staffLastReadAt).getTime() }))
  const eventItems = events.map(item => ({ ...item, isUnread: !readKeys.has('event:' + item.id) }))`,
  `  const appointmentItems = appointments.map(item => ({ ...item, isUnread: !readKeys.has('appointment:' + item.id) }))
  const messageItems = messages.filter(item => canAccessThread(session, item)).map(item => ({ ...item, isUnread: !item.staffLastReadAt || new Date(item.createdAt).getTime() > new Date(item.staffLastReadAt).getTime() }))
  const messageCount = history ? messageItems.filter(item => item.isUnread).length : await unreadChatCount(req, 'staff')
  const eventItems = events.map(item => ({ ...item, isUnread: !readKeys.has('event:' + item.id) }))`,
  'staff canonical message count')

const customerNotifications = String.raw`async function customerNotificationItems(session) {
  const [broadcasts, messages] = await Promise.all([
    prisma.$queryRawUnsafe('SELECT b."id",b."title",b."body",r."readAt",r."deliveredAt" AS "createdAt" FROM "CustomerBroadcastRecipient" r JOIN "CustomerBroadcast" b ON b."id"=r."broadcastId" WHERE r."customerId"=$1 AND b."status"=\'sent\' ORDER BY r."deliveredAt" DESC LIMIT 200', session.customerId),
    prisma.$queryRawUnsafe('SELECT m."id",m."createdAt",LEFT(m."body",240) AS "body",t."id" AS "threadId",t."staffName",t."customerLastReadAt" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE t."customerId"=$1 AND t."organizationId"=$2 AND m."senderType"=\'staff\' ORDER BY m."createdAt" DESC LIMIT 200', session.customerId, session.organizationId),
  ])
  return [
    ...broadcasts.map(row => ({ id: 'broadcast:' + row.id, readType: 'broadcast', readId: row.id, type: 'broadcast', title: row.title, body: row.body || '', createdAt: row.createdAt, href: '/u/news?open=broadcast:' + encodeURIComponent(row.id), isUnread: !row.readAt })),
    ...messages.map(row => ({ id: 'message:' + row.id, readType: 'message', readId: row.id, type: 'message', title: (row.staffName || '店舗スタッフ') + 'からメッセージ', body: row.body || '', createdAt: row.createdAt, href: '/u/chat?threadId=' + encodeURIComponent(row.threadId), isUnread: !row.customerLastReadAt || new Date(row.createdAt).getTime() > new Date(row.customerLastReadAt).getTime() })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

async function markCustomerNotificationsRead(req, res) {
  const session = await chatSession(req, 'customer')
  if (!session) return json(res, 401, { error: 'ログインが必要です。' })
  const origin = String(req.headers.origin || '')
  if (origin && !new Set(['https://' + req.headers.host, 'http://' + req.headers.host, 'https://salon-de-lien.com']).has(origin)) return json(res, 403, { error: '安全性を確認できませんでした。' })
  const input = await body(req)
  const ids = [...new Set((Array.isArray(input.ids) ? input.ids : []).map(String))].slice(0, 500)
  if (!ids.length) return json(res, 400, { error: '既読にする通知を選択してください。' })
  for (const key of ids) {
    const separator = key.indexOf(':')
    const type = key.slice(0, separator), id = key.slice(separator + 1)
    if (!id) continue
    if (type === 'broadcast') {
      await prisma.$executeRawUnsafe('UPDATE "CustomerBroadcastRecipient" SET "readAt"=COALESCE("readAt",CURRENT_TIMESTAMP) WHERE "customerId"=$1 AND "broadcastId"=$2', session.customerId, id)
    } else if (type === 'message') {
      const rows = await prisma.$queryRawUnsafe('SELECT m."createdAt",t."id" AS "threadId" FROM "ChatMessage" m JOIN "ChatThread" t ON t."id"=m."threadId" WHERE m."id"=$1 AND t."customerId"=$2 AND t."organizationId"=$3 AND m."senderType"=\'staff\' LIMIT 1', id, session.customerId, session.organizationId)
      if (rows[0]) await prisma.$executeRawUnsafe('UPDATE "ChatThread" SET "customerLastReadAt"=CASE WHEN "customerLastReadAt" IS NULL OR "customerLastReadAt"<$1 THEN $1 ELSE "customerLastReadAt" END WHERE "id"=$2', rows[0].createdAt, rows[0].threadId)
    }
  }
  return json(res, 200, { ok: true, marked: ids.length })
}

async function customerNewsPage(res, session) {
  const data = await customerAppData(session)
  const items = await customerNotificationItems(session)
  const rows = items.length ? items.map(item => '<article class="cn-row ' + (item.isUnread ? 'is-unread' : '') + '"><label class="cn-check"><input type="checkbox" data-cn-select="' + htmlEscape(item.id) + '" ' + (item.isUnread ? '' : 'disabled') + ' aria-label="' + htmlEscape(item.title) + 'を選択"></label><a href="' + htmlEscape(item.href) + '"' + (item.type === 'broadcast' && item.isUnread ? ' data-cn-open="' + htmlEscape(item.id) + '"' : '') + '><span class="cn-symbol">' + customerIcon(item.type === 'message' ? 'mail' : 'news') + '</span><span class="cn-copy"><span class="cn-meta">' + (item.isUnread ? '<b>未読</b>' : '<span>既読</span>') + '<time>' + htmlEscape(jpDate(item.createdAt, true)) + '</time></span><strong>' + htmlEscape(item.title) + '</strong><p>' + htmlEscape(item.body) + '</p></span>' + customerIcon('chevron','cn-arrow') + '</a></article>').join('') : '<p class="cn-empty">新しいお知らせはありません。</p>'
  const style = '<style>.cn-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:14px 18px;padding:12px 14px;border:1px solid var(--line);border-radius:13px;background:#fff}.cn-toolbar label{font-size:10px;font-weight:800}.cn-toolbar button{min-height:38px;border:0;border-radius:10px;background:var(--rose);padding:0 13px;color:#fff;font-size:10px;font-weight:900}.cn-toolbar button:disabled{opacity:.45}.cn-list{margin:0 18px 28px;overflow:hidden;border:1px solid var(--line);border-radius:15px;background:#fff}.cn-row{display:grid;grid-template-columns:38px 1fr;border-bottom:1px solid var(--line)}.cn-row:last-child{border-bottom:0}.cn-row.is-unread{background:#fff7f9}.cn-check{display:grid;place-items:center}.cn-check input{width:16px;height:16px;accent-color:var(--rose)}.cn-row>a{display:grid;grid-template-columns:38px 1fr 18px;align-items:center;gap:10px;padding:14px 12px 14px 0}.cn-symbol{display:grid;width:36px;height:36px;place-items:center;border-radius:50%;background:var(--rose-soft);color:var(--rose)}.cn-symbol .icon{width:19px;height:19px}.cn-copy{min-width:0}.cn-copy strong{display:block;margin-top:5px;font-size:11px}.cn-copy p{overflow:hidden;margin:5px 0 0;color:var(--muted);font-size:10px;text-overflow:ellipsis;white-space:nowrap}.cn-meta{display:flex;align-items:center;gap:8px;color:#a6958e;font-size:8px}.cn-meta b{border-radius:99px;background:#d84f69;padding:2px 6px;color:#fff}.cn-meta time{margin-left:auto}.cn-arrow{width:16px!important;color:#b6a59e}.cn-empty{padding:42px;text-align:center;color:var(--muted);font-size:11px}@media(min-width:1024px){.cn-toolbar,.cn-list{max-width:1120px;margin-right:auto;margin-left:auto}.cn-toolbar{margin-top:22px}.cn-list{margin-top:14px}}</style>'
  const script = '<script>document.addEventListener("DOMContentLoaded",()=>{const mark=ids=>fetch("/api/lien-customer-notifications/read",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids})});const all=document.querySelector("[data-cn-all]"),boxes=[...document.querySelectorAll("[data-cn-select]:not(:disabled)")],button=document.querySelector("[data-cn-read]");const sync=()=>{const selected=boxes.filter(x=>x.checked);button.disabled=!selected.length;button.textContent=selected.length?"選択した"+selected.length+"件を既読にする":"選択した通知を既読にする";all.checked=boxes.length>0&&selected.length===boxes.length;all.indeterminate=selected.length>0&&selected.length<boxes.length};boxes.forEach(x=>x.addEventListener("change",sync));all.addEventListener("change",()=>{boxes.forEach(x=>x.checked=all.checked);sync()});button.addEventListener("click",async()=>{button.disabled=true;const response=await mark(boxes.filter(x=>x.checked).map(x=>x.dataset.cnSelect));if(response.ok)location.reload();else{const result=await response.json().catch(()=>({}));alert(result.error||"既読にできませんでした。");button.disabled=false}});document.querySelectorAll("[data-cn-open]").forEach(link=>link.addEventListener("click",async event=>{event.preventDefault();const response=await mark([link.dataset.cnOpen]);if(response.ok)location.assign(link.href)}));sync()})</script>'
  const bodyHtml = '<div class="page-title"><h1>お知らせ</h1></div><div class="cn-toolbar"><label><input type="checkbox" data-cn-all> 表示中の未読をすべて選択</label><button type="button" data-cn-read disabled>選択した通知を既読にする</button></div><section class="cn-list">' + rows + '</section>' + style + script
  sendCustomerHtml(res, customerShell({ title: 'お知らせ', unread: data.unread, back: '/u/home', body: bodyHtml }))
}

`
server = replaceBetween(server, `async function customerNewsPage(res, session) {`, `async function customerMenuPage(res, session) {`, customerNotifications, 'customer notifications page')

fs.writeFileSync(serverFile, server)

const catalogFile = '/app/catalog-operations.js'
let catalog = fs.readFileSync(catalogFile, 'utf8')
catalog = replaceOnce(catalog, `async function readBody(req, maxBytes = 65536) {`, `async function readBody(req, maxBytes = 12 * 1024 * 1024) {`, 'catalog upload body limit')
catalog = replaceOnce(catalog,
  `function checked(form, name) {`,
  `function productImage(form) {
  const value = String(form.get('imageDataUrl') || '').trim()
  if (!value) return null
  const match = value.match(/^data:(image\\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw new CatalogError('商品画像はJPEG・PNG・WebPを選択してください。')
  if (Buffer.byteLength(match[2], 'base64') > 2 * 1024 * 1024) throw new CatalogError('商品画像は2MB以下にしてください。')
  return value
}

function checked(form, name) {`,
  'catalog product image validation')
catalog = replaceOnce(catalog,
  `    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SalonMenu_org_active_idx" ON "SalonMenu"("organizationId", "active", "sortOrder")')`,
  `    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SalonMenu_org_active_idx" ON "SalonMenu"("organizationId", "active", "sortOrder")')
    await prisma.$executeRawUnsafe('ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT')`,
  'catalog image schema')
catalog = replaceOnce(catalog,
  `    const concernTags = productTags(form)
    const existing = await prisma.product.findFirst({`,
  `    const concernTags = productTags(form)
    const imageUrl = productImage(form)
    const existing = await prisma.product.findFirst({`,
  'product image create input')
catalog = replaceOnce(catalog,
  `      const product = await prisma.product.update({ where: { id: existing.id }, data, select: { id: true } })
      return { id: product.id, name, reactivated: true, created: false }`,
  `      const product = await prisma.product.update({ where: { id: existing.id }, data, select: { id: true } })
      if (imageUrl) await prisma.$executeRawUnsafe('UPDATE "Product" SET "imageUrl"=$2 WHERE "id"=$1 AND "organizationId"=$3', product.id, imageUrl, session.organizationId)
      return { id: product.id, name, reactivated: true, created: false }`,
  'reactivated product image')
catalog = replaceOnce(catalog,
  `    return { id: product.id, name, reactivated: false, created: true }`,
  `    if (imageUrl) await prisma.$executeRawUnsafe('UPDATE "Product" SET "imageUrl"=$2 WHERE "id"=$1 AND "organizationId"=$3', product.id, imageUrl, session.organizationId)
    return { id: product.id, name, reactivated: false, created: true }`,
  'created product image')
fs.writeFileSync(catalogFile, catalog)

const commercialFile = '/app/commercial-admin-v101.js'
let commercial = fs.readFileSync(commercialFile, 'utf8')
commercial = replaceOnce(commercial,
  `<a href="/admin/settings#store-profile" role="menuitem">${'${icon(\'store\')}'}店舗設定<span class="arrow">${'${icon(\'arrow\')}'}</span></a><a href="/admin/account" role="menuitem">${'${icon(\'user\')}'}アカウント設定<span class="arrow">${'${icon(\'arrow\')}'}</span></a>`,
  `<a href="/admin/settings#store-profile" role="menuitem">${'${icon(\'store\')}'}店舗設定<span class="arrow">${'${icon(\'arrow\')}'}</span></a><a href="/admin/account?panel=attendance" role="menuitem" data-ca-attendance-link>${'${icon(\'clock\')}'}出退勤管理<span class="arrow">${'${icon(\'arrow\')}'}</span></a><a href="/admin/account" role="menuitem">${'${icon(\'user\')}'}アカウント設定<span class="arrow">${'${icon(\'arrow\')}'}</span></a>`,
  'store menu attendance link')
commercial += '\n' + fs.readFileSync('/app/attendance-client-v320.js', 'utf8') + '\n'
fs.writeFileSync(commercialFile, commercial)
