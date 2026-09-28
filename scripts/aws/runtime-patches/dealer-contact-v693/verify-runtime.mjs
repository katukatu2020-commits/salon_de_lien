import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire('/app/package.json'),read=f=>fs.readFileSync('/app/'+f,'utf8')
for(const f of ['server.js','wholesale-ordering-v543.js','dealer-sales-team-v671.js','dealer-contact-v693.js','public/salon-order-entry-v693.js','public/dealer-sales-team-v693-client.js','public/inventory-orders-common-layout-v572.salon-orders-v693.js'])execFileSync('node',['--check','/app/'+f])
const {phone}=require('/app/dealer-contact-v693')
assert.equal(phone(' ０９０ー１２３４ー５６７８ '),'090-1234-5678');assert.equal(phone(''),null)
assert.equal(phone('+81 (90) 1234-5678'),'+81 (90) 1234-5678')
for(const s of ['javascript:alert(1)','090-1234-5678<script>','abc','123', '1'.repeat(16)])assert.throws(()=>phone(s))
assert.ok(read('server.js').includes('/salon-order-entry-v693.css?v=693-1'))
assert.ok(read('server.js').includes('/inventory-orders-common-layout-v572.salon-orders-v693.js?v=693-1'))
assert.ok(read('dealer-sales-team-v671.js').includes('/dealer-sales-team-v693-client.js?v=693-1'))
assert.ok(read('public/salon-order-entry-v693.js').includes('data-action="dealer-contact"'))
console.log('v693 runtime PASS')
