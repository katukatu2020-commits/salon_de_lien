import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(`${root}/server.js`, 'utf8')
const service = fs.readFileSync(`${root}/sales-ledger-accounts-v318.js`, 'utf8')
const shared = fs.readFileSync(`${root}/shared-account-service-v549.js`, 'utf8')
const client = fs.readFileSync(`${root}/sales-ledger-client-v318.js`, 'utf8')
const publicSite = fs.readFileSync(`${root}/public-site.js`, 'utf8')

assert.match(server, /X-Lien-Shared-Account-Contact', 'v549'/)
assert.match(server, /X-Lien-Dealer-Auth-Self-Service', 'v548'/)
assert.match(service, /saveSharedStoreAccount/)
assert.doesNotMatch(service, /UPDATE "AppUser" SET "loginId"=\$1,"passwordHash"=\$2,"active"=TRUE/)
assert.match(shared, /shared-account-contact-v549/)
assert.match(shared, /SELECT "name" FROM "Organization" WHERE "id"=\$1 FOR UPDATE/)
assert.match(shared, /if \(currentId\)/)
assert.match(shared, /INSERT INTO "AppUser"/)
assert.match(shared, /LOWER\(COALESCE\("email"/)
assert.match(client, /店舗ログインできます/)
assert.match(client, /shared-account-contact-v549/)
assert.match(publicSite, /SALON_PHONE_DISPLAY = '070-9444-6007'/)
assert.match(publicSite, /SALON_PHONE_URI = 'tel:\+817094446007'/)
assert.doesNotMatch(publicSite, /086-232-6007|\+81862326007/)

console.log(JSON.stringify({ release: 'shared-account-contact-v549', verified: true }))
