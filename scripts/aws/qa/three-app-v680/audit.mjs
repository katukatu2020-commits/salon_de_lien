import fs from 'node:fs'
import assert from 'node:assert/strict'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core')
const base=process.env.QA_BASE_URL||'http://127.0.0.1:3188'
if(new URL(base).hostname!=='127.0.0.1'||new URL(base).port!=='3188')throw Error('Isolated QA only')
const out='artifacts/three-app-qa-v680';fs.mkdirSync(out,{recursive:true})
const roles={
  customer:{login:'/u/login',action:'/api/customer-auth/login',field:'loginId',id:'demo.hana',routes:['home','appointments','profile','stamps','stores','coupons','history','chat','community','catalog','points','campaigns','news','menu','reviews'].map(x=>'/u/'+x)},
  salon:{login:'/admin/login',action:'/api/auth/login',field:'email',id:'demo.owner',routes:['/admin/appointments','/admin/customers','/admin/customers/messages/chat','/admin/customers/messages','/admin/customers/messages/campaigns','/admin/products','/admin/products/orders','/admin/community','/admin/owner-analytics','/admin/settings','/admin/account','/admin/salon-master']},
  dealer:{login:'/dealer/login',action:'/api/dealer/auth/login',field:'loginId',id:'dealer.browser.v584.mtsptddu',routes:['operations','fulfillment','inventory','receivables','activities','messages','sales','targets','team','calendar','orders','salons','products','pricing','company','billing','password-change'].map(x=>'/dealer/'+x)}
}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results=[]
try{
  for(const role of (process.env.QA_ROLES||'customer,salon,dealer').split(','))for(const width of (process.env.QA_WIDTHS||'1440,390').split(',').map(Number)){
    const config=roles[role],context=await browser.newContext({viewport:{width,height:width<600?844:1000},locale:'ja-JP',timezoneId:'Asia/Tokyo'})
    await context.route('**/*',async route=>{
      const r=route.request(),url=new URL(r.url())
      if(url.origin!==base&&r.method()!=='GET')return route.abort('blockedbyclient')
      if(process.env.QA_SLOW_BOOT==='1'&&url.pathname.includes('/_next/static/chunks/app/'))await new Promise(resolve=>setTimeout(resolve,500))
      return route.continue()
    })
    const page=await context.newPage();page.setDefaultTimeout(10000)
    await page.goto(base+config.login,{waitUntil:'domcontentloaded'})
    const form=page.locator('form[action="'+config.action+'"]')
    await form.locator('[name="'+config.field+'"]').fill(config.id)
    await form.locator('[name="password"]').fill('QaLocalOnly-v680!')
    const toggle=form.locator('[data-orimia-password-toggle-v627]')
    if(await toggle.count()){await toggle.click();if(await form.locator('[name="password"]').getAttribute('type')!=='text')throw Error(role+': password visibility');await toggle.click()}
    await Promise.all([page.waitForURL(u=>u.pathname!==config.login,{timeout:20000}),form.locator('button[type="submit"]').click()])
    console.log(role,width,'UI login',new URL(page.url()).pathname)
    for(const route of config.routes.filter(r=>!process.env.QA_ROUTES||process.env.QA_ROUTES.split(',').includes(r))){
      const errors=[],requests=[]
      const onError=e=>errors.push(e.message),onResponse=r=>{if(r.status()>=400)requests.push({status:r.status(),url:r.url().replace(base,'')})}
      page.on('pageerror',onError);page.on('response',onResponse)
      const started=Date.now(),result={role,width,route}
      try{
        const res=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000})
        await page.waitForFunction(()=>document.readyState==='complete',{},{timeout:15000})
        await page.waitForTimeout(2500)
        Object.assign(result,await page.evaluate(()=>{
          const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0}
          return {path:location.pathname,title:document.title,overflow:document.documentElement.scrollWidth-innerWidth,heading:[...document.querySelectorAll('h1,h2')].filter(visible).map(e=>e.textContent.trim()).slice(0,15),buttons:[...document.querySelectorAll('button')].filter(visible).length,brokenImages:[...document.images].filter(e=>visible(e)&&e.complete&&e.naturalWidth===0).map(e=>e.getAttribute('src')),text:document.body.innerText.slice(-2500),links:[...document.querySelectorAll('a[href]')].filter(visible).map(e=>({text:e.innerText.trim(),href:e.getAttribute('href')}))}
        }))
        result.status=res.status();result.elapsed=Date.now()-started
        const name=role+'-'+width+'-'+route.replaceAll('/','_')
        await page.screenshot({path:out+'/'+name+'.png',fullPage:false})
        fs.writeFileSync(out+'/'+name+'.html',await page.content())
      }catch(e){result.error=e.message}
      result.errors=[...new Set(errors)];result.failedRequests=requests
      results.push(result);console.log(JSON.stringify({...result,text:undefined,links:undefined}))
      page.off('pageerror',onError);page.off('response',onResponse)
    }
    await context.close()
  }
}finally{fs.writeFileSync(out+'/audit'+(process.env.QA_ROLES?'-'+process.env.QA_ROLES:'')+'.json',JSON.stringify(results,null,2));await browser.close()}
assert.deepEqual(results.filter(r=>r.error||r.errors.length||r.status!==200||r.overflow>0||r.brokenImages.length).map(r=>({route:r.route,width:r.width,error:r.error,errors:r.errors})),[])
