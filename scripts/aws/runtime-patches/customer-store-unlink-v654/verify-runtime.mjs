import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv[2] === 'snapshot'
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('server.js')
const links = read('customer-links-v293.js')
const client = read('customer-link-ui-v293.js')
const customerRuntime = read('customer-runtime-v267.js')
const commercialAdmin = read('commercial-admin-v101.js')

assert.match(server, /X-Lien-Dealer-Password-Common-Layout', 'v653'/)
assert.match(server, /X-Lien-Customer-Store-Limit', 'v642'/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Customer-Store-Unlink/)
  assert.doesNotMatch(links, /customerStoreMembershipV654/)
  assert.doesNotMatch(client, /finalStoreNote/)
  assert.match(customerRuntime, /customer-link-ui-v293\.js\?v=642-store-limit1/)
  console.log(JSON.stringify({ snapshot: true, parent: 'v653' }))
  process.exit(0)
}

const membership = read('customer-store-unlink-v654.js')
assert.match(server, /X-Lien-Customer-Store-Unlink', 'v654'/)
assert.match(server, /customerLinks\.guardStoreSelection\(req, res, url\)/)
assert.ok(server.indexOf('customerLinks.guardStoreSelection') < server.indexOf("url.pathname === '/favicon.ico'"), 'store guard must run before page routes')
assert.match(links, /require\('\.\/customer-store-unlink-v654\.js'\)/)
assert.match(links, /customerStoreMembershipV654\.promoteLinkedStore/)
assert.match(links, /storeSelectionRequired: result\.storeSelectionRequired/)
assert.match(links, /data-last-store=/)
assert.doesNotMatch(links, /LAST_STORE_REQUIRED/)
assert.doesNotMatch(links, /最後の1店舗は解除できません/)
assert.match(links, /return \{ ensureSchema, handle, guardStoreSelection, customerPublicCode, membershipMarkup \}/)
assert.match(client, /const finalStoreNote = button\.dataset\.lastStore === 'true'/)
assert.match(client, /if \(result\.redirect\) location\.assign\(result\.redirect\)/)
assert.match(client, /if \(saved\.redirect\) location\.assign\(saved\.redirect\)/)
assert.match(customerRuntime, /customer-link-ui-v293\.js\?v=654-store-unlink1/)
assert.match(commercialAdmin, /customer-link-ui-v293\.js\?v=654-store-unlink1/)
assert.match(membership, /async function unlinkStore/)
assert.match(membership, /storeSelectionRequired: usable\.length === 0/)
assert.match(membership, /async function promoteLinkedStore/)
assert.match(membership, /async function sessionStoreIsExcluded/)

console.log(JSON.stringify({ verified: true, release: 'customer-store-unlink-v654' }))
