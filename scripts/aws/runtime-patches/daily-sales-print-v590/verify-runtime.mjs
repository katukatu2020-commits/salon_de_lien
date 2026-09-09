import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
const root=process.env.LIEN_RUNTIME_ROOT || '/app'
const snapshot='/tmp/lien-v590/receipt-snapshot.json'
const sha=value=>crypto.createHash('sha256').update(value).digest('hex')
function receiptState() {
 const files=fs.readdirSync(path.join(root,'public')).filter(name=>name.startsWith('receipt-')).map(name=>'public/'+name)
 files.push('.next/server/app/admin/appointments/[appointmentId]/receipt/page.js')
 const state=Object.fromEntries(files.map(file=>[file,sha(fs.readFileSync(path.join(root,file)))]))
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8').replace(/\r\n/g,'\n')
 const branch=server.match(/  if \(receiptRoute\) \{[\s\S]*?    return output\n  \}/)?.[0]
 assert.ok(branch,'Receipt routing must be identifiable')
 state.receiptRoute=sha(branch)
 return state
}
if(process.argv[2]==='snapshot') {
 fs.writeFileSync(snapshot,JSON.stringify(receiptState()))
} else {
 assert.deepEqual(receiptState(),JSON.parse(fs.readFileSync(snapshot,'utf8')),'Receipt files and route must remain byte-identical')
 const server=fs.readFileSync(path.join(root,'server.js'),'utf8')
 const client=fs.readFileSync(path.join(root,'public/daily-sales-print-v590.js'),'utf8')
 const css=fs.readFileSync(path.join(root,'public/daily-sales-print-v590.css'),'utf8')
 assert.ok(server.includes("adminRoute && !output.includes('orimia-daily-sales-print-script-v590')"))
 assert.ok(server.indexOf('if (receiptRoute)')<server.indexOf("adminRoute && !output.includes('orimia-daily-sales-print-script-v590')"))
 assert.ok(!/window\.print\s*=/.test(client),'Daily sales must not override the receipt print function')
 assert.ok(client.includes("window.addEventListener('beforeprint'"))
 assert.ok(css.includes('@page orimiaDailySalesV590'))
 assert.ok(!/@page\s*\{/.test(css),'No unscoped page dimensions')
 console.log(JSON.stringify({release:'daily-sales-print-v590',receiptAssetsUnchanged:true,receiptRouteUnchanged:true,nativePrintUnchanged:true,namedPage:true}))
}
