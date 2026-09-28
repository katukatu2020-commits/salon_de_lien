import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core'),base='http://127.0.0.1:3188'
const config=JSON.parse(execFileSync('docker',['inspect','orimia-qa-v680-app'],{encoding:'utf8'}))[0]
assert.ok(config.Config.Env.includes('ORIMIA_ISOLATED_QA=v680'))
assert.ok(config.Config.Env.some(e=>e.includes('/orimia_qa_v680_20260926?')))
execFileSync('docker',['exec','orimia-qa-v680-app','node','-e',`if(process.env.ORIMIA_ISOLATED_QA!=='v680')throw Error('QA only');const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const u=await p.appUser.findFirst({where:{loginId:'demo.owner'}});await p.$executeRawUnsafe('UPDATE "AppUser" SET "active"=TRUE,"passwordHash"=$1 WHERE "id" IN ($2,$3)',u.passwordHash,'shared_b95beadfa2e07b1c8ce39670','showcase-yohaku-user-staff-002');await p.$disconnect()})()`],{encoding:'utf8'})
const out='artifacts/salon-settings-chat-v689';fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const report=[],prefix='QA689 '+Date.now()
try{
  const customer=await browser.newContext()
  await customer.request.post(base+'/api/customer-auth/login',{form:{loginId:'demo.hana',password:'QaLocalOnly-v680!'}})
  for(const [role,login] of [['owner','demo.owner'],['shared','qa.v553.self.mtp7ztgk'],['staff','demo.mizuki']]){
    const context=await browser.newContext({locale:'ja-JP',timezoneId:'Asia/Tokyo'})
    await context.request.post(base+'/api/auth/login',{form:{email:login,password:'QaLocalOnly-v680!',next:'/admin/settings'}})
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:width<600?844:1000})
      for(const route of ['/admin/settings','/admin/account']){
        await page.goto(base+route,{waitUntil:'load'});await page.waitForTimeout(2200)
        assert.equal(new URL(page.url()).pathname,route)
        if(route==='/admin/settings'){
          if(role==='owner'){assert.equal(await page.locator('form[data-ca-store-form]').count(),1)}
          else{assert.equal(await page.locator('[data-salon-settings-readonly-v689]').count(),1);assert.equal(await page.locator('main form').count(),0);assert.ok(!(await page.locator('main').innerText()).includes('LINE公式アカウント予約'))}
        }else{assert.equal(await page.locator('[data-salon-settings-readonly-v689]').count(),0);assert.ok((await page.locator('main').innerText()).includes('アカウント設定'))}
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
        await page.screenshot({path:out+'/'+role+'-'+width+'-'+route.split('/').at(-1)+'.png'})
        report.push({role,width,route,pass:true})
      }
    }
    if(role!=='owner'){
      const denied=await context.request.post(base+'/api/admin/store-profile',{headers:{Origin:base},data:{action:'update-store',storeName:'Unauthorized'}})
      assert.equal(denied.status(),403)
    }
    for(const staffKey of role==='staff'?['takase']:['amemiya','takase']){
      await page.goto(base+'/admin/customers/messages/chat?customerId=showcase-yohaku-customer-001',{waitUntil:'load'})
      await page.locator('select[name=staffKey]').waitFor({state:'visible'})
      if(role==='shared')assert.equal(await page.locator('select[name=staffKey]').inputValue(),'')
      if(role==='staff')assert.deepEqual(await page.locator('select[name=staffKey] option').evaluateAll(es=>es.map(e=>e.value)),['','takase'])
      await page.locator('select[name=staffKey]').selectOption(staffKey)
      const body=prefix+' '+role+' '+staffKey
      await page.locator('textarea[name=body]').fill(body)
      await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.getByRole('button',{name:'送信',exact:true}).click()])
      await page.locator('.inbox-conversation-heading').waitFor({state:'visible'})
      const threadId=new URL(page.url()).searchParams.get('threadId');assert.ok(threadId)
      const received=await customer.request.get(base+'/api/lien-chat?threadId='+threadId).then(r=>r.json())
      assert.equal(received.thread.staffKey,staffKey);assert.equal(received.messages.filter(m=>m.body===body).length,1)
      const reply=await customer.request.post(base+'/api/lien-chat',{headers:{Origin:base},data:{action:'send',threadId,body:body+' 顧客返信'}})
      assert.equal(reply.status(),201)
      await page.reload({waitUntil:'load'});await page.getByText(body+' 顧客返信',{exact:true}).last().waitFor({state:'visible'})
      await page.screenshot({path:out+'/'+role+'-chat-'+staffKey+'.png'})
      report.push({role,staffKey,roundtrip:true})
    }
    assert.deepEqual(errors,[])
    await context.close()
  }
  await customer.close()
}finally{fs.writeFileSync(out+'/full-app-report.json',JSON.stringify(report,null,2));await browser.close()}
console.log('v689 full application PASS: owner/shared/staff settings, edit protection, recipient selection, actual customer round-trip, desktop/mobile')
