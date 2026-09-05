import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const servicePath = path.join(root, 'sales-ledger-accounts-v318.js')
const clientPath = path.join(root, 'sales-ledger-client-v318.js')
const publicSitePath = path.join(root, 'public-site.js')
const serverPath = path.join(root, 'server.js')
const marker = 'shared-account-contact-v549'

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let service = fs.readFileSync(servicePath, 'utf8')
let client = fs.readFileSync(clientPath, 'utf8')
let publicSite = fs.readFileSync(publicSitePath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')

if ([service, client, publicSite, server].some(source => source.includes(marker))) {
  throw new Error(`${marker}: patch already applied`)
}

fs.copyFileSync(path.join(patchRoot, 'shared-account-service-v549.js'), path.join(root, 'shared-account-service-v549.js'))

service = replaceExactly(
  service,
  `'use strict'`,
  `'use strict'\n\nconst { saveSharedStoreAccount } = require('./shared-account-service-v549') /* ${marker} */`,
  'shared account service import',
)

const legacySave = `    const duplicate = await prisma.$queryRawUnsafe('SELECT "id" FROM "AppUser" WHERE LOWER(COALESCE("loginId",\\'\\'))=$1 AND NOT ("organizationId"=$2 AND "isSharedStoreAccount"=TRUE) LIMIT 1', loginId, session.organizationId)
    if (duplicate[0]) return json(res, 409, { error: 'このログインIDは使用されています。' })
    const salt = crypto.randomBytes(16).toString('hex')
    const hash = \`scrypt$\${salt}$\${crypto.scryptSync(password, salt, 64).toString('hex')}\`
    await prisma.$executeRawUnsafe('UPDATE "AppUser" SET "loginId"=$1,"passwordHash"=$2,"active"=TRUE,"updatedAt"=NOW() WHERE "organizationId"=$3 AND "isSharedStoreAccount"=TRUE', loginId, hash, session.organizationId)
    json(res, 200, { ok: true, loginId })`
const reliableSave = `    const saved = await saveSharedStoreAccount({ prisma, crypto, organizationId: session.organizationId, loginId, password })
    json(res, 200, saved)`
service = replaceExactly(service, legacySave, reliableSave, 'shared account save implementation')
service += `\n/* ${marker} */\n`

client = replaceExactly(
  client,
  `  const VERSION = 'sales-ledger-staff-multiselect-v542'`,
  `  const VERSION = '${marker}'`,
  'shared account client version',
)
client = replaceExactly(
  client,
  `          await request('/api/admin/shared-store-account', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(data) })
          feedback.textContent = '店舗共通アカウントを保存しました。'`,
  `          const saved = await request('/api/admin/shared-store-account', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(data) })
          feedback.textContent = \`店舗共通アカウントを\${saved.created ? '設定' : '更新'}しました。ログインID「\${saved.loginId}」で店舗ログインできます。\``,
  'shared account success feedback',
)
client += `\n/* ${marker} */\n`

publicSite = replaceExactly(
  publicSite,
  `const SALON_PHONE_DISPLAY = '086-232-6007'\nconst SALON_PHONE_URI = 'tel:+81862326007'`,
  `const SALON_PHONE_DISPLAY = '070-9444-6007'\nconst SALON_PHONE_URI = 'tel:+817094446007'`,
  'public contact phone',
)
publicSite += `\n/* ${marker} */\n`

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Dealer-Auth-Self-Service', 'v548') /* dealer-auth-self-service-v548 */`
server = replaceExactly(
  server,
  previousReady,
  `${previousReady}\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shared-Account-Contact', 'v549') /* ${marker} */`,
  'readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(servicePath, service)
fs.writeFileSync(clientPath, client)
fs.writeFileSync(publicSitePath, publicSite)
fs.writeFileSync(serverPath, server)

console.log(JSON.stringify({ release: marker, patched: true }))
