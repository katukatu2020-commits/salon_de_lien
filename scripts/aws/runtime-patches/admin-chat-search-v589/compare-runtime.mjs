import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {chromium}=require('playwright-core')
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true})
try {
  const reports=[]
  for(const port of [3587,3589]) {
    const base='http://localhost:'+port
    const context=await browser.newContext({viewport:{width:1440,height:1000}})
    await context.request.post(base+'/api/auth/login',{headers:{Origin:base},form:{email:'demo.owner',password:'LienDemo2026!'}})
    const routes={}
    for(const route of ['/admin/customers','/admin/customers/messages/chat']) {
      const page=await context.newPage()
      const errors=[]
      page.on('pageerror',error=>errors.push(error.message))
      await page.goto(base+route,{waitUntil:'domcontentloaded'})
      await page.waitForFunction(()=>document.documentElement.dataset.orimiaUiReady==='v516')
      await page.waitForTimeout(800)
      routes[route]=errors.map(e=>e.match(/React error #(\d+)/)?.[1]||e).sort()
      await page.close()
    }
    reports.push({port,routes})
    await context.close()
  }
  assert.deepEqual(reports[1].routes,reports[0].routes,'New browser runtime errors must not be introduced')
  console.log(JSON.stringify({browserErrorsUnchanged:true,reports}))
}finally{await browser.close()}
