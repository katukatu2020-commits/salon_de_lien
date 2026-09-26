import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core')
const base='http://127.0.0.1:3188'
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const results=[]
try {
  for(const role of ['public','customer','salon']){
    const context=await browser.newContext({viewport:{width:390,height:844},locale:'ja-JP',timezoneId:'Asia/Tokyo'})
    await context.route('**/_next/static/chunks/app/layout-*',async route=>{
      await new Promise(resolve=>setTimeout(resolve,700))
      await route.continue()
    })
    const page=await context.newPage();page.setDefaultTimeout(10000)
    const errors=[];page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}))
    if(role!=='public'){
      const admin=role==='salon'
      await page.goto(base+(admin?'/admin/login':'/u/login'))
      await page.locator(admin?'[name=email]':'[name=loginId]').fill(admin?'demo.owner':'demo.hana')
      await page.locator('[name=password]').fill('QaLocalOnly-v680!')
      await page.locator('[data-orimia-password-toggle-v627]').click()
      assert.equal(await page.locator('[name=password]').getAttribute('type'),'text')
      await page.locator('[data-orimia-password-toggle-v627]').click()
      await page.locator('button[type=submit]').click()
      await page.waitForURL(u=>!u.pathname.endsWith('/login'))
    }
    const routes=role==='public'?['/u/login?registered=1','/u/register?sent=1&retryAfter=60','/admin/login','/dealer/login']:
      role==='customer'?['/u/profile','/u/community']:['/admin/community','/admin/customers/messages','/admin/products/orders']
    for(let repeat=0;repeat<3;repeat++)for(const route of routes){
      errors.length=0
      const response=await page.goto(base+route)
      await page.waitForTimeout(1000)
      const result={role,route,repeat,status:response.status(),errors:[...errors]}
      results.push(result);console.log(JSON.stringify(result))
      assert.equal(response.status(),200)
      assert.deepEqual(errors,[])
      if(route.includes('/login'))await page.locator('[data-orimia-password-toggle-v627]').waitFor({state:'visible'})
    }
    await context.close()
  }
} finally {
  fs.writeFileSync('artifacts/three-app-qa-v680/hydration-races.json',JSON.stringify(results,null,2))
  await browser.close()
}
