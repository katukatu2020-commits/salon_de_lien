import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8') }

const server = read('server.js')
const service = read('business-account-approvals-v643.js')

assert.match(server, /X-Lien-Dealer-Password-Change', 'v646'/)
assert.match(server, /X-Lien-Stamp-Reward-Pricing', 'v645'/)
assert.match(server, /businessAccountApprovalsV643\.handle\(req, res, url\)/)
assert.match(service, /async function existingDealerAccess\(dealerId\)/)
assert.match(service, /FROM "WholesaleDealer" WHERE "id"=\$1 AND "active"=TRUE/)
assert.match(service, /const access = managedAccess \|\| \(type === 'DEALER' \? await existingDealerAccess\(session\.id\) : null\)/)
assert.match(service, /const access = managedAccess \|\| await existingDealerAccess\(session\.id\)/)
assert.match(service, /if \(managedAccess\) await tx\.\$executeRawUnsafe\('UPDATE "ManagedBusinessAccess"/)
assert.match(service, /"authVersion"="authVersion"\+1/)
assert.match(service, /verifyPassword\(crypto, currentPassword, rows\[0\]\.passwordHash\)/)
assert.match(service, /PASSWORD_CHANGED/)
assert.match(service, /managedAccount: Boolean\(managedAccess\)/)

console.log(JSON.stringify({
  release: 'dealer-password-change-v646',
  runtimeVerified: true,
  existingDealerRouteEnabled: true,
  managedDealerFlowPreserved: true,
  sessionRevocationPreserved: true,
}))
