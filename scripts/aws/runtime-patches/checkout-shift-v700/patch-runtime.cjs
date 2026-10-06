'use strict'
const fs=require('node:fs'),path=require('node:path')
const root=process.env.LIEN_RUNTIME_ROOT||'/app'
const read=f=>fs.readFileSync(path.join(root,f),'utf8'),write=(f,s)=>fs.writeFileSync(path.join(root,f),s)
function replace(s,a,b){if(s.split(a).length!==2)throw Error('Anchor count: '+a.slice(0,120));return s.replace(a,()=>b)}
const oldChunk='page-shift-grid-sync-v526.js',newChunk='page-checkout-shift-v700.js'
const chunkRoot='.next/static/chunks/app/admin/appointments/'
let page=read('.next/server/app/admin/appointments/page.js')
page=replace(page,'                  customer: { select: { id: !0, name: !0, phone: !0 } },', '                  customer: { select: { id: !0, name: !0, phone: !0 } },\n                  serviceSales: { select: { id: true }, take: 1 }, /* checkout-shift-v700 */')
page=replace(page,'                            status: e.status,','                            status: e.status,\n                            checkoutCompleted: e.serviceSales.length > 0,')
write('.next/server/app/admin/appointments/page.js',page)
let shift=read(chunkRoot+oldChunk)
shift=replace(shift,'      function menuCategory(e) {',`      function checkoutDisplayV700(e) {
        return e.checkoutCompleted
          ? {backgroundColor:'#fce7f0',borderColor:'#d86b8d',color:'#802947'}
          : {backgroundColor:'#fff4bd',borderColor:'#d7b550',color:'#655018'};
      }
      function menuCategory(e) {`)
const colorStart=shift.indexOf('"予約確定" === (a = e.status)'),colorEnd=shift.indexOf('\n                                          " ",',colorStart)
if(colorStart<0||colorEnd<colorStart)throw Error('Shift status colours missing')
shift=shift.slice(0,colorStart)+'"",'+shift.slice(colorEnd)
shift=replace(shift,'                                    style: {\n                                      left: p,',`                                    "data-appointment-id": e.id,
                                    "data-checkout-state": e.checkoutCompleted ? 'paid' : 'unpaid',
                                    style: {
                                      ...checkoutDisplayV700(e),
                                      left: p,`)
shift=replace(shift,'"cursor-default opacity-70"','"cursor-default"')
shift=replace(shift,'                                    title: ""','                                    title: (e.checkoutCompleted ? "会計済み / " : "未会計 / ")')
shift=replace(shift,'                                    "aria-label": ""','                                    "aria-label": (e.checkoutCompleted ? "会計済み / " : "未会計 / ")')
shift=replace(shift,'                      children: "日別シフト表",',`                      children: "日別シフト表",
                    }),
                    (0,r.jsxs)("div", {
                      "aria-label": "会計状態",
                      style: {display:'flex',gap:16,fontSize:12,marginTop:8},
                      children: [true,false].map(paid => (0,r.jsxs)("span", {
                        style:{display:'inline-flex',alignItems:'center',gap:6},
                        children:[(0,r.jsx)("span",{"aria-hidden":true,style:{width:12,height:12,border:'1px solid',borderRadius:2,...checkoutDisplayV700({checkoutCompleted:paid})}}),paid?'会計済み':'未会計']
                      },String(paid))),`)
write(chunkRoot+newChunk,shift)
for(const file of ['.next/app-build-manifest.json','.next/server/app/admin/appointments/page_client-reference-manifest.js']){
 const source=read(file);if(!source.includes(oldChunk))throw Error('Chunk manifest missing: '+file)
 write(file,source.split(oldChunk).join(newChunk))
}
const receiptPath='.next/server/app/admin/appointments/[appointmentId]/receipt/page.js'
let receipt=read(receiptPath)
receipt=replace(receipt,'"aria-label":"会計レシート",',`"aria-label":"会計レシート","data-shift-return-href":(()=>{const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(p.scheduledAt);return '/admin/appointments?month='+day.slice(0,7)+'&date='+day+'#staff-schedule'})(),`)
write(receiptPath,receipt)
let printer=read('public/receipt-pos-direct-v582.js')
printer=replace(printer,'      if (!result?.printed) return false',"      if (!result?.printed) throw new Error('Print job was not acknowledged')")
printer=replace(printer,`    } catch {
      bridgeStatus = null
      return false
    }
  }

  async function printReceipt()`, `    } catch (error) {
      bridgeStatus = null
      throw error // Do not automatically submit a second job after an ambiguous printer timeout.
    }
  }

  async function printReceipt()`)
printer=replace(printer,`    void printReceipt()
  }`, `    void printReceipt().catch(() => {
      setButtonLabel('印刷を確認できません。出力を確認後、再試行してください', 'error')
    })
  }`)
write('public/receipt-pos-direct-v700.js',printer)
let server=read('server.js')
server=replace(server,'  if (receiptRoute) {',`  if (pathname === '/admin/appointments' || pathname.startsWith('/admin/appointments/')) {
    if (!output.includes('orimia-checkout-shift-v700')) output=output.replace('<head>','<head>'+${JSON.stringify('<script id="orimia-checkout-shift-v700" src="/checkout-shift-v700.js" defer></script>')})
  }
  if (receiptRoute) {`)
server=replace(server,'/receipt-pos-direct-v582.js?v=582-release1','/receipt-pos-direct-v700.js?v=700-release1')
server=replace(server,"      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Pos-Direct', 'v582')", "      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Checkout-Shift', 'v700')\n      if (url.pathname === '/api/health/ready') res.setHeader('X-Lien-Receipt-Pos-Direct', 'v582')")
write('server.js',server)
console.log('checkout-shift-v700 applied: sale-backed colours, one-click printing and shift return')
