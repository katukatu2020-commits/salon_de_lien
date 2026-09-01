import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const serverPath = path.join(root, 'server.js')
const customerLinksPath = path.join(root, 'customer-links-v293.js')
const appointmentPath = path.join(root, 'appointment-operations-v267.js')
const chunksPath = path.join(root, '.next', 'server', 'chunks')

function replaceExact(source, before, after, expected, label) {
  const count = source.split(before).length - 1
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}`)
  return source.split(before).join(after)
}

function replaceBetween(source, start, end, replacement, label) {
  const startIndex = source.indexOf(start)
  if (startIndex < 0) throw new Error(`${label}: start marker was not found`)
  const endIndex = source.indexOf(end, startIndex + start.length)
  if (endIndex < 0) throw new Error(`${label}: end marker was not found`)
  if (source.indexOf(start, startIndex + start.length) >= 0) throw new Error(`${label}: start marker was not unique`)
  return source.slice(0, startIndex) + replacement + source.slice(endIndex)
}

let server = fs.readFileSync(serverPath, 'utf8')
server = replaceExact(
  server,
  `const customerGlobalProfile = require('./customer-global-profile-v512') /* customer-global-profile-v512 */`,
  `const customerGlobalProfile = require('./customer-global-profile-v513') /* customer-global-profile-v513 */`,
  1,
  'extended global profile service import',
)
server = replaceExact(
  server,
  `  const customerGlobalProfileReconciliationV512 = await customerGlobalProfile.reconcileAll(prisma)
  console.log('[customer-global-profile-v512] reconciled', customerGlobalProfileReconciliationV512)`,
  `  const customerGlobalProfileReconciliationV513 = await customerGlobalProfile.reconcileAll(prisma)
  console.log('[customer-global-profile-v513] reconciled', customerGlobalProfileReconciliationV513)`,
  1,
  'extended startup reconciliation',
)
server = replaceExact(
  server,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Global-Profile', 'v512')`,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Global-Profile', 'v512')
      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Global-Profile-Extended', 'v513')`,
  1,
  'extended readiness marker',
)
server = replaceBetween(
  server,
  `async function customerRealName(req, res) {`,
  `async function customerHomePage(res, session) {`,
  `async function customerRealName(req, res) {
  const session = await chatSession(req, 'staff')
  if (!session) { res.statusCode = 302; res.setHeader('Location', '/admin/login'); return res.end() }
  await ensureLienEnhancementTables()
  let raw = ''; for await (const chunk of req) raw += chunk
  const form = new URLSearchParams(raw), customerId = String(form.get('customerId') || ''), realName = String(form.get('realName') || '').trim().slice(0, 100)
  const found = await prisma.$queryRawUnsafe('SELECT "id" FROM "Customer" WHERE "id"=$1 AND "organizationId"=$2 AND "deletedAt" IS NULL LIMIT 1', customerId, session.organizationId)
  if (!found[0] || !realName) { res.statusCode = 303; res.setHeader('Location', \`/admin/customers/\${encodeURIComponent(customerId)}?realName=invalid\`); return res.end() }
  await prisma.$transaction(tx => customerGlobalProfile.syncRealNameFromCustomer(tx, customerId, realName, session.userId))
  res.statusCode = 303; res.setHeader('Location', \`/admin/customers/\${encodeURIComponent(customerId)}?realName=saved\`); res.end()
}

`,
  'real name global synchronization',
)
fs.writeFileSync(serverPath, server)

let customerLinks = fs.readFileSync(customerLinksPath, 'utf8')
customerLinks = replaceExact(
  customerLinks,
  `const customerGlobalProfile = require('./customer-global-profile-v512')`,
  `const customerGlobalProfile = require('./customer-global-profile-v513')`,
  1,
  'customer link extended global profile import',
)
fs.writeFileSync(customerLinksPath, customerLinks)

let appointment = fs.readFileSync(appointmentPath, 'utf8')
appointment = replaceExact(
  appointment,
  `const customerGlobalProfile = require('./customer-global-profile-v512')`,
  `const customerGlobalProfile = require('./customer-global-profile-v513')`,
  1,
  'appointment extended global profile import',
)
fs.writeFileSync(appointmentPath, appointment)

let patchedChunk = null
for (const entry of fs.readdirSync(chunksPath, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.js')) continue
  const file = path.join(chunksPath, entry.name)
  let source = fs.readFileSync(file, 'utf8')
  if (!source.includes('customer-global-profile-v512') || !source.includes('updateCustomer:()=>Y')) continue

  source = replaceExact(
    source,
    `/app/customer-global-profile-v512.js`,
    `/app/customer-global-profile-v513.js`,
    3,
    'compiled identity module upgrade',
  )
  source = replaceBetween(
    source,
    `async function ea(e,t){`,
    `async function er(e,t){`,
    `async function ea(e,t){await (0,P.zH)(e);let a={preferredLength:(0,w.PB)(t,"preferredLength"),preferredStyle:(0,w.PB)(t,"preferredStyle"),dislikes:(0,w.PB)(t,"dislikes"),colorPreference:(0,w.PB)(t,"colorPreference"),maintenanceLevel:(0,w.PB)(t,"maintenanceLevel"),referenceNotes:(0,w.PB)(t,"referenceNotes")};await c._.$transaction(t=>require("/app/customer-global-profile-v513.js").syncPreferenceFromCustomer(t,e,a)),(0,s.revalidatePath)(\`/admin/customers/\${e}\`),(0,s.revalidatePath)("/admin/customers")}\n`,
    'compiled customer preference action',
  )
  source += '\n/* customer-global-profile-v513 */\n'
  fs.writeFileSync(file, source)
  patchedChunk = entry.name
}

if (!patchedChunk) throw new Error('customer profile action chunk was not upgraded to v513')

console.log(JSON.stringify({ release: 'customer-global-profile-v513', patchedChunk }))
