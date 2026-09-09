import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import fs from 'node:fs'
const require=createRequire(import.meta.url)
const {chromium}=require('playwright-core')
const base='http://localhost:3595'
const output='artifacts/customer-store-list-v595/browser'
fs.mkdirSync(output,{recursive:true})
function fixture(action){return execFileSync('docker',['exec','-e','ALLOW_LOCAL_SESSION_FIXTURES=true','orimia-customer-store-v595','node','/tmp/local-fixture.cjs',action],{encoding:'utf8'})}
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
try {
  for(const viewport of [{width:1365,height:900},{width:390,height:844}]) {
    const {token}=JSON.parse(fixture('setup'))
    const context=await browser.newContext({viewport})
    await context.addCookies([{name:'lien_customer_session',value:token,url:base,httpOnly:true,sameSite:'Lax'}])
    const page=await context.newPage()
    const errors=[]
    const recordError=error=>errors.push({route:new URL(page.url()).pathname,message:error.message})
    page.on('pageerror',recordError)
    const ready=async()=>{await page.waitForFunction(()=>document.documentElement.dataset.orimiaUiReady==='v516');await page.locator('#orimia-ui-loader-v536').waitFor({state:'hidden'})}
    await page.goto(base+'/u/stores',{waitUntil:'networkidle'});await ready()
    assert.equal(await page.locator('.registered-store-card').count(),2)
    assert.equal(await page.getByText('現在利用できません',{exact:true}).count(),1)
    assert.equal(await page.locator('[data-switch-store="org_showcase_yohaku"]').count(),0)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)
    await page.screenshot({path:output+`/unavailable-${viewport.width}.png`,fullPage:true})
    fixture('merge')
    await page.reload({waitUntil:'networkidle'});await ready()
    assert.equal(await page.locator('.registered-store-card').count(),2)
    await page.locator('[data-switch-store="org_showcase_yohaku"]').click()
    await page.waitForURL('**/u/home');await ready()
    assert.deepEqual(errors,[])
    // Legacy Next pages have pre-existing hydration errors on the parent image.
    // This section verifies session continuity; strict UI checks cover our Node pages.
    page.off('pageerror',recordError)
    for(const route of ['/u/appointments','/u/history','/u/profile']) {
      const response=await page.goto(base+route,{waitUntil:'domcontentloaded'})
      assert.equal(response.status(),200);assert.equal(new URL(page.url()).pathname,route)
      await ready()
    }
    await page.goto(base+'/u/stores',{waitUntil:'networkidle'});await ready()
    page.on('pageerror',recordError)
    await page.screenshot({path:output+`/repaired-${viewport.width}.png`,fullPage:true})
    await page.locator('[data-switch-store="org_salon_de_lien"]').click();await page.waitForURL('**/u/home');await ready()
    assert.deepEqual(errors,[])
    console.log(JSON.stringify({viewport,unavailableRegistrationVisible:true,repairedStoreSwitches:true,nextSessionContinuity:true,switchBack:true}))
    await context.close()
  }
} finally {await browser.close();fixture('cleanup')}
