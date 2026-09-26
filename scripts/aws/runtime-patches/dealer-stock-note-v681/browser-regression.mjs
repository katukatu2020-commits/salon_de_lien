import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createRequire} from 'node:module'
const require=createRequire(process.env.SMOKE_DEPENDENCIES_PACKAGE||import.meta.url)
const {chromium}=require('playwright-core')
const base=process.env.VERIFY_BASE_URL||'http://127.0.0.1:3189'
if(new URL(base).hostname!=='127.0.0.1')throw Error('Isolated fixture only')
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'})
const out='artifacts/dealer-stock-note-v681';fs.mkdirSync(out,{recursive:true})
try{
  for(const width of [1440,390]){
    const ctx=await browser.newContext({viewport:{width,height:width===390?844:1000}})
    const login=await ctx.request.post(base+'/api/dealer/auth/login',{headers:{Origin:base},data:{loginId:'erp-owner-a',password:'FixtureOnly-v678!'},maxRedirects:0})
    assert.equal(login.status(),303)
    const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000)
    await page.goto(base+'/dealer/inventory')
    await page.locator('#erp-body[aria-busy=false]').waitFor()
    await page.getByRole('button',{name:'倉庫を追加',exact:true}).click()
    let dialog=page.locator('dialog').last()
    const warehouse='備考ブラウザ検証 '+width+' '+Date.now()
    await dialog.locator('[name=name]').fill(warehouse)
    await dialog.locator('[name=location]').fill('A棚')
    await dialog.locator('[type=submit]').click();await dialog.waitFor({state:'detached'})
    for(const kind of ['RECEIPT','ISSUE']){
      await page.getByRole('button',{name:'入出庫・棚卸し',exact:true}).click()
      dialog=page.locator('dialog').last()
      await dialog.getByRole('button',{name:'商品を選択',exact:true}).click()
      const picker=page.locator('dialog:has(.erp-product-search)')
      await picker.locator('[data-product]').first().click();await picker.waitFor({state:'detached'})
      await dialog.locator('[name=locationId]').selectOption({label:warehouse+' / A棚'})
      await dialog.locator('[name=kind]').selectOption(kind)
      await dialog.locator('[name=quantity]').fill(kind==='RECEIPT'?'3':'1')
      const note=dialog.getByLabel('備考（任意）',{exact:true})
      assert.equal(await note.getAttribute('required'),null)
      assert.equal(await note.getAttribute('maxlength'),'1000')
      assert.equal(await note.inputValue(),'')
      await page.screenshot({path:out+'/'+width+'-'+kind+'.png',fullPage:true})
      const saved=page.waitForResponse(r=>r.url().endsWith('/api/dealer/erp/stock')&&r.request().method()==='POST')
      await dialog.locator('[type=submit]').click()
      assert.equal((await saved).status(),200)
      await dialog.waitFor({state:'detached'})
      await page.locator('#erp-body[aria-busy=false]').waitFor()
    }
    const row=page.locator('tr').filter({hasText:warehouse})
    assert.equal(await row.count(),1)
    await page.locator('[data-tab=history]').click()
    await page.locator('#erp-body[aria-busy=false]').waitFor()
    assert.equal(await page.locator('th').filter({hasText:/^備考$/}).count(),1)
    assert.ok(await page.locator('td[data-label="備考"]').count()>0)
    assert.deepEqual(errors,[])
    console.log('PASS '+width+': blank receipt/issue notes saved; optional label, limit and history heading')
    await ctx.close()
  }
}finally{await browser.close()}
