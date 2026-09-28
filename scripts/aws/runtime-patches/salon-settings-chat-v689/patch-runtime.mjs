import fs from 'node:fs'
import path from 'node:path'
const root = process.env.RUNTIME_ROOT || '/app'
const here = path.dirname(new URL(import.meta.url).pathname)
const read = file => fs.readFileSync(path.join(root,file),'utf8')
const write = (file,value) => fs.writeFileSync(path.join(root,file),value)
function once(source,old,value) {
  if (source.split(old).length !== 2) throw Error('Expected one anchor: '+old.slice(0,140))
  return source.replace(old,value)
}
write('salon-settings-chat-v689.js',fs.readFileSync(path.join(here,'salon-settings-chat.cjs'),'utf8'))
write('public/salon-chat-v689.js',fs.readFileSync(path.join(here,'chat-client.js'),'utf8'))
write('public/salon-settings-chat-v689.css',fs.readFileSync(path.join(here,'salon-settings-chat.css'),'utf8'))
let server = read('server.js')
server = once(server,"const adminChatInbox = require('./admin-chat-inbox-v589')","const salonSettingsChatV689 = require('./salon-settings-chat-v689')\nconst adminChatInbox = require('./admin-chat-inbox-v589')")
server = once(server,"return users[0] ? { ...value, userId: value.userId || users[0].id, displayName: users[0].displayName, role: users[0].role, isSharedStoreAccount: users[0].isSharedStoreAccount === true } : null", "return users[0] ? salonSettingsChatV689.actorFor(prisma, {...value, userId:users[0].id}) : null")
const accessStart = server.indexOf('function canAccessThread('), accessEnd = server.indexOf('\nfunction json(',accessStart)
if (accessStart < 0 || accessEnd < 0) throw Error('Chat authorization anchor')
server = server.slice(0,accessStart)+'function canAccessThread(session, thread) { return salonSettingsChatV689.canAccessThread(session, thread) }'+server.slice(accessEnd)
const formStart = server.indexOf('async function chatForm('), formEnd = server.indexOf('\nasync function customerChatForm(',formStart)
if (formStart < 0 || formEnd < 0) throw Error('Chat form anchor')
server = server.slice(0,formStart)+`async function chatForm(req, res) {
  return salonSettingsChatV689.handleStaffForm(req, res, prisma, await chatSession(req, 'staff'))
}
`+server.slice(formEnd)
server = once(server,"  if (data.action === 'send') {",`  if (data.action === 'send' && audience === 'staff') {
    try { return json(res, 201, {success:true, ...await salonSettingsChatV689.sendStaff(prisma, session, data)}) }
    catch (error) { return json(res, error.status || 500, {error:error.status ? error.message : '送信できませんでした。'}) }
  }
  if (data.action === 'send') {`)
server = once(server,"if (req.method !== 'POST' || (req.headers.origin && ![req.headers.origin, `https://${req.headers.host}`, `http://${req.headers.host}`].includes(req.headers.origin)))", "if (req.method !== 'POST' || !salonSettingsChatV689.sameOrigin(req))")
server = once(server,"  const text = String(form.get('body') || '').trim()\n  const staffKey", "  if (!salonSettingsChatV689.sameOrigin(req)) return json(res, 403, {error:'送信元を確認できません。'})\n  const text = String(form.get('body') || '').trim()\n  const staffKey")
server = once(server,"const target = organizationStaff.find(s => s.key === staffKey) || organizationStaff[0]", "const target = organizationStaff.find(s => s.key === staffKey)")
server = once(server,"  if (!rows[0]) {\n    const target = organizationStaff.find(s => s.key === staffKey)", "  if (threadId && !rows[0]) return json(res, 404, {error:'会話が見つかりません。'})\n  if (!rows[0]) {\n    const target = organizationStaff.find(s => s.key === staffKey)")
server = once(server,'`/u/chat&threadId=${encodeURIComponent(thread.id)}`','`/u/chat?threadId=${encodeURIComponent(thread.id)}`')
const guardStart = server.indexOf("      if (url.pathname === '/admin/settings' && req.method === 'GET') {")
const guardEnd = server.indexOf(' /* backoffice-access-consistency-v379-owner-guard */',guardStart)
if (guardStart < 0 || guardEnd < 0) throw Error('Settings redirect anchor')
server = server.slice(0,guardStart)+'      // v689: non-owner settings render a read-only store page in Next.'+server.slice(guardEnd+' /* backoffice-access-consistency-v379-owner-guard */'.length)
server = once(server,'src="/admin-chat-reply-client-v669.js?v=669-release1"','src="/salon-chat-v689.js"')
server = once(server,"  const stampSettingsRouteV603 = pathname === '/admin/settings'",`  if (adminRoute && !output.includes('salon-settings-chat-v689.css')) output = output.replace('</head>', '<link rel="stylesheet" href="/salon-settings-chat-v689.css"></head>')
  const stampSettingsRouteV603 = pathname === '/admin/settings'`)
server = once(server,"      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Workspace','v688')", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Workspace','v688')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Salon-Settings-Chat','v689')")
write('server.js',server)

let settings = read('.next/server/app/admin/settings/page.js')
settings = once(settings,'let t=await (0,v.Os)(["ADMIN"]);if(!t.organizationId)return null;', 'let t=await (0,v.Os)(["ADMIN","STAFF"]);if(!t.organizationId)return null;if(t.role!=="ADMIN")return s.jsx("div",{className:"mx-auto w-full max-w-6xl",dangerouslySetInnerHTML:{__html:await require("/app/salon-settings-chat-v689.js").readonlySettings(g._,t)}});')
write('.next/server/app/admin/settings/page.js',settings)
let commercial = read('commercial-admin-v101.js')
commercial = once(commercial,"  async function enhanceSettingsPage() {\n", "  async function enhanceSettingsPage() {\n    if (document.querySelector('[data-salon-settings-readonly-v689]')) return\n")
write('commercial-admin-v101.js',commercial)
let line = read('line-settings-client-v436.js')
line = once(line,"  async function enhance() {", "  async function enhance() {\n    if (document.querySelector('[data-salon-settings-readonly-v689]')) return")
write('public/line-settings-client-v689.js',line)
write('ui-workflows-v294.js',once(read('ui-workflows-v294.js'),'/line-settings-client-v436.js?v=436','/line-settings-client-v689.js?v=689'))
// The previous asset is immutable; change its URL rather than overwriting it.
server = server.replaceAll('/line-settings-client-v436.js','/line-settings-client-v689.js')
write('server.js',server)

let page = read('.next/server/app/admin/customers/messages/page.js')
page = once(page,'const inboxUi = require("/app/admin-chat-inbox-v589");','const inboxUi = require("/app/admin-chat-inbox-v589"); const chat689 = require("/app/salon-settings-chat-v689.js");')
page = once(page,'const m = await inboxUi.findSelectedThread(o._, s.organizationId, e);','const actor689 = await chat689.actorFor(o._, s);\n          const m = await inboxUi.findSelectedThread(o._, s.organizationId, e, actor689);')
page = once(page,'let q = !m && e?.customerId ?', 'let q = !m && !e?.threadId && e?.customerId ?')
page = once(page,'{ ...e, ...(m ? { threadId:m.id, customerId:"" } : {}) });','{ ...e, ...(m ? { threadId:m.id, customerId:"" } : {}) }, actor689);')
page = once(page,'method: "post", action: "/api/lien-chat-form", className: "flex items-end', 'method: "post", action: "/api/lien-chat-form", "data-chat-thread": m.id, className: "flex items-end')
const qStart = page.indexOf(' : q ? (0, r.jsxs)(r.Fragment, { children: [')
const qEnd = page.indexOf(' : r.jsx(i.ub, { icon: d, title: "会話を選択してください"',qStart)
if (qStart < 0 || qEnd < 0) throw Error('New chat composer anchor')
page = page.slice(0,qStart)+` : q ? r.jsxs(r.Fragment,{children:[r.jsx("h2",{className:"text-xl font-semibold",children:q.name+"さんへのメッセージ"}),r.jsx("div",{dangerouslySetInnerHTML:{__html:await chat689.composer(o._,actor689,q)}})]})`+page.slice(qEnd)
write('.next/server/app/admin/customers/messages/page.js',page)

let inbox = read('admin-chat-inbox-v589.js')
inbox = once(inbox,'async function loadInbox(db, organizationId, input) {','async function loadInbox(db, organizationId, input, actor) {')
inbox = once(inbox,'  const values = [organizationId, ...where.values]', `  const scope = actor === undefined || require('./salon-settings-chat-v689').privileged(actor) ? null : actor?.chatStaffKeys || []
  where.sql += ' AND ($5::text[] IS NULL OR t."staffKey"=ANY($5::text[]))'
  const values = [organizationId, ...where.values, scope]`)
inbox = once(inbox,'${visible} GROUP BY t."staffKey" ORDER BY "name",t."staffKey"`, organizationId)', '${visible} AND ($2::text[] IS NULL OR t."staffKey"=ANY($2::text[])) GROUP BY t."staffKey" ORDER BY "name",t."staffKey"`, organizationId, scope)')
inbox = once(inbox,'LIMIT $5 OFFSET $6','LIMIT $6 OFFSET $7')
inbox = once(inbox,'async function findSelectedThread(db, organizationId, input) {','async function findSelectedThread(db, organizationId, input, actor) {')
inbox = once(inbox,'  if (!params.threadId && !params.customerId) return null','  if (!params.threadId) return null')
inbox = once(inbox,'  return rows[0] || null', `  const row = rows[0] || null
  return actor === undefined || require('./salon-settings-chat-v689').canAccessThread(actor,row) ? row : null`)
inbox = once(inbox,'loadInbox(prisma,session.organizationId,url.searchParams)', "loadInbox(prisma,session.organizationId,url.searchParams, await require('./salon-settings-chat-v689').actorFor(prisma,session))")
write('admin-chat-inbox-v589.js',inbox)
console.log('v689 runtime patched')
