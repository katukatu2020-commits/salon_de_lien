import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const routeService = read('sales-ledger-accounts-v318.js')
const accountService = read('shared-account-service-v553.js')
const server = read('server.js')
const accountRoute = read('.next/server/app/api/auth/account/route.js')
const loginRoute = read('.next/server/app/api/auth/login/route.js')
const accountPage = read('.next/server/app/admin/account/page.js')

assert.match(routeService, /require\('\.\/shared-account-service-v553'\)/)
assert.doesNotMatch(routeService, /require\('\.\/shared-account-service-v552'\)/)
assert.match(accountService, /currentLoginId !== normalizedLoginId/)
assert.match(accountService, /"active"=TRUE/)
assert.match(accountService, /SET "loginId"=NULL/)
assert.match(accountService, /"active"=FALSE/)
assert.match(accountService, /"role"::text IN/)
assert.match(accountService, /ADMIN.*STAFF.*MANUFACTURER/)
assert.doesNotMatch(accountService, /WHERE "id"<>\$2 AND \(LOWER/)
assert.match(accountRoute, /shared-account-available-login-v553/)
assert.match(accountRoute, /active:!0,role:/)
assert.match(accountRoute, /active:!1,role:/)
assert.match(accountRoute, /updateMany/)
assert.match(accountRoute, /data:\{loginId:null\}/)
assert.match(loginRoute, /shared-account-available-login-v553/)
assert.match(loginRoute, /where:\{active:!0,role:/)
assert.match(accountPage, /別の有効な店舗側アカウントで使用されています/)
assert.match(server, /X-Lien-Shared-Account-Identity', 'v553'/)
assert.doesNotMatch(server, /X-Lien-Shared-Account-Identity', 'v552'/)
assert.match(server, /X-Lien-Style-Detail-Navigation', 'v551'/)

console.log(JSON.stringify({
  release: 'shared-account-available-login-v553',
  verified: true,
}))
