import assert from 'node:assert/strict'
import fs from 'node:fs'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const server = fs.readFileSync(`${root}/server.js`, 'utf8')
const service = fs.readFileSync(`${root}/wholesale-ordering-v543.js`, 'utf8')
const styles = fs.readFileSync(`${root}/wholesale-ordering-v543.css`, 'utf8')
const client = fs.readFileSync(`${root}/wholesale-ordering-client-v543.js`, 'utf8')

assert.match(server, /X-Lien-Dealer-Auth-Self-Service', 'v548'/)
assert.match(server, /dealer-auth-self-service-v548/)
assert.match(server, /X-Lien-Customer-Chat-Send-Only', 'v547'/)
assert.match(service, /dealer-auth-self-service-v548/)
assert.match(service, /pathname === '\/dealer\/register'/)
assert.match(service, /pathname === '\/dealer\/password-reset'/)
assert.match(service, /api\/dealer\/auth\/register\/request/)
assert.match(service, /api\/dealer\/auth\/register\/confirm/)
assert.match(service, /api\/dealer\/auth\/password-reset\/request/)
assert.match(service, /api\/dealer\/auth\/password-reset\/confirm/)
assert.match(service, /WholesaleDealerRegistration/)
assert.match(service, /WholesaleDealerPasswordReset/)
assert.match(service, /wholesale-ordering-v543\.css\?v=548/)
assert.match(styles, /dealer-auth-self-service-v548/)
assert.match(styles, /\.wo-auth-symbol/)
assert.match(client, /dealer-auth-self-service-v548/)
assert.match(client, /name="email" type="email" required/)

console.log(JSON.stringify({ release: 'dealer-auth-self-service-v548', verified: true }))
