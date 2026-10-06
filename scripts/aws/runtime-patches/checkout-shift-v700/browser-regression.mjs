import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.BROWSER_PACKAGE_JSON||path.resolve('package.json'))
const {chromium}=require('playwright-core')
const base=process.env.VERIFY_BASE_URL||'http://127.0.0.1:3188'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const artifacts=path.resolve(process.env.VERIFY_SCREENSHOT_DIR||'artifacts/checkout-shift-v700')
fs.mkdirSync(artifacts,{recursive:true})
async function setup(mode,width=1440){
 const context=await browser.newContext({viewport:{width,height:1000}})
 await context.addInitScript(()=>{window.print=()=>{sessionStorage.setItem('nativeCalls',String(Number(sessionStorage.getItem('nativeCalls')||0)+1));window.dispatchEvent(new Event('beforeprint'));setTimeout(()=>window.dispatchEvent(new Event('afterprint')),50)}})
 let prints=0,payload
 await context.route('http://127.0.0.1:17615/**',async route=>{
  const req=route.request(),headers={'Access-Control-Allow-Origin':new URL(base).origin,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Private-Network':'true'}
  if(mode==='unavailable')return route.abort('connectionrefused')
  if(req.method()==='OPTIONS')return route.fulfill({status:204,headers,body:''})
  const printing=req.url().endsWith('/print')
  if(printing){prints++;payload=JSON.parse(req.postData());await new Promise(resolve=>setTimeout(resolve,300))}
  await route.fulfill({status:printing&&mode==='error'?500:200,headers,contentType:'application/json',body:JSON.stringify(printing?{printed:mode!=='error',printerName:'QA mock'}:{available:true,printerName:'QA mock'})})
 })
 const login=await context.request.post(base+'/api/auth/login',{form:{email:process.env.QA_LOGIN||'demo.owner',password:process.env.QA_PASSWORD||'QaLocalOnly-v680!',next:'/admin/appointments'}})
 assert.equal(login.status(),200)
 const ledger=await context.request.get(base+'/api/admin/sales-ledger?from=2026-08-01&to=2026-10-31').then(r=>r.json())
 const id=ledger.rows.find(r=>r.appointmentId==='showcase-yohaku-appointment-past-067')?.appointmentId
 assert.ok(id,'Paid fixture required')
 const page=await context.newPage(),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 return {context,page,id,prints:()=>prints,payload:()=>payload,errors}
}
try{
 const direct=await setup('direct')
 await direct.page.goto(base+'/admin/appointments/'+direct.id)
 await direct.page.getByRole('link',{name:/レシート.*印刷/}).click({clickCount:2})
 await direct.page.waitForURL(u=>u.pathname==='/admin/appointments',{timeout:15000})
 assert.equal(direct.prints(),1)
 assert.ok(direct.payload().receipt.items.length)
 assert.equal(direct.context.pages().length,1,'No extra tab')
 assert.equal(await direct.page.evaluate(()=>sessionStorage.getItem('nativeCalls')),null)
 const day=new URL(direct.page.url()).searchParams.get('date')
 assert.equal(new URL(direct.page.url()).hash,'#staff-schedule')
 await direct.page.locator('[data-checkout-state="paid"]').first().waitFor()
 const paid=direct.page.locator('[data-appointment-id="'+direct.id+'"]')
 assert.equal(await paid.getAttribute('data-checkout-state'),'paid')
 assert.equal(await paid.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(252, 231, 240)')
 await paid.scrollIntoViewIfNeeded()
 await direct.page.screenshot({path:path.join(artifacts,'paid-desktop.png'),fullPage:true})
 await direct.page.setViewportSize({width:390,height:844})
 await paid.scrollIntoViewIfNeeded()
 await direct.page.screenshot({path:path.join(artifacts,'paid-mobile.png'),fullPage:true})
 await direct.page.goto(base+'/admin/appointments?month=2026-08&date=2026-08-24#staff-schedule')
 await direct.page.locator('[data-checkout-state="unpaid"]').first().waitFor()
 assert.equal(await direct.page.locator('[data-checkout-state="unpaid"]').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(255, 244, 189)')
 await direct.page.screenshot({path:path.join(artifacts,'unpaid-mobile.png'),fullPage:true})
 assert.deepEqual(direct.errors,[])
 await direct.context.close()
 const native=await setup('unavailable',390)
 await native.page.goto(base+'/admin/appointments/'+native.id)
 await native.page.getByRole('link',{name:/レシート.*印刷/}).click()
 await native.page.waitForURL(u=>u.pathname==='/admin/appointments',{timeout:15000})
 assert.equal(await native.page.evaluate(()=>sessionStorage.getItem('nativeCalls')),'1')
 assert.equal(native.prints(),0)
 assert.equal(new URL(native.page.url()).searchParams.get('date'),day)
 assert.deepEqual(native.errors,[])
 await native.context.close()
 const error=await setup('error')
 await error.page.goto(base+'/admin/appointments/'+error.id)
 await error.page.getByRole('link',{name:/レシート.*印刷/}).click()
 await error.page.getByRole('alert').filter({hasText:'印刷を確認できませんでした'}).waitFor({timeout:15000})
 assert.equal(error.prints(),1)
 assert.match(new URL(error.page.url()).pathname,/\/receipt$/)
 assert.equal(new URL(error.page.url()).searchParams.has('autoPrint'),false)
 assert.equal(await error.page.evaluate(()=>sessionStorage.getItem('nativeCalls')),null,'No duplicate fallback after failed spool acknowledgement')
 await error.page.reload()
 await error.page.waitForFunction(()=>Boolean(window.__orimiaReceiptPosDirectV582))
 assert.equal(error.prints(),1,'Refresh cannot print again')
 assert.deepEqual(error.errors,[])
 await error.context.close()
 console.log('PASS browser: paid pink/unpaid yellow, desktop/mobile, one click/double click one job, correct date, native dialog fallback, failure stays, reload no reprint')
}finally{await browser.close()}
