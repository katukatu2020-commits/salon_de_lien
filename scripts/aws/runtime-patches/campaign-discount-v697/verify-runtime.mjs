import fs from 'node:fs'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
for(const file of ['server.js','tenant-setup.js','campaign-booking-v685.cjs','customer-booking-points-v652.js','public/customer-journey-v697.js','public/customer-booking-confirmation-v697.js','public/customer-booking-points-v697.js','ui-workflows-v294.js'])execFileSync('node',['--check','/app/'+file])
const read=f=>fs.readFileSync('/app/'+f,'utf8')
assert.match(read('tenant-setup.js'),/applyInTransaction\(transaction/)
assert.match(read('public/customer-journey-v697.js'),/campaignDiscountRate:current.campaign.discountRate/)
assert.match(read('public/customer-booking-points-v697.js'),/couponDiscount - campaign.discount/)
const prior=fs.readFileSync('/tmp/lien-v685/verify-runtime.mjs','utf8').replaceAll('/customer-journey-v685.js?v=685','/customer-journey-v697.js?v=697')
await import('data:text/javascript;base64,'+Buffer.from(prior).toString('base64'))
await import('/tmp/lien-v696/verify-runtime.mjs')
console.log('v697 runtime PASS: campaign amounts, atomic booking adjustment, customer and salon breakdown, immutable UI assets')
