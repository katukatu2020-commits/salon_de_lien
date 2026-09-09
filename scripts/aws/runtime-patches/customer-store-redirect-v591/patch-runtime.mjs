import fs from 'node:fs'
import path from 'node:path'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const changed = []
function replaceOnce(source, before, after, label) {
  if (source.split(before).length !== 2) throw new Error('v591 unexpected parent: ' + label)
  return source.replace(before, after)
}
function save(file, source) { fs.writeFileSync(path.join(root, file), source); changed.push(file) }

let server = fs.readFileSync(path.join(root, 'server.js'), 'utf8').replace(/\r\n/g, '\n')
const start = server.indexOf('    const users = await prisma.$queryRawUnsafe(`WITH RECURSIVE "MergedCustomer"')
const endMarker = '    return users[0] ? { ...value, customerId: users[0].customerId } : null'
const end = server.indexOf(endMarker, start)
if (start < 0 || end < start || end - start > 2000) throw new Error('v591 customer auth anchor not found')
server = replaceOnce(server, server.slice(start, end + endMarker.length), "    return require('./customer-session-v591.js').resolveCustomerSession(prisma, value)", 'Node customer resolver')
const ready = "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Daily-Sales-Print', 'v590') /* daily-sales-print-v590 */"
server = replaceOnce(server, ready, ready + "\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Customer-Store-Session', 'v591')\n      if (url.pathname.startsWith('/u/')) res.setHeader('Cache-Control', 'private, no-store, max-age=0')", 'customer redirect caching')
save('server.js', server)

const oldModule = `65051:(e,t,r)=>{"use strict";r.d(t,{j:()=>i});var n=r(71615),a=r(13538),o=r(60055);async function i(){let e=await(0,o.ib)(n.cookies().get(o.fh)?.value,(0,o.LD)());if(!e)return null;let[t]=await a._.$queryRawUnsafe(\`SELECT c."id",c."name" FROM "AppUser" u JOIN "Customer" c ON c."id"=$3 AND c."organizationId"=$4 AND c."deletedAt" IS NULL LEFT JOIN "CustomerStoreLink" l ON l."appUserId"=u."id" AND l."organizationId"=c."organizationId" AND l."customerId"=c."id" WHERE u."id"=$1 AND LOWER(COALESCE(NULLIF(u."loginId",''),u."email"))=$2 AND u."role"='CUSTOMER' AND u."active"=TRUE AND ((u."customerId"=c."id" AND u."organizationId"=c."organizationId") OR l."id" IS NOT NULL) LIMIT 1\`,e.userId,e.subject,e.customerId,e.organizationId);return t?{...e,customer:t}:null}}`
const newModule = `65051:(e,t,r)=>{"use strict";r.d(t,{j:()=>i});var n=r(71615),a=r(13538),o=r(60055);async function i(){let e=await(0,o.ib)(n.cookies().get(o.fh)?.value,(0,o.LD)());return require("/app/customer-session-v591.js").resolveCustomerSession(a._,e)}}`
function files(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? files(file) : [file]
  })
}
let modules = 0
for (const file of files(path.join(root, '.next/server')).filter(file => file.endsWith('.js'))) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes('65051:')) continue
  save(path.relative(root, file), replaceOnce(source, oldModule, newModule, file))
  modules++
}
if (modules !== 14) throw new Error('v591 expected 14 Next customer resolvers, got ' + modules)

let links = fs.readFileSync(path.join(root, 'customer-links-v293.js'), 'utf8').replace(/\r\n/g, '\n')
const begin = links.indexOf('  async function availableStores(session) {')
const finish = links.indexOf('  async function stores(req, res, url) {', begin)
if (begin < 0 || finish < begin) throw new Error('v591 store list anchors missing')
let list = links.slice(begin, finish)
if (list.split('c."deletedAt" IS NULL').length !== 5) throw new Error('v591 unexpected store list filters')
list = list.replaceAll('c."deletedAt" IS NULL', 'c."deletedAt" IS NULL AND c."storeHiddenAt" IS NULL')
list = replaceOnce(list, 'c."id"=l."customerId" AND c."deletedAt"', 'c."id"=l."customerId" AND c."organizationId"=l."organizationId" AND c."deletedAt"', 'linked organization match')
list = replaceOnce(list, 'c."id"=u."customerId" AND c."deletedAt"', 'c."id"=u."customerId" AND c."organizationId"=u."organizationId" AND c."deletedAt"', 'canonical organization match')
links = links.slice(0, begin) + list + links.slice(finish)
const signed = '      const signed = signCustomerSession(session, users[0]?.loginId || users[0]?.email, links[0].customerId, organizationId)'
links = replaceOnce(links, signed, `      const selected = await require('./customer-session-v591.js').resolveCustomerSession(prisma, { ...session, customerId: links[0].customerId, organizationId })
      if (!selected) throw new CustomerLinkError('この店舗は現在利用できません。登録済みの店舗を選び直してください。', 409)
      const signed = signCustomerSession(selected, users[0]?.loginId || users[0]?.email, selected.customerId, organizationId)`, 'validate before signing switch')
save('customer-links-v293.js', links)
fs.writeFileSync('/tmp/customer-session-v591-changed.json', JSON.stringify(changed))
console.log(JSON.stringify({ release: 'customer-store-redirect-v591', sharedResolvers: modules + 1, changed }))
