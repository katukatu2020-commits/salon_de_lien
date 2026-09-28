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
const prefix='QA690-'+Date.now(),customerId='showcase-yohaku-customer-001'
function db(code){return JSON.parse(execFileSync('docker',['exec','orimia-qa-v680-app','node','-e',`if(process.env.ORIMIA_ISOLATED_QA!=='v680'||!process.env.DATABASE_URL.includes('/orimia_qa_v680_20260926?'))throw Error('QA only');const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{try{const result=await(async()=>{${code}})();console.log(JSON.stringify(result))}finally{await p.$disconnect()}})()`],{encoding:'utf8',maxBuffer:2e6}))}
for(const [id,staffName] of [[prefix+'-one','雨宮 透'],[prefix+'-two','高瀬 美月']])db(`await p.appointment.create({data:{id:${JSON.stringify(id)},customerId:${JSON.stringify(customerId)},scheduledAt:new Date(Date.now()-86400000),menu:'QA690 施術レビュー',staffName:${JSON.stringify(staffName)},status:'来店済み'}});await p.serviceSale.create({data:{id:${JSON.stringify('sale-'+id)},customerId:${JSON.stringify(customerId)},appointmentId:${JSON.stringify(id)},title:'QA690 施術レビュー',amount:6600,paidAt:new Date(Date.now()-3600000)}});return true`)
const before=db(`return await p.customerPointAccount.findUnique({where:{customerId:${JSON.stringify(customerId)}}})`)
const out='artifacts/treatment-reviews-v690';fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const report=[]
try{
  const context=await browser.newContext({locale:'ja-JP',timezoneId:'Asia/Tokyo'})
  await context.request.post(base+'/api/customer-auth/login',{form:{loginId:'demo.hana',password:'QaLocalOnly-v680!'}})
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message))
  async function ready(){await page.waitForFunction(()=>document.documentElement.dataset.orimiaUiReady==='v516');await page.waitForTimeout(300)}
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:width<600?844:1000})
    for(const [name,route] of [['inbox','/u/reviews'],['staff','/u/staff'],['profile','/u/staff?staff=amemiya'],['form','/u/reviews/treatment/'+prefix+'-one']]){
      const response=await page.goto(base+route,{waitUntil:'load'});assert.equal(response.status(),200);await ready()
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+' overflow '+width)
      assert.equal(await page.locator('.treatment-reviews-v690 h1').isVisible(),true)
      if(name==='form'){
        await page.locator('[name=rating][value="4"]').check()
        await page.locator('textarea').fill('日本語のレビュー入力確認')
        await page.waitForTimeout(700);assert.equal(await page.locator('textarea').inputValue(),'日本語のレビュー入力確認')
      }
      if(width>=1024&&route.startsWith('/u/staff'))assert.ok((await page.locator('.ocd-header').innerText()).includes('スタッフ紹介'))
      await page.screenshot({path:out+'/'+name+'-'+width+'.png',fullPage:true})
      report.push({width,route,pass:true})
    }
  }
  await page.locator('[name=publish]').check()
  await page.route('**/api/customer/treatment-reviews',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'QA690 保存エラー'})}))
  await page.getByRole('button',{name:'レビューを公開',exact:true}).click();await page.getByText('QA690 保存エラー',{exact:true}).waitFor()
  assert.equal(await page.locator('textarea').inputValue(),'日本語のレビュー入力確認')
  await page.unroute('**/api/customer/treatment-reviews')
  await page.locator('textarea').fill(prefix+' 丁寧な施術でした。')
  await page.getByRole('button',{name:'レビューを公開',exact:true}).click();await page.locator('#treatment-review-done').waitFor({state:'visible'})
  assert.ok((await page.locator('#treatment-review-result').innerText()).includes('30pt'))
  const after=db(`return await p.customerPointAccount.findUnique({where:{customerId:${JSON.stringify(customerId)}}})`);assert.equal(after.availablePoints-before.availablePoints,30)
  await page.goto(base+'/u/staff?staff=amemiya');await ready();assert.ok((await page.locator('.tr-reviews').innerText()).includes(prefix))
  await page.goto(base+'/u/staff?staff=takase');await ready();assert.ok(!(await page.locator('.tr-reviews').innerText()).includes(prefix))
  await page.goto(base+'/u/reviews/treatment/'+prefix+'-one');await ready()
  await page.locator('textarea').fill(prefix+' 編集済み');await page.locator('[name=rating][value="2"]').check()
  await page.getByRole('button',{name:'変更を保存',exact:true}).click();await page.locator('#treatment-review-done').waitFor({state:'visible'})
  await page.reload();await ready();assert.equal(await page.locator('textarea').inputValue(),prefix+' 編集済み')
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'レビューを削除',exact:true}).click();await page.locator('#treatment-review-done').waitFor({state:'visible'})
  await page.goto(base+'/u/staff?staff=amemiya');await ready();assert.ok(!(await page.locator('.tr-reviews').innerText()).includes(prefix))
  await page.goto(base+'/u/reviews/treatment/'+prefix+'-one');await ready()
  await page.locator('[name=rating][value="1"]').check();await page.locator('textarea').fill(prefix+' 再投稿');await page.locator('[name=publish]').check()
  await page.getByRole('button',{name:'レビューを公開',exact:true}).click();await page.locator('#treatment-review-done').waitFor({state:'visible'})
  assert.ok(!(await page.locator('#treatment-review-result').innerText()).includes('pt'))
  assert.equal(db(`return await p.customerPointAccount.findUnique({where:{customerId:${JSON.stringify(customerId)}}})`).availablePoints,after.availablePoints)
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/u/home');await ready()
  assert.equal(await page.locator('.quick-grid a[href="/u/staff"]').count(),1)
  assert.equal(await page.locator('.quick-grid a[href="/u/campaigns"]').count(),0)
  await page.locator('.quick-grid a[href="/u/staff"]').click();await page.waitForURL('**/u/staff');await ready()
  await page.screenshot({path:out+'/staff-final-desktop.png',fullPage:true})
  await page.goto(base+'/u/reviews?tab=products');await ready();assert.ok((await page.locator('.tr-tabs').innerText()).includes('商品アンケート'))
  const pointsPage=await page.goto(base+'/u/points');assert.equal(pointsPage.status(),200);await ready();assert.ok((await page.locator('body').innerText()).includes('来店後フィードバック回答'))
  assert.deepEqual(errors,[])
  report.push({posting:true,pointBalance:true,staffAssociation:true,edit:true,delete:true,repostNoExtraPoints:true,errorDraftPreserved:true,homeNavigation:true,pointsHistory:true})
  await context.close()
}finally{fs.writeFileSync(out+'/full-app-report.json',JSON.stringify(report,null,2));await browser.close()}
console.log('v690 full application PASS: PC/390px/320px, actual review and points lifecycle, staff-specific visibility, errors preserve input, home navigation, existing product inbox and points history')
