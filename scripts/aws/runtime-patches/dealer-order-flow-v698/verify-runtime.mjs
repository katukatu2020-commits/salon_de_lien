import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
for(const file of ['workflow.cjs','analytics.cjs','exporters.cjs','portal.cjs','client.js','addon.js'])execFileSync('node',['--check','/app/dealer-order-flow-v698/'+file])
for(const file of ['server.js','wholesale-ordering-v543.js','dealer-erp-v678.js','dealer-erp-v698-client.js','public/salon-order-entry-v698.js','public/inventory-orders-common-layout-v698.js'])execFileSync('node',['--check','/app/'+file])
const read=f=>fs.readFileSync('/app/'+f,'utf8')
assert.match(read('server.js'),/await wholesaleOrdering.flowGate\(req,res,url\)/)
assert.match(read('dealer-erp-v678.js'),/stock-minimum|\.\.\.flow.actions/)
assert.match(read('public/salon-order-entry-v698.js'),/product.showDiscountRate===false/)
assert.match(read('orimia-store-directory-v670.js'),/serviceMode.*ORDER_ONLY/)
assert.match(read('dealer-erp-v698-client.js'),/actualComparison.previousYen/)
assert.match(read('public/salon-order-entry-v698.js'),/\/admin\/ordering\/documents/)
execFileSync('node',['--test','/tmp/lien-v698/unit.test.cjs'],{stdio:'inherit'})
await import('/tmp/lien-v697/verify-runtime.mjs')
console.log('v698 runtime PASS: workflow, limited account gate, hidden-rate surfaces, inventory/actual sales and existing compatibility')
