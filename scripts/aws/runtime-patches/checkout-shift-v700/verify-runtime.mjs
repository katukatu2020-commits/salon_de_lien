import assert from 'node:assert/strict'
import fs from 'node:fs'
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
const read=p=>fs.readFileSync(root+'/'+p,'utf8')
assert.match(read('server.js'),/X-Lien-Checkout-Shift/)
assert.match(read('server.js'),/receipt-pos-direct-v700\.js/)
assert.match(read('server.js'),/checkout-shift-v700\.js/)
assert.match(read('.next/server/app/admin/appointments/page.js'),/checkoutCompleted: e\.serviceSales\.length > 0/)
assert.match(read('.next/server/app/admin/appointments/page.js'),/serviceSales: \{ select: \{ id: true \}, take: 1 \}/)
const shift=read('.next/static/chunks/app/admin/appointments/page-checkout-shift-v700.js')
for(const text of ['#fce7f0','#fff4bd','data-checkout-state','会計済み / ','未会計 / '])assert.ok(shift.includes(text),text)
assert.match(read('.next/server/app/admin/appointments/[appointmentId]/receipt/page.js'),/data-shift-return-href/)
assert.match(read('.next/app-build-manifest.json'),/page-checkout-shift-v700/)
assert.match(read('public/checkout-shift-v700.js'),/history.replaceState/)
assert.match(read('public/receipt-pos-direct-v700.js'),/throw error \/\/ Do not automatically submit a second job/)
console.log('PASS v700 runtime: sale-backed colours, receipt context, cache-busted assets, single print job')
