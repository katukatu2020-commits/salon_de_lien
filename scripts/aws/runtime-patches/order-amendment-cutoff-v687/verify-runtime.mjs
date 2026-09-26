import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire('/app/package.json'),read=f=>fs.readFileSync('/app/'+f,'utf8')
for(const f of ['server.js','wholesale-ordering-v543.js','dealer-erp-v678.js','order-amendments-v687.js','public/order-amendments-v687.js','public/salon-order-entry-v687.js','public/dealer-order-entry-v687.js','dealer-erp-v678-client.order-cutoff-v687.js','public/inventory-orders-common-layout-v572.salon-orders-v687.js'])execFileSync('node',['--check','/app/'+f])
const {cutoffAt}=require('/app/order-amendments-v687.js')
for(const [input,minutes,expected] of [
 ['2026-09-27T10:59:59.999+09:00',660,'2026-09-27T02:00:00.000Z'],
 ['2026-09-27T11:00:00+09:00',660,'2026-09-28T02:00:00.000Z'],
 ['2026-09-27T11:00:00.001+09:00',660,'2026-09-28T02:00:00.000Z'],
 ['2026-09-30T12:00:00+09:00',660,'2026-10-01T02:00:00.000Z'],
 ['2026-12-31T23:00:00+09:00',660,'2027-01-01T02:00:00.000Z'],
 ['2028-02-28T12:00:00+09:00',660,'2028-02-29T02:00:00.000Z'],
 ['2028-02-29T12:00:00+09:00',660,'2028-03-01T02:00:00.000Z'],
 ['2026-09-27T00:00:00+09:00',0,'2026-09-27T15:00:00.000Z'],
 ['2026-09-27T23:59:00+09:00',1439,'2026-09-28T14:59:00.000Z'],
 ['2026-09-27T10:00:00+09:00',null,null]
])assert.equal(cutoffAt(input,minutes)?.toISOString()??null,expected)
for(const minutes of [-1,1440,1.5])assert.throws(()=>cutoffAt(new Date(),minutes))
const service=read('wholesale-ordering-v543.js'),erp=read('dealer-erp-v678.js'),salon=read('public/salon-order-entry-v687.js')
assert.equal(service.split('await dealerErpV678.captureOrder').length,3)
assert.ok(service.includes('unitPrice !== Number(current.unitPrice)'));assert.ok(erp.includes("if (target === 'CANCELLED') await amendments.assertDeadline"))
assert.ok(erp.includes('await amendments.assertDeadline(tx, o)'))
assert.ok(salon.includes('data-order-edit-v687'));assert.ok(salon.includes('products.slice(offset, offset + salon.orderPageSize)'))
assert.ok(salon.includes('updateOrderQuantityV686(stepper, next)'));assert.ok(salon.includes('salon.searchComposing'))
assert.ok(read('public/inventory-orders-common-layout-v572.salon-orders-v687.js').includes('orimia:hydrated-v680'))
assert.ok(read('server.js').includes('inventory-orders-common-layout-v572.salon-orders-v687.js?v=687-1'))
assert.ok(read('server.js').includes('X-Lien-Order-Amendment-Cutoff'))
for(const fn of ['createDealerInvite','requestDealerConnectionByCode'])assert.match(service.slice(service.indexOf('  async function '+fn+'(')).split('\n  async function ')[0],/throw new WholesaleError/)
console.log('v687 runtime and JST boundaries PASS')
