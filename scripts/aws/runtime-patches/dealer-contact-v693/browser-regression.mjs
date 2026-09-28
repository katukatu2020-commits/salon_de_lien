import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core'),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3198'
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Isolated fixture only')
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const out='artifacts/dealer-contact-v693';fs.mkdirSync(out,{recursive:true})
const errors=[]
try{
 const dealer=await browser.newContext({locale:'ja-JP'}),p=await dealer.newPage()
 p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message))
 await p.goto(base+'/dealer/login');await p.locator('[name=loginId]').fill('erp-owner-a');await p.locator('[name=password]').fill('FixtureOnly-v678!')
 await p.locator('button[type=submit]').click();await p.waitForURL('**/dealer/orders')
 async function editPhone(phone){
  await p.goto(base+'/dealer/team');await p.locator('tr').filter({hasText:'erp-sales-a'}).locator('[data-member]').click()
  await p.locator('.dst-dialog [name=phone]').fill(phone)
  const saved=p.waitForResponse(r=>r.url().endsWith('/api/dealer/team/member')&&r.request().method()==='POST')
  await p.locator('.dst-dialog').getByRole('button',{name:'保存',exact:true}).click();assert.equal((await saved).status(),200)
  await p.locator('.dst-dialog').waitFor({state:'detached'})
 }
 for(const width of [1440,390,320]){
  await p.setViewportSize({width,height:900});await editPhone('080-2345-6789')
  await p.locator('tr').filter({hasText:'erp-sales-a'}).locator('[data-member]').click()
  assert.equal(await p.locator('.dst-dialog [name=phone]').inputValue(),'080-2345-6789')
  assert.equal(await p.locator('.dst-dialog').evaluate(e=>e.scrollWidth>e.clientWidth+1),false)
  await p.screenshot({path:out+'/staff-phone-'+width+'.png'})
  await p.locator('.dst-dialog').getByRole('button',{name:'キャンセル',exact:true}).click()
  const salon=await browser.newContext({viewport:{width,height:900},locale:'ja-JP',extraHTTPHeaders:{'x-fixture-salon':'1'}}),s=await salon.newPage()
  s.setDefaultTimeout(10000);s.on('pageerror',e=>errors.push(e.message))
  await s.goto(base+'/admin/products/orders')
  await s.locator('[data-action=quantity-input]').first().fill('2')
  const trigger=s.locator('[data-action=dealer-contact]').first(),dialog=s.locator('.dc-dialog-v693')
  await trigger.click();await dialog.locator('a[href="tel:08023456789"]').waitFor()
  assert.match(await dialog.innerText(),/営業担当/);assert.match(await dialog.innerText(),/会社の代表電話/)
  assert.equal(await dialog.locator('.dc-chat').getAttribute('href'),'/admin/dealer-messages?dealer=dealer-a')
  assert.equal(await dialog.evaluate(e=>e.scrollWidth>e.clientWidth+1),false)
  assert.equal(await s.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
  for(let i=0;i<6;i++){await s.keyboard.press('Tab');assert.equal(await dialog.evaluate(e=>e.contains(document.activeElement)),true,'Modal traps focus')}
  await s.screenshot({path:out+'/salon-contact-'+width+'.png'})
  await s.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
  assert.equal(await trigger.evaluate(e=>document.activeElement===e),true)
  assert.equal(await s.locator('[data-action=quantity-input]').first().inputValue(),'2','Contact leaves cart intact')
  if(width===390){
   await editPhone('');await trigger.click();await dialog.getByText('電話番号未登録',{exact:true}).waitFor()
   assert.equal(await dialog.locator('a[href^="tel:"]').count(),1,'Only separately labeled company phone remains')
   await dialog.getByRole('button',{name:'閉じる',exact:true}).click()
   await editPhone('090-1234-5678')
   await s.route('**/api/admin/wholesale/dealer-contact?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,error:'一時的に取得できません'})}),{times:1})
   await trigger.click();await dialog.getByRole('button',{name:'再読み込み',exact:true}).click()
   await dialog.locator('a[href="tel:09012345678"]').waitFor()
   await s.keyboard.press('Escape');await dialog.waitFor({state:'detached'})
   let release,requested;const pending=new Promise(r=>release=r),seen=new Promise(r=>requested=r)
   await s.route('**/api/admin/wholesale/dealer-contact?*',async route=>{requested();await pending;await route.continue().catch(()=>{})},{times:1})
   await trigger.click();await seen;await s.keyboard.press('Escape');await dialog.waitFor({state:'detached'});release()
   await trigger.click();await dialog.locator('a[href="tel:09012345678"]').waitFor()
   assert.equal(await s.locator('.dc-dialog-v693').count(),1,'Old response does not reopen closed contact')
   await s.keyboard.press('Escape')
  }
  await salon.close()
 }
 await editPhone('090-1234-5678')
 assert.deepEqual(errors,[])
 console.log('v693 browser PASS: staff phone persistence, desktop/390/320 layouts, telephone/chat links, missing number, retry, close/reopen race, focus trap/return, retained cart, no page errors')
}finally{await browser.close()}
