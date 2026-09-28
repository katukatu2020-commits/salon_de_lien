import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
const read=f=>fs.readFileSync('/app/'+f,'utf8')
for(const f of ['server.js','wholesale-ordering-v543.js','dealer-erp-v678.js','order-consolidation-v692.js','order-amendments-v687.js','public/order-amendments-v692.js','public/salon-order-entry-v692.js','public/dealer-orders-v692.js','public/inventory-orders-common-layout-v572.salon-orders-v692.js'])execFileSync('node',['--check','/app/'+f])
let legacy=fs.readFileSync('/tmp/lien-v687/verify-runtime.mjs','utf8')
legacy=legacy.replace("assert.equal(service.split('await dealerErpV678.captureOrder').length,3)","assert.ok(service.includes('await consolidationV692.create(session,payload)'));assert.ok(read('order-consolidation-v692.js').includes('INSERT INTO \\\"WholesaleOrderAmendment\\\"'))")
legacy=legacy.replaceAll('inventory-orders-common-layout-v572.salon-orders-v687.js?v=687-1','inventory-orders-common-layout-v572.salon-orders-v692.js?v=692-1')
await import('data:text/javascript;base64,'+Buffer.from(legacy).toString('base64'))
assert.ok(read('public/salon-order-entry-v692.js').includes('/api/admin/wholesale/order-quote'))
assert.ok(read('public/order-amendments-v692.js').includes('shipping-policy'))
assert.ok(read('dealer-workspace-v688.js').includes('/dealer-orders-v692.js?v=692-1'))
assert.ok(read('server.js').includes('/salon-order-entry-v692.css?v=692-1'))
console.log('v692 runtime PASS')
