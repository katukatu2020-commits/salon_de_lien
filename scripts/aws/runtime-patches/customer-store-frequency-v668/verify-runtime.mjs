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

assert.match(server, /X-Lien-Style-Order-Focus-Stability', 'v667'/)
assert.match(server, /X-Lien-Customer-Store-Unlink', 'v654'/)

if (snapshot) {
  assert.doesNotMatch(server, /X-Lien-Customer-Store-Frequency/)
  assert.match(links, /customerStoreMembershipV654/)
  assert.match(links, /MAX_STORES/)
  assert.match(client, /initialCount >= limit/)
  assert.match(customerRuntime, /customer-link-ui-v293\.js\?v=654-store-unlink1/)
  console.log(JSON.stringify({ release: 'customer-store-frequency-v668', snapshotVerified: true, parent: 'v667' }))
  process.exit(0)
}

const membership = read('customer-store-frequency-v668.js')
assert.match(server, /X-Lien-Customer-Store-Frequency', 'v668'/)
assert.match(links, /require\('\.\/customer-store-frequency-v668\.js'\)/)
assert.match(links, /customerStoreMembershipV668\.availableStores/)
assert.doesNotMatch(links, /customerStoreMembershipV654/)
assert.doesNotMatch(links, /customerStoreMembershipV668\.MAX_STORES/)
assert.doesNotMatch(links, /登録できる美容室は最大/)
assert.doesNotMatch(links, /data-store-limit/)
assert.match(links, /storeLimit: null/)
assert.match(links, /registered-store-frequency/)
assert.match(links, /visitCount\.toLocaleString\('ja-JP'\)/)
assert.match(client, /dataset\.lienStoresV668/)
assert.doesNotMatch(client, /initialCount >= limit/)
assert.doesNotMatch(client, /limitMessage/)
assert.match(client, /if \(input\.value\) lookup\(input\.value\)/)
assert.match(customerRuntime, /customer-link-ui-v293\.js\?v=668-store-frequency1/)
assert.match(commercialAdmin, /customer-link-ui-v293\.js\?v=668-store-frequency1/)
assert.match(membership, /MAX_STORES: null/)
assert.match(membership, /async function restoreAllEligibleLinks/)
assert.match(membership, /LEFT JOIN "Visit" v ON v\."customerId"=c\."id"/)
assert.match(membership, /right\.visitCount - left\.visitCount/)
assert.doesNotMatch(membership, /STORE_LIMIT_REACHED/)
new Function(client)

console.log(JSON.stringify({
  release: 'customer-store-frequency-v668',
  runtimeVerified: true,
  unlimitedMembership: true,
  frequencyOrdering: true,
}))
