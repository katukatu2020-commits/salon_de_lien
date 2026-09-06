import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const routeService = read('sales-ledger-accounts-v318.js')
const accountService = read('shared-account-service-v552.js')
const server = read('server.js')

assert.match(routeService, /require\('\.\/shared-account-service-v552'\)/)
assert.doesNotMatch(routeService, /require\('\.\/shared-account-service-v549'\)/)
assert.match(accountService, /currentLoginId !== normalizedLoginId/)
assert.match(accountService, /"role"::text IN/)
assert.match(accountService, /ADMIN.*STAFF.*MANUFACTURER/)
assert.doesNotMatch(accountService, /WHERE "id"<>\$2 AND \(LOWER/)
assert.match(server, /X-Lien-Shared-Account-Identity', 'v552'/)
assert.match(server, /X-Lien-Style-Detail-Navigation', 'v551'/)

console.log(JSON.stringify({
  release: 'shared-account-identity-scope-v552',
  verified: true,
}))
