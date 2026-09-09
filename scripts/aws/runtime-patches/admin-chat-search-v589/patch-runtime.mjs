import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const marker = 'admin-chat-search-v589'
function once(source,before,after,label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${marker}: expected one ${label}, found ${count}`)
  return source.replace(before,after)
}
function between(source,start,end,replacement,label) {
  if (source.split(start).length !== 2 || source.split(end).length !== 2) throw new Error(`${marker}: invalid ${label} boundaries`)
  const from=source.indexOf(start),to=source.indexOf(end,from)
  if (to<=from) throw new Error(`${marker}: invalid ${label} order`)
  return source.slice(0,from)+replacement+source.slice(to)
}
const file=path.join(root,'.next/server/app/admin/customers/messages/page.js')
let page=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')
if (page.includes(marker)) throw new Error('Chat inbox already patched')
page=once(page,'          v = t(995239);','          v = t(995239);\n        const inboxUi = require("/app/admin-chat-inbox-v589"); /* '+marker+' */','inbox module')
page=between(page,'          let t = await o._.$queryRawUnsafe(\'SELECT t.*, c."name" AS "customerName"','          let q = !m && e?.customerId',`          const m = await inboxUi.findSelectedThread(o._, s.organizationId, e);
          const u = m ? await o._.$queryRawUnsafe('SELECT * FROM "ChatMessage" WHERE "threadId"=$1 ORDER BY "createdAt" ASC LIMIT 300', m.id) : [];
`,'paginated query')
page=once(page,`          if (m) await o._.$executeRawUnsafe('UPDATE "ChatThread" SET "staffLastReadAt"=CURRENT_TIMESTAMP WHERE "id"=$1', m.id);`,
`          if (m) await o._.$executeRawUnsafe('UPDATE "ChatThread" SET "staffLastReadAt"=CURRENT_TIMESTAMP WHERE "id"=$1 AND "organizationId"=$2', m.id, s.organizationId);
          const inbox = await inboxUi.loadInbox(o._, s.organizationId, { ...e, ...(m ? { threadId:m.id, customerId:"" } : {}) });`,'selected read state')
page=once(page,'className: "mx-auto grid w-full max-w-7xl gap-6",\n            children: [\n              r.jsx("script", { src: "/content-edit-delete-client-v560.js"','className: "admin-chat-workspace-v589 mx-auto grid w-full max-w-7xl gap-6",\n            "data-chat-selected": String(Boolean(m || q)),\n            children: [\n              r.jsx("script", { src: "/content-edit-delete-client-v560.js"','workspace')
page=once(page,'              r.jsx("script", { src: "/content-edit-delete-client-v560.js", defer: true, "data-content-edit-delete-v465": "1" }),',
`              r.jsx("script", { src: "/content-edit-delete-client-v560.js", defer: true, "data-content-edit-delete-v465": "1" }),
              r.jsx("link", { rel:"stylesheet", href:"/admin-chat-search-v589.css" }),
`,'scoped assets')
page=between(page,'              r.jsx(i.mr, {\n                eyebrow: (0, r.jsxs)("span", { className: "inline-flex items-center gap-2", children: [r.jsx(d,','              (0, r.jsxs)("div", {\n                className: "admin-chat-layout',
`              r.jsx("header", { className:"inbox-page-heading", children:r.jsx("h1",{children:"お客様とのチャット"}) }),
`,'compact heading')
page=once(page,'className: "admin-chat-layout grid min-h-[620px] gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]",\n                style: { gridTemplateColumns: "19rem minmax(0,1fr)" },','className: "admin-chat-layout admin-chat-layout-v589",','workspace grid')
page=between(page,'                  r.jsx(i.IP, {\n                    className: "admin-chat-thread-list','                  r.jsx(i.IP, {\n                    className: "admin-chat-conversation',
`                  r.jsx("aside", { className:"admin-chat-thread-list", "data-inbox-v589":"1", "aria-label":"顧客チャット一覧", dangerouslySetInnerHTML:{ __html:inboxUi.renderInbox(inbox) } }),
`,'searchable sidebar')
page=once(page,'r.jsx("a",{href:"/admin/customers/messages/chat",className:"admin-chat-mobile-back",children:"← トーク一覧"})',
`r.jsxs("a",{href:inboxUi.urlFor(inbox.params,{threadId:"",customerId:""}),className:"admin-chat-mobile-back",children:[r.jsx("span",{dangerouslySetInnerHTML:{__html:inboxUi.icons.back}}),"会話一覧"]})`,'mobile return context')
const oldTitle='(0, r.jsxs)("div", { className: "border-b border-lien pb-4", children: [r.jsx("h2", { className: "text-xl font-semibold text-lien-ink", children: m.customerName + " → " + m.staffName }), r.jsx("p", { className: "mt-1 text-xs text-lien-muted", children: "お客様との相談履歴" })] })'
page=once(page,oldTitle,`r.jsxs("div",{className:"inbox-conversation-heading",children:[r.jsxs("div",{children:[r.jsx("h2",{children:m.customerName}),r.jsx("p",{children:"担当 "+(m.staffName||"未設定")})]}),r.jsxs("a",{href:"/admin/customers/"+encodeURIComponent(m.customerId),className:"inbox-chart-link",children:[r.jsx("span",{dangerouslySetInnerHTML:{__html:inboxUi.icons.customer}}),"顧客カルテ"]})]})`,'conversation identity')
fs.writeFileSync(file,page)
const serverPath=path.join(root,'server.js')
let server=fs.readFileSync(serverPath,'utf8').replace(/\r\n/g,'\n')
server=once(server,'  } /* admin-shared-page-format-v572-assets */',`  } /* admin-shared-page-format-v572-assets */
  if (adminRoute && !output.includes('id="orimia-admin-chat-search-v589"')) {
    output = output.replace('<head>', '<head><script id="orimia-admin-chat-search-v589" src="/admin-chat-search-client-v589.js" defer></script>')
  } /* ${marker}-lifecycle */`,'client navigation bootstrap')
server=once(server,"const { handlePublicSiteRequest } = require('./public-site') /* public-review-pages-v46 */",`const { handlePublicSiteRequest } = require('./public-site') /* public-review-pages-v46 */
const adminChatInbox = require('./admin-chat-inbox-v589')`,'service import')
server=once(server,'globalThis.__lienChatPrisma = prisma',`globalThis.__lienChatPrisma = prisma
const adminChatSearch = adminChatInbox.createService({ prisma, staffSession:req => chatSession(req,'staff') })`,'service instance')
server=once(server,'  await ensureSmsComplianceSchema()\n  const handle = app.getRequestHandler()',`  await ensureSmsComplianceSchema()
  await adminChatInbox.ensureIndexes(prisma) /* ${marker} */
  const handle = app.getRequestHandler()`,'search indexes')
server=once(server,"      if (await billing.enforceAccess(req, res, url)) return /* stripe-subscription-billing-v52-access */",`      if (await billing.enforceAccess(req, res, url)) return /* stripe-subscription-billing-v52-access */
      if (await adminChatSearch.handle(req, res, url)) return /* ${marker} */`,'authenticated endpoint')
server=between(server,"      if (url.pathname === '/admin/customers/messages/chat') {","      if (url.pathname === '/u/messages')",`      if (url.pathname === '/admin/customers/messages/chat') {
        const query = new URLSearchParams({ chat:'1' })
        for (const key of ['threadId','customerId','q','unread','staff','page']) {
          if (url.searchParams.has(key)) query.set(key,url.searchParams.get(key))
        }
        res.statusCode = 307
        res.setHeader('Cache-Control','private, no-store')
        res.setHeader('Location','/admin/customers/messages?' + query)
        return res.end()
      }
`,'filter-preserving route')
server=once(server,"      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Public-Audience-Sites', 'v588') /* public-audience-sites-v588 */",`      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Public-Audience-Sites', 'v588') /* public-audience-sites-v588 */
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Chat-Search', 'v589') /* ${marker} */`,'readiness')
fs.writeFileSync(serverPath,server)
console.log(JSON.stringify({release:marker,serverSearch:true,scopedLayout:true,readStatePreserved:true}))
