import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
const root=process.env.LIEN_RUNTIME_ROOT || '/app'
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
assert.match(read('server.js'),/X-Lien-Dealer-Sales-Team/)
assert.match(read('server.js'),/X-Lien-Orimia-Store-Directory/)
assert.match(read('wholesale-ordering-v543.js'),/salesTeamV671\.extendSession/)
assert.match(read('wholesale-ordering-v543.js'),/staffAuthVersion: dealer.staffAuthVersion/)
assert.match(read('business-account-approvals-v643.js'),/if \(session.staffUserId\) return false/)
assert.match(read('dealer-sales-team-v671.sql'),/dealer_sales_order_snapshot_v671/)
assert.match(read('dealer-sales-team-v671-client.js'),/composition|dst-search/)
console.log('Runtime v671 verified')
