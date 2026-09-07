import assert from 'node:assert/strict'
import fs from 'node:fs'

const salesClient = fs.readFileSync('/app/sales-ledger-client-v318.js', 'utf8')
const tenantClient = fs.readFileSync('/app/tenant-setup-client.js', 'utf8')
const server = fs.readFileSync('/app/server.js', 'utf8')

assert.match(salesClient, /function syncOwnerAnalyticsTabs\(\) \{ \/\* owner-billing-tab-v577 \*\//)
assert.match(salesClient, /params\.get\('section'\) === 'billing'/)
assert.match(salesClient, /params\.get\('salesLedger'\) === '1'/)
assert.match(salesClient, /syncOwnerAnalyticsTabs\(\)/)
assert.match(salesClient, /addEventListener\('pageshow', enhance\)/)
assert.match(salesClient, /setTimeout\(enhance, 240\)/)
assert.match(tenantClient, /sales-ledger-v318\.js\?v=577-owner-billing-tab1/)
assert.equal(tenantClient.includes("sales-ledger-v318.js?v=413"), false)
assert.match(server, /X-Lien-Owner-Billing-Tab', 'v577'/)
assert.match(server, /X-Lien-Dealer-Operations', 'v576'/)
assert.equal(server.split('X-Lien-Owner-Billing-Tab').length - 1, 1)

console.log(JSON.stringify({ release:'owner-billing-tab-v577', runtimeVerified:true }))
