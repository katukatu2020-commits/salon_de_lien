import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot = process.argv.includes('snapshot')
const client = fs.readFileSync(path.join(root, 'staff-breaks-checkout-menu-client-v442.js'), 'utf8')
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8')

assert.match(client, /manual-booking-break-interaction-v535/)
assert.match(client, /select\[name="customerId"\]/)
assert.match(server, /X-Lien-Style-Order-Loading-Recovery[^\n]+v661/)

if (snapshot) {
  assert.doesNotMatch(client, /shift-customer-search-v662/)
  assert.doesNotMatch(server, /X-Lien-Shift-Customer-Search/)
  console.log(JSON.stringify({ release: 'shift-customer-search-v662', snapshotVerified: true }))
  process.exit(0)
}

assert.equal(client.split('/* shift-customer-search-v662 */').length - 1, 1)
assert.match(client, /__orimiaShiftCustomerSearchV662/)
assert.match(client, /orimia-customer-search-input-v662/)
assert.match(client, /character\.charCodeAt\(0\) - 0x60/)
assert.match(client, /item\.search\.includes\(query\)/)
assert.match(client, /compositionstart/)
assert.match(client, /aria-autocomplete/)
assert.match(client, /select\.required = false/)
assert.match(server, /X-Lien-Shift-Customer-Search', 'v662'/)
assert.equal(server.split('/* shift-customer-search-v662 */').length - 1, 1)

console.log(JSON.stringify({ release: 'shift-customer-search-v662', runtimeVerified: true }))
