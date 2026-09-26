import fs from 'node:fs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
const root = process.env.LIEN_RUNTIME_ROOT || '/app'
for (const name of ['dealer-erp-v678.js', 'dealer-erp-v678-client.js', 'dealer-erp-v678-nav.js', 'wholesale-ordering-v543.js', 'dealer-sales-team-v671.js']) execFileSync(process.execPath, ['--check', root + '/' + name])
const read = name => fs.readFileSync(root + '/' + name, 'utf8')
assert.match(read('server.js'), /X-Lien-Dealer-Erp/)
assert.match(read('wholesale-ordering-v543.js'), /dealerErpV678.legacyGuard/)
assert.match(read('wholesale-ordering-v543.js'), /salesTeamV671.setReporting/)
assert.match(read('dealer-erp-v678.js'), /pg_advisory_xact_lock/)
assert.match(read('dealer-erp-v678.js'), /csv-parse\/sync/)
console.log('Dealer ERP runtime verified')
