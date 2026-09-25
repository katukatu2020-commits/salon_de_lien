import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv.includes('snapshot')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')
const campaigns = fs.readFileSync(path.join(root, 'customer-campaigns-v427.js'), 'utf8')

assert.match(server, /X-Lien-Appointment-Datetime-Editor[^\n]+v663/)
assert.match(campaigns, /storewide-campaigns-v498/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Chat-Campaign-Time/)
  assert.doesNotMatch(server, /chat-campaign-time-v664/)
  assert.doesNotMatch(campaigns, /chat-campaign-time-v664/)
  assert.match(server, /SELECT "id", "displayName", "role" FROM "AppUser"/)
  assert.match(campaigns, /const startsAt = new Date\(input\.startsAt\)/)
  console.log(JSON.stringify({ release: 'chat-campaign-time-v664', snapshotVerified: true }))
  process.exit(0)
}

assert.equal(server.split('/* chat-campaign-time-v664 */').length - 1, 1)
assert.equal(campaigns.split('/* chat-campaign-time-v664 */').length - 1, 1)
assert.match(server, /X-Lien-Chat-Campaign-Time', 'v664'/)
assert.match(server, /"role", "isSharedStoreAccount" FROM "AppUser"/)
assert.match(server, /isSharedStoreAccount: users\[0\]\.isSharedStoreAccount === true/)
assert.match(server, /session\.role === 'ADMIN' \|\| session\.isSharedStoreAccount === true/)
assert.doesNotMatch(server, /if \(session\.role === 'ADMIN'\) return true/)

assert.match(campaigns, /"timeZoneVersion" INTEGER NOT NULL DEFAULT 0/)
assert.match(campaigns, /ADD COLUMN IF NOT EXISTS "timeZoneVersion" INTEGER NOT NULL DEFAULT 0/)
assert.match(campaigns, /"startsAt"="startsAt" - INTERVAL '9 hours'/)
assert.match(campaigns, /WHERE "timeZoneVersion"=0/)
assert.equal(campaigns.split('WHERE "timeZoneVersion"=0').length - 1, 2)
assert.match(campaigns, /"startsAt","endsAt","timeZoneVersion","status"/)
assert.match(campaigns, /\$10,\$11,1,'published'/)
assert.match(campaigns, /function parseJapanDateTime\(value\)/)
assert.match(campaigns, /parseJapanDateTime\(input\.startsAt\)/)
assert.match(campaigns, /"timeZoneVersion"=1,"updatedAt"=CURRENT_TIMESTAMP/)
assert.match(campaigns, /date\.getTime\(\)\+9\*60\*60\*1000/)
assert.doesNotMatch(campaigns, /new Date\(input\.startsAt\)/)
assert.doesNotMatch(campaigns, /date\.getTimezoneOffset\(\)/)

console.log(JSON.stringify({ release: 'chat-campaign-time-v664', runtimeVerified: true }))
