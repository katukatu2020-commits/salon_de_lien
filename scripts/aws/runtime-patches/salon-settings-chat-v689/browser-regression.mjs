import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||path.resolve('../node_modules/playwright-core/package.json'))
const {chromium}=require('playwright-core'),base=process.env.SMOKE_BASE_URL||'http://127.0.0.1:3196'
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname),'Fixture only')
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const out='artifacts/salon-settings-chat-v689';fs.mkdirSync(out,{recursive:true})
try{
  for(const width of [1440,390,320]){
    const context=await browser.newContext({viewport:{width,height:900},locale:'ja-JP'}),page=await context.newPage(),errors=[]
    page.on('pageerror',e=>errors.push(e.message))
    const prefix='browser-'+width+'-'+Date.now()
    for(const [customerId,staffKey] of [['c1','watanabe'],['c1','kaori'],['c2','takase']]){
      await page.goto(base+'/admin/customers/messages/chat?customerId='+customerId)
      assert.equal(await page.locator('[name=staffKey]').inputValue(),'')
      await page.locator('[name=staffKey]').selectOption(staffKey)
      await page.locator('textarea').fill(prefix+'-'+customerId+'-'+staffKey)
      await Promise.all([page.waitForURL(u=>u.searchParams.has('threadId')),page.getByRole('button',{name:'送信',exact:true}).click()])
      // Reproduce late hydration clearing the hidden recipient.
      await page.locator('input[name=threadId]').evaluate(e=>e.value='')
      await page.locator('textarea').fill(prefix+'-reply-'+customerId+'-'+staffKey)
      await Promise.all([page.waitForNavigation({waitUntil:'load'}),page.getByRole('button',{name:'送信',exact:true}).click()])
    }
    const data=await context.request.get(base+'/fixture-data').then(r=>r.json())
    for(const [customerId,staffKey] of [['c1','watanabe'],['c1','kaori'],['c2','takase']]){
      for(const body of [prefix+'-'+customerId+'-'+staffKey,prefix+'-reply-'+customerId+'-'+staffKey]){
        const messages=data.filter(m=>m.body===body);assert.equal(messages.length,1);assert.equal(messages[0].customerId,customerId);assert.equal(messages[0].staffKey,staffKey)
      }
    }
    await page.goto(base+'/admin/customers/messages/chat?customerId=c1')
    await page.locator('[name=staffKey]').selectOption('watanabe');await page.locator('textarea').fill('エラー時に下書きを残す')
    await page.evaluate(()=>history.replaceState(null,'','?customerId=c2'))
    await page.getByRole('button',{name:'送信',exact:true}).click()
    await page.getByRole('alert').waitFor({state:'visible'})
    assert.ok((await page.getByRole('alert').innerText()).includes('会話を切り替え'))
    await page.evaluate(()=>history.replaceState(null,'','?customerId=c1'))
    await page.route('**/api/lien-chat-form',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'この会話には送信できません。'})}))
    await page.getByRole('button',{name:'送信',exact:true}).click()
    await page.getByRole('alert').waitFor({state:'visible'})
    assert.equal(await page.locator('textarea').inputValue(),'エラー時に下書きを残す')
    assert.equal(await page.getByRole('button',{name:'送信',exact:true}).isEnabled(),true)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)
    await page.screenshot({path:out+'/composer-'+width+'.png'})
    assert.deepEqual(errors,[])
    await context.close()
  }
}finally{await browser.close()}
console.log('v689 browser PASS: recipients, staff selection, late hydration, desktop/mobile, error draft preservation')
