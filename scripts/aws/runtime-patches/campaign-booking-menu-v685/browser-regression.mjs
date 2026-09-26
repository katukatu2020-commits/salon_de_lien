import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||import.meta.url),{chromium}=require('playwright-core')
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3192',artifacts=path.resolve('artifacts/campaign-booking-v685')
fs.mkdirSync(artifacts,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
try{
  for(const width of [390,1360,320]){
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[]
    page.setDefaultTimeout(6000);page.on('pageerror',e=>errors.push(e.message))
    await page.goto(base+'/u/appointments?campaign=slow',{waitUntil:'domcontentloaded'})
    await page.locator('.cj-booking-top').waitFor()
    assert.equal(await page.locator('[data-cj-next]').isDisabled(),true,'cannot proceed while campaign is loading')
    await page.locator('main[data-cj-step="2"]').waitFor()
    assert.equal(await page.locator('select').inputValue(),'spa')
    assert.equal(await page.locator('[data-cj-menu]').count(),1)
    await page.locator('[data-cj-prev]').click()
    assert.deepEqual(await page.locator('[data-cj-menu]').evaluateAll(els=>els.map(e=>e.value)),['spa'])
    await page.locator('input[type=search]').fill('カット');assert.equal(await page.locator('[data-cj-menu]').count(),0)
    await page.locator('input[type=search]').fill('');await page.locator('[data-cj-menu]').waitFor()
    await page.screenshot({path:path.join(artifacts,'target-menu-'+width+'.png')})
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
    const result=await page.evaluate(async()=>{
      const bad=await fetch('/api/customer/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({menuKey:'cut'})})
      const good=await fetch('/api/customer/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({menuKey:'spa',couponIssueId:'keep',pointsToUse:100})})
      return{bad:bad.status,good:good.status,requests:window.requests}
    })
    assert.equal(result.bad,409);assert.equal(result.good,200)
    assert.deepEqual(result.requests,[{menuKey:'spa',couponIssueId:'keep',pointsToUse:100,campaignId:'slow'}])
    await page.goto(base+'/u/appointments?campaign=all');await page.locator('[data-campaign-booking-v685][data-state=ready]').waitFor()
    assert.equal(await page.locator('[data-cj-menu]').count(),3);assert.equal(await page.locator('main').getAttribute('data-cj-step'),'1')
    await page.goto(base+'/u/appointments?campaign=expired');await page.locator('[data-campaign-booking-v685][data-state=error]').waitFor()
    assert.equal(await page.locator('[data-cj-menu]').count(),0);assert.equal(await page.locator('[data-cj-next]').isDisabled(),true)
    // Retrying a transient failure must recover without leaving campaign mode.
    await page.route('**/api/customer/campaign-booking?campaign=expired',route=>route.fulfill({json:{campaign:{id:'expired',title:'再取得',targetMenu:'ヘッドスパ'},menuIds:['spa']}}))
    await page.locator('[data-campaign-retry]').click();await page.locator('main[data-cj-step="2"]').waitFor()
    await page.goto(base+'/u/appointments');await page.locator('[data-cj-menu]').first().waitFor()
    assert.equal(await page.locator('[data-cj-menu]').count(),3);assert.equal(await page.locator('[data-campaign-booking-v685]').count(),0)
    await page.evaluate(()=>{history.pushState({},'','/u/appointments?campaign=single');dispatchEvent(new PopStateEvent('popstate'))})
    await page.locator('main[data-cj-step="2"]').waitFor();assert.equal(await page.locator('[data-cj-menu]').count(),1)
    await page.evaluate(()=>{history.pushState({},'','/u/appointments');dispatchEvent(new PopStateEvent('popstate'))})
    await page.waitForFunction(()=>document.querySelectorAll('[data-cj-menu]').length===3)
    assert.deepEqual(errors,[]);await page.close()
  }
  console.log('v685 browser PASS: single target auto-selection, menu restriction after back/search, loading/error/retry, all menus, normal booking, payload, mobile/desktop')
}finally{await browser.close()}
