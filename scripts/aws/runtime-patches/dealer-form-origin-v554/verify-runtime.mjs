import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const service = read('wholesale-ordering-v543.js')
const policy = read('dealer-origin-policy-v554.js')
const server = read('server.js')

assert.match(service, /require\('\.\/dealer-origin-policy-v554'\)/)
assert.match(service, /return validDealerRequestOrigin\(req\)/)
assert.match(service, /dealer-form-origin-v554/)
assert.doesNotMatch(service, /if \(!source\) return false/)
assert.match(policy, /source\.toLowerCase\(\) !== 'null'/)
assert.match(policy, /sec-fetch-site/)
assert.match(policy, /=== 'same-origin'/)
assert.doesNotMatch(policy, /=== 'same-site'/)
assert.match(server, /X-Lien-Dealer-Form-Origin', 'v554'/)
assert.match(server, /X-Lien-Shared-Account-Identity', 'v553'/)
assert.match(server, /X-Lien-Style-Detail-Navigation', 'v551'/)

console.log(JSON.stringify({ release: 'dealer-form-origin-v554', verified: true }))
