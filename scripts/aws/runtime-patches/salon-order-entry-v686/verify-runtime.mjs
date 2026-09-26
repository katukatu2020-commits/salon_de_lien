import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
const read=file=>fs.readFileSync('/app/'+file,'utf8')
for(const file of ['server.js','wholesale-ordering-v543.js','public/salon-order-entry-v686.js','public/inventory-orders-common-layout-v572.salon-orders-v686.js'])execFileSync('node',['--check','/app/'+file])
const service=read('wholesale-ordering-v543.js'),client=read('public/salon-order-entry-v686.js'),server=read('server.js')
for(const fn of ['createDealerInvite','requestDealerConnectionByCode']){
 const body=service.slice(service.indexOf('  async function '+fn+'(')).split('\n  async function ')[0]
 assert.match(body,/throw new WholesaleError/);assert.match(body,/, 403\)/);assert.doesNotMatch(body,/INSERT INTO|UPDATE |sendDealer/)
}
assert.ok(service.includes('await registerSalonContract(session, payload)'))
assert.ok(service.includes('FOR SHARE OF c,d'));assert.ok(service.includes('quantity % orderUnit'))
assert.ok(client.includes('products.slice(offset, offset + salon.orderPageSize)'))
assert.ok(client.includes('bootstrap?dealerId=all'));assert.ok(client.includes('updateOrderQuantityV686(stepper, next)'))
assert.ok(client.includes("normalize('NFKC')"));assert.ok(client.includes('salon.searchComposing'))
assert.ok(client.includes('チャットを開く'));assert.ok(client.includes('quantity: item.quantity'))
assert.doesNotMatch(client.slice(0,client.indexOf('  const dealerProductLocationV628')),/dealer-code-form|ディーラーを追加|wholesale\/invites|wholesale\/contracts\/code/)
assert.ok(server.includes('X-Lien-Salon-Order-Entry'));assert.ok(server.includes('/salon-order-entry-v686.css?v=686-1'))
assert.ok(read('public/inventory-orders-common-layout-v572.salon-orders-v686.js').includes('/salon-order-entry-v686.js?v=686-1'))
assert.ok(read('public/inventory-orders-common-layout-v572.salon-orders-v686.js').includes('orimia:hydrated-v680'))
assert.ok(server.includes('inventory-orders-common-layout-v572.salon-orders-v686.js?v=686-1'))
for(const marker of ["'chat-send': partnerChat.send","'chat-partners': partnerChat.partners",'dealer-erp-v678-partner-chat-client-v682.js?v=682-1'])assert.ok(read('dealer-erp-v678.js').includes(marker))
assert.ok(read('dealer-erp-v678-client.stock-note-v681.js').includes('備考（任意）'))
console.log('v686 runtime PASS: syntax, dealer-only linking, bounded rows, IME, stable cart, hydration and existing order validation')
