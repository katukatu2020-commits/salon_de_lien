import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const service = read('wholesale-ordering-v543.js')
const content = read('dealer-auth-mail-content-v556.js')
const sender = read('dealer-auth-postmark-v555.js')
const server = read('server.js')

assert.match(service, /require\('\.\/dealer-auth-mail-content-v556'\)/)
assert.match(service, /htmlBody: dealerAuthMailHtml\(input\)/)
assert.match(service, /dealer-auth-postmark-html-v556/)
assert.match(content, /function dealerAuthMailHtml\(input\)/)
assert.match(content, /ORIMIA PARTNER NETWORK/)
assert.match(sender, /support@salon-de-lien\.com/)
assert.match(sender, /https:\/\/api\.postmarkapp\.com\/email/)
assert.doesNotMatch(service + sender + content, /GMAIL_OAUTH|GMAIL_RESERVATION_EMAIL|gmail\.googleapis\.com/)
assert.match(server, /X-Lien-Dealer-Auth-Mail-Content', 'v556'/)
assert.match(server, /X-Lien-Dealer-Auth-Mail', 'v555'/)
assert.match(server, /X-Lien-Dealer-Form-Origin', 'v554'/)

console.log(JSON.stringify({ release: 'dealer-auth-postmark-html-v556', verified: true }))
