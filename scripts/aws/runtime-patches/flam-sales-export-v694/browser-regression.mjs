import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core'),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3199'
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Isolated fixture only')
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const out='artifacts/flam-sales-export-v694';fs.mkdirSync(out,{recursive:true})
const errors=[]
try{
 const context=await browser.newContext({locale:'ja-JP'}),p=await context.newPage()
 p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message))
 async function login(page,id){
  await page.goto(base+'/dealer/login');await page.locator('[name=loginId]').fill(id);await page.locator('[name=password]').fill('FixtureOnly-v678!')
  await page.locator('button[type=submit]').click();await page.waitForURL('**/dealer/orders')
  await page.goto(base+'/dealer/sales');await page.locator('[data-flam-open]').waitFor()
 }
 await login(p,'erp-owner-a')
 const trigger=p.locator('[data-flam-open]'),dialog=p.locator('.flam-dialog-v694'),download=dialog.locator('[data-flam-download]')
 async function open(){await trigger.click();await dialog.locator('[data-flam-code]').first().waitFor();await dialog.locator('[aria-busy=true]').waitFor({state:'detached'})}
 async function save(){
  const response=p.waitForResponse(r=>r.url().includes('/flam-preview?'))
  await dialog.locator('[data-flam-save]').click();assert.equal((await response).status(),200)
  await p.waitForFunction(()=>document.querySelector('.flam-dialog-v694')?.getAttribute('aria-busy')==='false')
 }
 for(const width of [1440,390,320]){
  await p.setViewportSize({width,height:900});await open()
  assert.match(await dialog.locator('.flam-summary').innerText(),/6,400/)
  assert.equal(await download.isEnabled(),true)
  assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth+1),false)
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  for(let i=0;i<10;i++){await p.keyboard.press('Tab');assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true)}
  await p.screenshot({path:out+'/export-'+width+'.png'})
  const file=p.waitForEvent('download');await download.click();const result=await file
  assert.match(result.suggestedFilename(),/^ORIMIA_flam_sales_\d{4}-\d{2}\.xlsx$/)
  await result.saveAs(out+'/download-'+width+'.xlsx')
  await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
  assert.equal(await trigger.evaluate(e=>document.activeElement===e),true)
 }
 await open()
 await dialog.locator('[data-flam-code="salon-a"]').fill('');assert.equal(await download.isDisabled(),true)
 await save();await dialog.locator('.flam-issues').waitFor();assert.equal(await download.isDisabled(),true)
 await dialog.locator('[data-flam-code="salon-a"]').fill('0000123');await save()
 assert.equal(await dialog.locator('[data-flam-code="salon-a"]').inputValue(),'0000123');assert.equal(await download.isEnabled(),true)
 await dialog.locator('[data-flam-products]').check()
 await p.waitForFunction(()=>document.querySelector('.flam-dialog-v694')?.getAttribute('aria-busy')==='false')
 assert.equal(await download.isEnabled(),true)
 await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
 await p.locator('#dst-filters [name=salon]').selectOption('salon-b')
 await open();assert.match(await dialog.locator('.flam-summary').innerText(),/6,400/,'Only applied filters affect export')
 await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
 const filtered=p.waitForResponse(r=>r.url().includes('/api/dealer/sales?'))
 await p.locator('#dst-filters button[type=submit]').click();await filtered
 await open();assert.match(await dialog.locator('.flam-summary').innerText(),/1,600/)
 assert.equal(await dialog.locator('[data-flam-code]').count(),1)
 await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
 await p.route('**/api/dealer/erp/flam-preview?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'一時的に取得できません'})}),{times:1})
 await trigger.click();await dialog.locator('.flam-error').waitFor();assert.equal(await download.isDisabled(),true)
 await dialog.locator('[data-flam-reload]').click();await dialog.locator('[data-flam-code]').waitFor();assert.equal(await download.isEnabled(),true)
 await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
 let release,requested;const pending=new Promise(r=>release=r),seen=new Promise(r=>requested=r)
 await p.route('**/api/dealer/erp/flam-preview?*',async route=>{requested();await pending;await route.continue().catch(()=>{})},{times:1})
 await trigger.click();await seen;await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'});release()
 await open();assert.equal(await p.locator('.flam-dialog-v694').count(),1)
 await p.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
 await p.locator('#dst-filters [name=month]').fill('2000-01')
 const empty=p.waitForResponse(r=>r.url().includes('/api/dealer/sales?'))
 await p.locator('#dst-filters button[type=submit]').click();await empty;await trigger.click()
 await dialog.locator('.flam-empty').waitFor();assert.equal(await download.isDisabled(),true)
 const staff=await browser.newContext(),s=await staff.newPage();s.setDefaultTimeout(10000);s.on('pageerror',e=>errors.push(e.message))
 await login(s,'erp-sales-a');await s.locator('[data-flam-open]').click()
 await s.locator('.flam-dialog-v694 [data-flam-code]').waitFor()
 assert.equal(await s.locator('[data-flam-save]').count(),0)
 assert.equal(await s.locator('[data-flam-code]').first().isDisabled(),true)
 assert.equal(await s.locator('[data-flam-code="salon-b"]').count(),0)
 assert.deepEqual(errors,[])
 console.log('v694 browser PASS: real XLSX download, 1440/390/320 layouts, code save/clear/leading zeros, applied filters, empty results, retry/race, focus, staff scope, no page errors')
}finally{await browser.close()}
