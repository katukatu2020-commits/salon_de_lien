import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core'),base=process.env.FLOW_FIXTURE_URL||'http://127.0.0.1:3203'
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Isolated fixture only')
const dir=path.resolve('artifacts/dealer-order-flow-v698');fs.mkdirSync(dir,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const errors=[]
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage()
 page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base+'/dealer/login')
 await page.locator('[name=loginId]').fill('erp-owner-a');await page.locator('[name=password]').fill('FixtureOnly-v678!')
 await page.getByRole('button',{name:'ログイン',exact:true}).click();await page.waitForURL(u=>u.pathname!=='/dealer/login')
 for(const route of ['/dealer/procurement?tab=demand','/dealer/procurement?tab=purchases','/dealer/manufacturer-report','/dealer/period-sales','/dealer/salons/salon-a']){
  await page.goto(base+route)
  await page.locator('#flow-app table').first().waitFor()
  assert.equal(await page.locator('#flow-status').innerText(),'')
  const name=route.split('/').pop().replace(/[^a-z0-9-]/gi,'-')
  await page.screenshot({path:path.join(dir,name+'-desktop.png'),fullPage:true})
  await page.setViewportSize({width:390,height:844})
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route)
  await page.screenshot({path:path.join(dir,name+'-mobile.png'),fullPage:true})
  await page.setViewportSize({width:1440,height:1000})
 }
 await page.goto(base+'/dealer/period-sales')
 await page.locator('select[name=period]').selectOption('year')
 await page.getByRole('button',{name:'絞り込む',exact:true}).click()
 await page.locator('#flow-app h2').first().filter({hasText:/年$/}).waitFor()
 await page.locator('select[name=member]').selectOption({label:'営業担当'})
 const filtered=page.waitForResponse(r=>r.url().includes('/period-sales?')&&r.status()===200)
 await page.getByRole('button',{name:'絞り込む',exact:true}).click()
 await filtered
 const salon=await browser.newContext({viewport:{width:390,height:844},extraHTTPHeaders:{'x-fixture-salon':'1'}}),sp=await salon.newPage()
 sp.setDefaultTimeout(10000);sp.on('pageerror',e=>errors.push(e.message))
 await sp.goto(base+'/admin/ordering/documents')
 await sp.locator('#flow-app table').first().waitFor()
 assert.ok(await sp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 assert.ok(await sp.getByRole('link',{name:/請求書/}).count())
 assert.ok(await sp.getByRole('link',{name:'納品書',exact:true}).count())
 await sp.screenshot({path:path.join(dir,'salon-documents-mobile.png'),fullPage:true})
 const popup=sp.waitForEvent('popup');await sp.getByRole('link',{name:/請求書/}).first().click();const doc=await popup
 await doc.waitForLoadState('domcontentloaded');const body=await doc.locator('body').innerText()
 assert.match(body,/販売単価/);assert.doesNotMatch(body,/割引率|定価|合計値引/)
 assert.deepEqual(errors,[])
 console.log('v698 browser PASS: procurement, supplier purchases, stock/monthly report, period/member filters, salon drilldown, mobile documents, hidden-rate invoice, no JS errors')
}finally{await browser.close()}
