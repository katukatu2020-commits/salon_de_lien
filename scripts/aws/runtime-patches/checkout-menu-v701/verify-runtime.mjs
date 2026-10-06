import assert from 'node:assert/strict'
import fs from 'node:fs'
import {execFileSync} from 'node:child_process'
for (const file of ['staff-breaks-checkout-menu-client-v442.js', 'public/appointment-datetime-v684.js', 'tenant-setup.js', 'inbound-email.js', '.next/server/chunks/3447.js', '.next/server/app/admin/appointments/[appointmentId]/page.js', 'server.js']) execFileSync(process.execPath, ['--check', '/app/' + file])
for (const file of ['staff-breaks-checkout-menu-client-v442.js', 'public/appointment-datetime-v684.js']) {
 const source=fs.readFileSync('/app/'+file,'utf8')
 assert.ok(source.includes('data-checkout-service-item'))
 assert.ok(source.includes('state.checkoutForm !== form'))
 assert.ok(!source.includes('[state.baseMenu,'))
}
assert.ok(fs.readFileSync('/app/.next/server/chunks/3447.js','utf8').includes('...parseReservationMenu(t)'))
execFileSync(process.execPath, ['--test', '/tmp/lien-v701/runtime-tests.cjs'], {stdio:'inherit'})
console.log('PASS v701 checkout editor and all email ingress paths')
