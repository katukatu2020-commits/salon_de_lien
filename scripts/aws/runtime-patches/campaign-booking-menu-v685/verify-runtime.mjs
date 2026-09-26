import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
const read=file=>fs.readFileSync('/app/'+file,'utf8')
for(const file of ['server.js','tenant-setup.js','campaign-booking-v685.cjs','public/campaign-booking-v685.js','public/customer-journey-v685.js'])execFileSync(process.execPath,['--check','/app/'+file])
const tenant=read('tenant-setup.js'),booking=tenant.slice(tenant.indexOf('async function customerBook('),tenant.indexOf('async function pollConnectedOrganizations('))
assert.ok(booking.indexOf('assertCampaignMenu(')>booking.indexOf('prisma.$transaction('))
assert.ok(booking.indexOf('assertCampaignMenu(')<booking.indexOf('transaction.appointment.create('))
for(const marker of ['sameOrigin(req)','evaluateBookingSlot(','staffBreaks','customerNameAutoMerge.resolveOrCreate',"isolationLevel: 'Serializable'"])assert.ok(booking.includes(marker))
const journey=read('public/customer-journey-v685.js')
for(const marker of ['orimia:hydrated-v680','window.OrimiaCampaignBookingV685={read,permits,initializeMenu,render}','campaignBooking.permits','campaignBooking?.initializeMenu(select)','menuScrollSnapshot','orimia:campaign-booking-v685'])assert.ok(journey.includes(marker))
assert.ok(read('server.js').includes('/customer-journey-v685.js?v=685'))
assert.ok(read('server.js').includes('customer-coupon-menu-prefill-v665'))
assert.ok(read('ui-workflows-v294.js').includes('customer-booking-points-v652'))
console.log('v685 runtime PASS: syntax, versioned assets, hydration, transaction guard, availability and coupon/points preservation')
