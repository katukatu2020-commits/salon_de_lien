import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||process.cwd()+'/../node_modules/playwright-core/package.json')
const {chromium}=require('playwright-core')
const base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3202'
const out='artifacts/campaign-discount-v697'
await fs.mkdir(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']})
try{
  for(const width of [1360,390,320]){
    const page=await browser.newPage({viewport:{width,height:1000}}),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    const total=()=>page.locator('.lien-booking-v616__total dd').innerText()
    const waitTotal=async text=>{await page.waitForFunction(value=>document.querySelector('.lien-booking-v616__total dd')?.textContent===value,text);assert.equal(await total(),text)}
    await page.goto(base+'/u/appointments?campaign=slow')
    await page.waitForFunction(()=>document.querySelector('main').dataset.cjStep==='2')
    await page.locator('[data-cj-next]').click();await page.locator('[data-cj-next]').click()
    await waitTotal('4,400円')
    await page.getByRole('button',{name:'上限まで使う'}).click();await waitTotal('3,640円')
    await page.locator('#lien-booking-coupon-v616').selectOption('ten');await waitTotal('4,190円')
    assert.equal(await page.locator('.lien-booking-v616__discount').innerText(),'クーポン 10%OFF\n-550円')
    await page.locator('#lien-booking-coupon-v616').selectOption('stamp');await waitTotal('0円')
    assert.equal(await page.locator('#lien-booking-points-v652').isDisabled(),true)
    await page.locator('#lien-booking-coupon-v616').selectOption('');await waitTotal('4,400円')
    await page.locator('#lien-booking-points-v652').fill('99999');await waitTotal('3,640円')
    assert.equal(await page.locator('#lien-booking-points-v652').inputValue(),'760')
    const samples=await page.evaluate(async()=>{const values=[];for(let i=0;i<12;i++){values.push(document.querySelector('.lien-booking-v616__total dd').textContent);await new Promise(r=>setTimeout(r,40))}return values})
    assert(samples.every(x=>x==='3,640円'),'Discount total flickers')
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow')
    await page.screenshot({path:out+'/confirmation-'+width+'.png',fullPage:true})
    await page.locator('#submit').click();await page.waitForFunction(()=>window.bookingResult)
    const result=await page.evaluate(()=>({result:bookingResult,requests,adjustments}))
    assert.equal(result.result.status,200);assert.equal(result.requests[0].campaignDiscountRate,20);assert.equal(result.requests[0].pointsToUse,760);assert.equal(result.adjustments.length,0)
    await page.goto(base+'/u/appointments?campaign=changed')
    await page.waitForFunction(()=>document.querySelector('main').dataset.cjStep==='2')
    await page.locator('[data-cj-next]').click();await page.locator('[data-cj-next]').click();await waitTotal('4,400円')
    await page.locator('#submit').click();await page.waitForFunction(()=>window.bookingResult)
    assert.equal(await page.evaluate(()=>bookingResult.status),409)
    await page.goto(base+'/u/appointments?campaign=expired')
    await page.waitForFunction(()=>window.OrimiaCampaignBookingV685.read()?.status==='error')
    assert.equal(await page.locator('[data-cj-next]').isDisabled(),true)
    assert.equal(await page.evaluate(async()=>{const r=await fetch('/api/customer/appointments',{method:'POST',body:JSON.stringify({menuKey:'cut'})});return r.status}),409)
    assert.equal(await page.evaluate(()=>requests.length),0)
    await page.goto(base+'/u/appointments?coupon=ten')
    await page.waitForFunction(()=>window.__lienSelectedCouponV366?.id==='ten')
    await page.locator('[data-cj-next]').click();await page.locator('[data-cj-next]').click();await page.locator('[data-cj-next]').click()
    await waitTotal('4,950円');await page.getByRole('button',{name:'上限まで使う'}).click();await waitTotal('4,190円')
    await page.locator('#submit').click();await page.waitForFunction(()=>window.bookingResult)
    assert.equal(await page.evaluate(()=>adjustments.length),1)
    assert.equal(await page.evaluate(()=>adjustments[0].pointsToUse),760)
    assert.deepEqual(errors,[])
    await page.close()
  }
  console.log('v697 browser PASS: desktop/mobile, campaign discount, points cap, coupon exclusion, stamp free, stable totals, atomic submit, expired/changed campaigns, ordinary coupon flow')
}finally{await browser.close()}
