'use strict'

const fs = require('fs')
const path = require('path')

const appRoot = process.env.APP_ROOT || '/app'
const nextRoot = path.join(appRoot, '.next')
const serverPath = path.join(appRoot, 'server.js')

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source
  const count = source.split(search).length - 1
  if (count !== 1) throw new Error(`${label}: expected exactly one anchor, found ${count}`)
  return source.replace(search, replacement)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceOnce(
  server,
  ']\n\nfunction cookies(req) {',
  `]\n\nasync function staffForOrganization(organizationId) {\n  if (organizationId === 'org_salon_de_lien') return staff\n  const rows = await prisma.$queryRawUnsafe('SELECT "staffKey","staffName" FROM "StaffBookingSetting" WHERE "organizationId"=$1 ORDER BY "createdAt","staffName"', organizationId)\n  return rows.map(row => ({ key: row.staffKey, name: row.staffName }))\n}\n\nfunction cookies(req) {`,
  'tenant staff directory',
)
server = replaceOnce(
  server,
  "function canAccessThread(session, thread) {\n  if (session.role === 'ADMIN') return true\n  const selected = staff.find(s => s.key === thread.staffKey)\n  return selected && [selected.name, selected.name.replace(/\\s/g, '')].includes(String(session.displayName || '').replace(/\\s/g, ''))\n}",
  "function canAccessThread(session, thread) {\n  if (session.role === 'ADMIN') return true\n  const accountName = String(session.displayName || '').replace(/\\s/g, '')\n  const staffName = String(thread.staffName || '').replace(/\\s/g, '')\n  return Boolean(accountName && staffName && (accountName === staffName || accountName.includes(staffName) || staffName.includes(accountName)))\n}",
  'tenant chat access',
)
server = replaceOnce(
  server,
  "async function chatApi(req, res, url) {\n  const audience = url.searchParams.get('audience') === 'staff' ? 'staff' : 'customer'\n  const session = await chatSession(req, audience)\n  if (!session)",
  "async function chatApi(req, res, url) {\n  const audience = url.searchParams.get('audience') === 'staff' ? 'staff' : 'customer'\n  const session = await chatSession(req, audience)\n  const organizationStaff = session ? await staffForOrganization(session.organizationId) : []\n  if (!session)",
  'tenant chat staff loading',
)
server = replaceOnce(server, '    return json(res, 200, { threads, thread: thread || null, messages, staff })', '    return json(res, 200, { threads, thread: thread || null, messages, staff: organizationStaff })', 'tenant chat staff response')
server = replaceOnce(server, "    const target = staff.find(s => s.key === data.staffKey); const text = String(data.body || '').trim()", "    const target = organizationStaff.find(s => s.key === data.staffKey); const text = String(data.body || '').trim()", 'tenant chat create staff')
server = replaceOnce(
  server,
  "  if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }\n  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }\n  const form = new URLSearchParams(raw)",
  "  if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }\n  const organizationStaff = await staffForOrganization(session.organizationId)\n  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }\n  const form = new URLSearchParams(raw)",
  'tenant staff chat form load',
)
server = replaceOnce(server, "      const matchedStaff = staff.find(s => String(session.displayName || '').replace(/\\s/g, '').includes(s.name.replace(/\\s/g, ''))) || staff[0]", "      const matchedStaff = organizationStaff.find(s => String(session.displayName || '').replace(/\\s/g, '').includes(s.name.replace(/\\s/g, ''))) || organizationStaff[0]\n      if (!matchedStaff) throw Error('スタッフが登録されていません。')", 'tenant staff chat form match')
server = replaceOnce(
  server,
  "  if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); return res.end() }\n  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }",
  "  if (!session) { res.statusCode = 302; res.setHeader('Location', '/u/login'); return res.end() }\n  const organizationStaff = await staffForOrganization(session.organizationId)\n  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 20000) throw Error('too_large') }",
  'tenant customer chat staff load',
)
server = replaceOnce(server, "    const target = staff.find(s => s.key === staffKey) || staff[0]", "    const target = organizationStaff.find(s => s.key === staffKey) || organizationStaff[0]\n    if (!target) { res.statusCode = 303; res.setHeader('Location', '/u/chat?error=staff-required'); return res.end() }", 'tenant customer chat staff match')
server = replaceOnce(
  server,
  "const { createBillingService } = require('./billing') /* stripe-subscription-billing-v52 */",
  "const { createBillingService } = require('./billing') /* stripe-subscription-billing-v52 */\nconst { createTenantSetupService } = require('./tenant-setup') /* tenant-bootstrap-v70 */",
  'tenant setup import',
)
server = replaceOnce(
  server,
  "const app = next({ dev: false, dir, conf: nextConfig })",
  "const tenantSetup = createTenantSetupService({\n  prisma,\n  sessionProvider: req => chatSession(req, 'staff'),\n  customerSessionProvider: req => chatSession(req, 'customer'),\n  crypto,\n}) /* tenant-bootstrap-v70-service */\n\nconst app = next({ dev: false, dir, conf: nextConfig })",
  'tenant setup service',
)
server = replaceOnce(
  server,
  "  await billing.ensureSchema() /* stripe-subscription-billing-v52-schema */",
  "  await billing.ensureSchema() /* stripe-subscription-billing-v52-schema */\n  await tenantSetup.ensureSchema() /* tenant-bootstrap-v70-schema */",
  'tenant setup schema',
)
server = replaceOnce(
  server,
  "      if (await billing.handle(req, res, url)) return /* stripe-subscription-billing-v52-route */\n      if (await billing.enforceAccess(req, res, url)) return /* stripe-subscription-billing-v52-access */",
  "      if (await billing.handle(req, res, url)) return /* stripe-subscription-billing-v52-route */\n      if (await tenantSetup.handle(req, res, url)) return /* tenant-bootstrap-v70-route */\n      if (await billing.enforceAccess(req, res, url)) return /* stripe-subscription-billing-v52-access */",
  'tenant setup routes',
)
server = replaceOnce(
  server,
  "      if (url.pathname === '/u/appointments') return handle(req, res)\n      if (url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return handle(req, res)",
  "      if (url.pathname === '/u/appointments') return handle(req, res)\n      const acceptsAdminHtml = String(req.headers.accept || '').includes('text/html')\n      if (req.method === 'GET' && acceptsAdminHtml && url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return tenantSetup.renderNext(req, res, url, handle) /* tenant-bootstrap-v93-ui-lifecycle */\n      if (url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/admin/login')) return handle(req, res)",
  'tenant setup page injection',
)
server = replaceOnce(
  server,
  "    if (process.env.SMS_COMPLIANCE_DISABLE_POLLER !== 'true') {",
  "    tenantSetup.startPolling() /* tenant-bootstrap-v70-poller */\n    if (process.env.SMS_COMPLIANCE_DISABLE_POLLER !== 'true') {",
  'tenant Gmail poller',
)
fs.writeFileSync(serverPath, server)

const chunkRoots = [path.join(nextRoot, 'server', 'chunks'), path.join(appRoot, 'server', 'chunks')].filter(fs.existsSync)
const chunkFiles = [...new Set(chunkRoots.flatMap(root => fs.readdirSync(root).filter(name => name.endsWith('.js')).map(name => path.join(root, name))))]
let menuBundles = 0
for (const file of chunkFiles) {
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('"SalonMenu"') || !source.includes("'kanzashi'")) continue
  const functionStart = source.indexOf('      async function G(e){')
  const functionEnd = functionStart >= 0 ? source.indexOf('      async function H(e){', functionStart) : -1
  if (functionStart < 0 || functionEnd < 0) continue
  const original = source.slice(functionStart, functionEnd)
  if (!original.includes('INSERT INTO "SalonMenu"') || !original.includes('W.length')) continue
  const replacement = '      async function G(e){\n        await O();\n        if("org_salon_de_lien"===e){for(let t=0;t<W.length;t++){let [r,n,a,o]=W[t];await u._.$executeRawUnsafe(`INSERT INTO "SalonMenu" ("id","organizationId","name","category","durationMinutes","priceYen","source","sourceKey","sortOrder") VALUES ($1,$2,$3,$4,$5,$6,\'kanzashi\',$7,$8) ON CONFLICT ("organizationId","name") DO NOTHING`,`menu-${e}-${t}`,e,r,n,a,o,r,t)}}\n        return "org_salon_de_lien"===e?u._.$queryRawUnsafe(`SELECT * FROM "SalonMenu" WHERE "organizationId"=$1 ORDER BY "active" DESC,"sortOrder","name"`,e):u._.$queryRawUnsafe(`SELECT * FROM "SalonMenu" WHERE "organizationId"=$1 AND "source"<>\'kanzashi\' ORDER BY "active" DESC,"sortOrder","name"`,e);\n      }'
  source = source.replace(original, replacement)
  fs.writeFileSync(file, source)
  menuBundles += 1
}
if (!menuBundles) {
  const diagnostics = chunkFiles.flatMap(file => {
    const source = fs.readFileSync(file, 'utf8')
    const index = source.indexOf('SalonMenu')
    return index < 0 ? [] : [{ file, excerpt: source.slice(Math.max(0, index - 600), index + 1200) }]
  })
  console.error('SalonMenu diagnostics', JSON.stringify(diagnostics.slice(0, 5)))
  throw new Error('SalonMenu tenant seed bundle was not found')
}

const adminAppointmentPages = [
  path.join(nextRoot, 'server', 'app', 'admin', 'appointments', 'page.js'),
  path.join(appRoot, 'server', 'app', 'admin', 'appointments', 'page.js'),
].filter(fs.existsSync)
let adminPagesPatched = 0
for (const file of [...new Set(adminAppointmentPages)]) {
  let source = fs.readFileSync(file, 'utf8')
  const pattern = /G = \[\.\.\.w\.zj, w\.jb\]\.map\(\(e\) => \{[\s\S]*?\n            \}\);/
  const match = source.match(pattern)
  if (!match) continue
  const legacyExpression = match[0].replace(/^G = /, '').replace(/;$/, '')
  const replacement = `G = x.organizationId === "org_salon_de_lien"\n              ? ${legacyExpression}\n              : _.map((e) => ({\n                  key: e.staffKey,\n                  name: e.staffName,\n                  role: "スタイリスト",\n                  maxConcurrentAppointments: e.maxConcurrentAppointments,\n                  workStartMinutes: e.workStartMinutes,\n                  workEndMinutes: e.workEndMinutes,\n                }));`
  source = source.replace(pattern, replacement)
  fs.writeFileSync(file, source)
  adminPagesPatched += 1
}
if (!adminPagesPatched) throw new Error('Admin appointment staff bundle was not found')

const customerAppointmentPages = [
  path.join(nextRoot, 'server', 'app', 'u', '(account)', 'appointments', 'page.js'),
  path.join(appRoot, 'server', 'app', 'u', '(account)', 'appointments', 'page.js'),
].filter(fs.existsSync)
let customerPagesPatched = 0
for (const file of [...new Set(customerAppointmentPages)]) {
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('CustomerBookingCalendar') || !source.includes('staff:l.zj.map')) continue
  source = replaceOnce(source, 'function j({currentDate:e,defaultStaffKey:t,staff:r,upcoming:j})', 'function j({currentDate:e,defaultStaffKey:t,staff:r,menus:H,upcoming:j})', 'customer booking component props')
  source = replaceOnce(source, '[_,P]=(0,m.useState)("cut")', '[_,P]=(0,m.useState)(Array.isArray(H)?H[0]?.key??"":"cut")', 'customer dynamic initial menu')
  source = replaceOnce(source, 'let B=p.find(e=>e.key===_)', 'let menuCatalog=Array.isArray(H)?H:p,B=menuCatalog.find(e=>e.key===_)??menuCatalog[0]??{key:"",name:"メニュー未登録",durationMinutes:0,estimatedPrice:0}', 'customer dynamic menu catalog')
  source = replaceOnce(source, 'children:p.map(e=>', 'children:menuCatalog.map(e=>', 'customer dynamic menu select')
  source = replaceOnce(source, 'let profileRows=await d._.$queryRawUnsafe', 'let tenantStaffRows=await d._.$queryRawUnsafe(\'SELECT "staffKey","staffName" FROM "StaffBookingSetting" WHERE "organizationId"=$1 ORDER BY "createdAt","staffName"\',e.organizationId),menuRows=await d._.$queryRawUnsafe(\'SELECT "id","name","durationMinutes","priceYen" FROM "SalonMenu" WHERE "organizationId"=$1 AND "active"=true AND ($2::boolean OR "source"<>\\\'kanzashi\\\') ORDER BY "sortOrder","name"\',e.organizationId,e.organizationId==="org_salon_de_lien");let profileRows=await d._.$queryRawUnsafe', 'customer tenant catalogs')
  source = replaceOnce(source, 'staff:l.zj.map(({key:e,name:t,role:r})=>({key:e,name:t,role:r,introduction:introByName.get(t.replace(/\\s/g,""))||""})),upcoming:', 'staff:(e.organizationId==="org_salon_de_lien"?l.zj:tenantStaffRows.map(e=>({key:e.staffKey,name:e.staffName,role:"スタイリスト"}))).map(({key:e,name:t,role:r})=>({key:e,name:t,role:r,introduction:introByName.get(t.replace(/\\s/g,""))||""})),menus:menuRows.map(e=>({key:e.id,name:e.name,durationMinutes:Number(e.durationMinutes),estimatedPrice:Number(e.priceYen)})),upcoming:', 'customer tenant props')
  fs.writeFileSync(file, source)
  customerPagesPatched += 1
}
if (!customerPagesPatched) throw new Error('Customer appointment catalog bundle was not found')

const staticRoot = path.join(nextRoot, 'static', 'chunks', 'app', 'u')
let customerClientBundles = 0
function walk(root) {
  if (!fs.existsSync(root)) return []
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(root, entry.name)) : [path.join(root, entry.name)])
}
for (const file of walk(staticRoot).filter(file => file.endsWith('.js'))) {
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('CustomerBookingCalendar') || !source.includes('defaultStaffKey') || !source.includes('cut-color')) continue
  source = replaceOnce(source, 'staff:w,upcoming:v}=e', 'staff:w,menus:tsMenus,upcoming:v}=e', 'customer client menu props')
  source = replaceOnce(source, '[P,E]=(0,u.useState)("cut")', '[P,E]=(0,u.useState)(Array.isArray(tsMenus)?tsMenus[0]?.key??"":"cut")', 'customer client initial menu')
  source = replaceOnce(source, 'K=x.find(e=>e.key===P)', 'tsMenuCatalog=Array.isArray(tsMenus)?tsMenus:x,K=tsMenuCatalog.find(e=>e.key===P)??tsMenuCatalog[0]??{key:"",name:"メニュー未登録",durationMinutes:0,estimatedPrice:0}', 'customer client menu catalog')
  source = replaceOnce(source, 'children:x.map(e=>', 'children:tsMenuCatalog.map(e=>', 'customer client menu select')
  fs.writeFileSync(file, source)
  customerClientBundles += 1
}
if (!customerClientBundles) throw new Error('Customer appointment client bundle was not found')

console.log(JSON.stringify({ menuBundles, adminPagesPatched, customerPagesPatched, customerClientBundles }))
