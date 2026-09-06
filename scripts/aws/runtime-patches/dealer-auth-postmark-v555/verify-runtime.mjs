import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const service = read('wholesale-ordering-v543.js')
const sender = read('dealer-auth-postmark-v555.js')
const server = read('server.js')

assert.match(service, /require\('\.\/dealer-auth-postmark-v555'\)/)
assert.match(service, /sendDealerAuthPostmark\(/)
assert.match(service, /provider: 'postmark'/)
assert.match(service, /dealer-auth-postmark-v555/)
assert.doesNotMatch(service, /GMAIL_OAUTH|GMAIL_RESERVATION_EMAIL|DEALER_GMAIL|gmail\.googleapis\.com|provider: 'gmail'/)
assert.match(sender, /support@salon-de-lien\.com/)
assert.match(sender, /POSTMARK_SERVER_TOKEN/)
assert.match(sender, /POSTMARK_FROM_NAME/)
assert.match(sender, /POSTMARK_REPLY_TO/)
assert.match(sender, /POSTMARK_TRANSACTIONAL_STREAM/)
assert.match(sender, /https:\/\/api\.postmarkapp\.com\/email/)
assert.doesNotMatch(sender, /GMAIL_|gmail\.googleapis\.com/)
assert.match(server, /X-Lien-Dealer-Auth-Mail', 'v555'/)
assert.match(server, /X-Lien-Dealer-Form-Origin', 'v554'/)
assert.match(server, /X-Lien-Shared-Account-Identity', 'v553'/)

console.log(JSON.stringify({ release: 'dealer-auth-postmark-v555', verified: true }))
