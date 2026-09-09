import fs from 'node:fs'
import path from 'node:path'
const root=process.env.LIEN_RUNTIME_ROOT || '/app'
const file=path.join(root,'server.js')
let server=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')
function once(before,after,label) {
  if(server.split(before).length!==2) throw new Error('daily-sales-print-v590: ambiguous '+label)
  server=server.replace(before,after)
}
once("  const dailySalesRoute = pathname === '/admin/owner-analytics'",'','obsolete route-only asset guard')
once("  if (dailySalesRoute && !output.includes('orimia-daily-sales-print-script-v541')) {","  if (adminRoute && !output.includes('orimia-daily-sales-print-script-v590')) {",'navigation-safe asset guard')
const previous='<link id="orimia-daily-sales-print-style-v563" rel="stylesheet" href="/daily-sales-print-fit-v563.css?v=563-release1"><script id="orimia-daily-sales-print-script-v563" src="/daily-sales-print-fit-v563.js?v=563-release1" defer></script>'
const next='<link id="orimia-daily-sales-print-style-v590" rel="stylesheet" href="/daily-sales-print-v590.css"><script id="orimia-daily-sales-print-script-v590" src="/daily-sales-print-v590.js" defer></script>'
once(JSON.stringify(previous),JSON.stringify(next),'versioned daily sales assets')
const ready="      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Admin-Chat-Search', 'v589') /* admin-chat-search-v589 */"
once(ready,ready+"\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Daily-Sales-Print', 'v590') /* daily-sales-print-v590 */",'readiness')
fs.writeFileSync(file,server)
console.log(JSON.stringify({release:'daily-sales-print-v590',navigationSafe:true,receiptRoutingUntouched:true}))
