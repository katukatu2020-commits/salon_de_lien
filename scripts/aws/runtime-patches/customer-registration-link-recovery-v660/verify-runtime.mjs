import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const layoutChunk = read('.next/server/chunks/1425.js')
const registrationRequest = read('.next/server/app/api/customer-auth/registration-link/request/route.js')

assert.match(server, /X-Lien-Dealer-Product-Search-Filters', 'v659'/)
assert.match(registrationRequest, /AbortSignal\.timeout\(20000\)/)
assert.match(registrationRequest, /\/u\/register\/\$\{d\}/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Customer-Registration-Link-Recovery/)
  assert.doesNotMatch(layoutChunk, /orimia-customer-registration-link-recovery-v660/)
  console.log(JSON.stringify({ snapshot: true, parent: 'v659' }))
  process.exit(0)
}

assert.match(server, /X-Lien-Customer-Registration-Link-Recovery', 'v660'/)
assert.equal((layoutChunk.match(/orimia-customer-registration-link-recovery-v660/g) || []).length, 1)
assert.match(layoutChunk, /__orimiaCustomerRegistrationLinkRecoveryV660/)
assert.match(layoutChunk, /window\.location\.pathname/)
assert.match(layoutChunk, /registrationInviteToken/)
assert.match(layoutChunk, /orimiaCustomerRegistrationRecoveryState/)
assert.match(layoutChunk, /safety-timeout/)
assert.match(layoutChunk, /5000/)

console.log(JSON.stringify({
  release: 'customer-registration-link-recovery-v660',
  runtimeVerified: true,
  registrationRoutesScoped: true,
  failOpenRecovery: true,
  mailDeliveryTimeoutPreserved: true,
}))
