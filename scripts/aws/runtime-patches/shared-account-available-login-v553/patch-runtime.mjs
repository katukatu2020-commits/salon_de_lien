import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const patchRoot = path.dirname(fileURLToPath(import.meta.url))
const servicePath = path.join(root, 'sales-ledger-accounts-v318.js')
const serverPath = path.join(root, 'server.js')
const accountRoutePath = path.join(root, '.next/server/app/api/auth/account/route.js')
const loginRoutePath = path.join(root, '.next/server/app/api/auth/login/route.js')
const accountPagePath = path.join(root, '.next/server/app/admin/account/page.js')
const marker = 'shared-account-available-login-v553'

function replaceExactly(source, before, after, label) {
  const count = source.split(before).length - 1
  if (count !== 1) throw new Error(`${label}: expected 1 match, found ${count}`)
  return source.replace(before, after)
}

let service = fs.readFileSync(servicePath, 'utf8')
let server = fs.readFileSync(serverPath, 'utf8')
let accountRoute = fs.readFileSync(accountRoutePath, 'utf8')
let loginRoute = fs.readFileSync(loginRoutePath, 'utf8')
let accountPage = fs.readFileSync(accountPagePath, 'utf8')

if ([service, server, accountRoute, loginRoute, accountPage].some(source => source.includes(marker))) {
  throw new Error(`${marker}: patch already applied`)
}

fs.copyFileSync(
  path.join(patchRoot, 'shared-account-service-v553.js'),
  path.join(root, 'shared-account-service-v553.js'),
)

service = replaceExactly(
  service,
  `const { saveSharedStoreAccount } = require('./shared-account-service-v552') /* shared-account-identity-scope-v552 */`,
  `const { saveSharedStoreAccount } = require('./shared-account-service-v553') /* ${marker} */`,
  'shared account service version',
)
service += `\n/* ${marker} */\n`

const accountUpdateBefore = `if(await f._.appUser.findFirst({where:{id:{not:p.id},role:{in:["ADMIN","STAFF","MANUFACTURER"]},OR:[{loginId:{equals:n,mode:"insensitive"}},{email:{equals:n,mode:"insensitive"}}]},select:{id:!0}}))return h(e,"duplicate");try{await f._.appUser.update({where:{id:p.id},data:{loginId:n,...o?{passwordHash:(0,c.p)(o)}:{}}})}catch{return h(e,"failed")}`
const accountUpdateAfter = `if(await f._.appUser.findFirst({where:{id:{not:p.id},active:!0,role:{in:["ADMIN","STAFF","MANUFACTURER"]},OR:[{loginId:{equals:n,mode:"insensitive"}},{email:{equals:n,mode:"insensitive"}}]},select:{id:!0}}))return h(e,"duplicate");try{await f._.$transaction(async e=>{await e.appUser.updateMany({where:{id:{not:p.id},active:!1,role:{in:["ADMIN","STAFF","MANUFACTURER"]},loginId:{equals:n,mode:"insensitive"}},data:{loginId:null}}),await e.appUser.update({where:{id:p.id},data:{loginId:n,...o?{passwordHash:(0,c.p)(o)}:{}}})})}catch{return h(e,"failed")}`
accountRoute = replaceExactly(accountRoute, accountUpdateBefore, accountUpdateAfter, 'account identifier availability')
accountRoute += `\n/* ${marker} */\n`

const loginLookupBefore = `where:{role:{in:["ADMIN","STAFF","MANUFACTURER"]},OR:[{email:{equals:f,mode:"insensitive"}},{loginId:{equals:f,mode:"insensitive"}}]},select:`
const loginLookupAfter = `where:{active:!0,role:{in:["ADMIN","STAFF","MANUFACTURER"]},OR:[{email:{equals:f,mode:"insensitive"}},{loginId:{equals:f,mode:"insensitive"}}]},select:`
loginRoute = replaceExactly(loginRoute, loginLookupBefore, loginLookupAfter, 'active login lookup')
loginRoute += `\n/* ${marker} */\n`

accountPage = replaceExactly(
  accountPage,
  `duplicate: "そのログインIDはすでに使用されています。"`,
  `duplicate: "そのログインIDは別の有効な店舗側アカウントで使用されています。"`,
  'active duplicate guidance',
)
accountPage += `\n/* ${marker} */\n`

const previousReady = `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shared-Account-Identity', 'v552') /* shared-account-identity-scope-v552 */`
server = replaceExactly(
  server,
  previousReady,
  `      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Shared-Account-Identity', 'v553') /* ${marker} */`,
  'readiness marker',
)
server += `\n/* ${marker} */\n`

fs.writeFileSync(servicePath, service)
fs.writeFileSync(serverPath, server)
fs.writeFileSync(accountRoutePath, accountRoute)
fs.writeFileSync(loginRoutePath, loginRoute)
fs.writeFileSync(accountPagePath, accountPage)

console.log(JSON.stringify({ release: marker, patched: true }))
